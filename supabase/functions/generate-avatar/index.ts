import {
    createClient
} from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLASS_PROMPTS: Record<string, string> = {
    warrior: "heavy battle armor, glowing sword, fierce red/orange fiery aura",
    mage: "mystical robe, glowing staff with runes, blue and purple magical aura",
    guardian: "protective heavy plate armor, large shield, calm green aura",
    rogue: "dark hooded cloak, twin daggers, shadowy dark-purple aura",
    paladin: "shining holy armor, sacred sword, radiant golden divine aura",
    monk: "light oriental robes, meditative posture, white-blue spiritual energy",
};

// Helper: fetch with timeout, so a slow provider never hangs the whole function
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 25000): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timeout);
    }
}

// Tries OpenAI image models in order, falls back to Pollinations.
// Returns { url, blob } already downloaded, so callers don't need a second fetch.
async function generateAvatarImage(openaiApiKey: string, finalPrompt: string, fallbackSeedPrompt: string): Promise<{ blob: Blob; source: string }> {
    const modelsToTry = ["gpt-image-1", "dall-e-3"];

    for (const model of modelsToTry) {
        try {
            const imgResp = await fetchWithTimeout("https://api.openai.com/v1/images/generations", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${openaiApiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model,
                    prompt: finalPrompt,
                    n: 1,
                    size: "1024x1024",
                    ...(model === "dall-e-3" ? { quality: "standard" } : {}),
                }),
            }, 40000);

            if (!imgResp.ok) {
                console.warn(`${model} failed with status ${imgResp.status}:`, await imgResp.text());
                continue;
            }

            const imgData = await imgResp.json();
            // gpt-image-1 returns b64_json by default; dall-e-3 returns a url
            const b64 = imgData.data?.[0]?.b64_json;
            const url = imgData.data?.[0]?.url;

            if (b64) {
                const binary = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
                return { blob: new Blob([binary], { type: "image/png" }), source: model };
            }

            if (url) {
                const dl = await fetchWithTimeout(url, {}, 20000);
                if (!dl.ok) {
                    console.warn(`${model} generated a url but download failed with status ${dl.status}`);
                    continue;
                }
                return { blob: await dl.blob(), source: model };
            }

            console.warn(`${model} returned no usable image data:`, JSON.stringify(imgData).slice(0, 300));
        } catch (e) {
            console.error(`${model} generation threw an error:`, e);
        }
    }

    // Final fallback: Pollinations, with retry since it can be slow/flaky
    console.log("All OpenAI models failed, using Pollinations fallback...");
    const cleanPrompt = encodeURIComponent(fallbackSeedPrompt);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=512&height=512&seed=${Date.now()}&nologo=true`;

    let lastError: unknown = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const resp = await fetchWithTimeout(pollinationsUrl, {}, 30000);
            if (!resp.ok) {
                lastError = new Error(`Pollinations returned status ${resp.status}: ${await resp.text()}`);
                console.warn(`Pollinations attempt ${attempt} failed:`, lastError);
                continue;
            }
            return { blob: await resp.blob(), source: "pollinations" };
        } catch (e) {
            lastError = e;
            console.error(`Pollinations attempt ${attempt} threw:`, e);
        }
    }

    throw new Error(`All image generation methods failed. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        const { photoBase64, className } = await req.json();
        if (!photoBase64 || !className) {
            return new Response(JSON.stringify({ error: "photoBase64 and className required" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
        if (!openaiApiKey) throw new Error("OPENAI_API_KEY not configured");

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error("No authorization header");

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
        const supabase = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: authHeader } }
        });

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) throw new Error(`User not authenticated: ${userError?.message}`);

        const imageUrl = photoBase64.startsWith("data:") ? photoBase64 : `data:image/jpeg;base64,${photoBase64}`;

        // Step 1: Vision - Analyze face
        const visionResp = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${openaiApiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Analyze this face carefully. Describe the person's gender, apparent ethnicity, facial structure, skin tone, hair color and style, eye color, and any prominent facial features (beard, glasses, freckles). Keep it as a concise, highly detailed physical description for an AI image generator to replicate the face exactly. Do not describe the background or clothing."
                        },
                        { type: "image_url", image_url: { url: imageUrl } },
                    ],
                }],
                max_tokens: 150,
            }),
        }, 30000);

        if (!visionResp.ok) throw new Error("Failed to analyze image with Vision API: " + await visionResp.text());

        const visionData = await visionResp.json();
        const faceDescription = visionData.choices?.[0]?.message?.content;
        if (!faceDescription) throw new Error("Vision API returned empty description.");

        // Step 2: Generate image (gpt-image-1 -> dall-e-3 -> Pollinations, all handled inside)
        const classDesc = CLASS_PROMPTS[className] ?? CLASS_PROMPTS.warrior;
        const finalPrompt = `Dark-fantasy anime RPG character portrait inspired by Solo Leveling. STRICT FRAMING: head-and-shoulders bust shot only, face fully visible and centered. The character MUST LOOK EXACTLY LIKE THIS DESCRIPTION: ${faceDescription}. Apply this RPG class styling subtly on shoulders/upper armor: ${classDesc}. Dramatic cinematic lighting, dark moody background with subtle glow, high detail, high quality masterpiece.`;
        const fallbackSeedPrompt = `Dark fantasy anime portrait. ${faceDescription}. Class armor: ${classDesc}. Highly detailed, 8k, Solo Leveling style, dark aura, vertical portrait, no text`;

        const { blob: imageBlob, source } = await generateAvatarImage(openaiApiKey, finalPrompt, fallbackSeedPrompt);
        console.log(`Avatar image generated via: ${source}`);

        // Step 3: Upload to Supabase Storage
        const fileName = `${user.id}/${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, imageBlob, { contentType: 'image/png', upsert: true });

        if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);

        return new Response(JSON.stringify({ avatarUrl: publicUrlData.publicUrl, generatedBy: source }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (e: any) {
        console.error("Error in generate-avatar:", e);
        return new Response(JSON.stringify({ error: e.message || String(e) }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});