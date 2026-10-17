import {
    createClient
} from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { ImageMagick, initializeImageMagick, MagickFormat } from 'npm:@imagemagick/magick-wasm@0.0.44';

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// classes em inglês, exatamente como o app envia no campo className
const CLASS_PROMPTS: Record<string, string> = {
    warrior: "heavy battle armor, warrior aesthetic, subtle sword elements, red/orange fiery aura",
    mage: "mystical robes, arcane details, subtle magical staff elements, blue/purple aura and glowing runes",
    healer: "elegant healer robes, light armor, sacred details, green/cyan/white healing aura",
    rogue: "dark hooded cloak, lightweight leather armor, subtle daggers, dark purple shadow aura",
    paladin: "shining holy armor, sacred details, subtle sword elements, radiant golden/white aura",
};

const TEXT_MODEL = "gpt-5-mini";
const IMAGE_MODEL = "gpt-image-2";

let imageMagickReady: Promise<void> | undefined;

function initializePortraitEncoder(): Promise<void> {
    if (!imageMagickReady) {
        imageMagickReady = (async () => {
            // Resolve the package export: this version keeps the 32-bit WASM in dist/x86/.
            const wasmUrl = new URL(import.meta.resolve('npm:@imagemagick/magick-wasm@0.0.44/magick.wasm'));
            await initializeImageMagick(await Deno.readFile(wasmUrl));
        })().catch((error) => {
            imageMagickReady = undefined;
            throw error;
        });
    }
    return imageMagickReady;
}

/** Process the generated portrait before any Storage upload. */
export async function optimizeGeneratedAvatar(original: Blob): Promise<Blob> {
    if (!original.size || original.size > 5 * 1024 * 1024) {
        throw new StepError('image_processing', 'A imagem gerada está vazia ou excede 5 MB.', 502);
    }
    try {
        await initializePortraitEncoder();
        const input = new Uint8Array(await original.arrayBuffer());
        const encoded = ImageMagick.read(input, (image): Uint8Array => {
            if (!image.width || !image.height || image.width * image.height > 4_194_304) {
                throw new Error('Generated image dimensions exceed the portrait limit');
            }
            image.autoOrient();
            const scale = Math.min(1, 512 / Math.max(image.width, image.height));
            if (scale < 1) image.resize(Math.max(1, Math.round(image.width * scale)), Math.max(1, Math.round(image.height * scale)));
            image.strip();
            image.quality = 82;
            return image.write(MagickFormat.WebP, data => Uint8Array.from(data));
        });
        if (!encoded.length) throw new Error('Portrait encoder returned an empty file');
        return new Blob([encoded], { type: 'image/webp' });
    } catch {
        throw new StepError('image_processing', 'Não foi possível compactar o avatar. Tente novamente.', 502);
    }
}

// -------- Erro estruturado por etapa, para o app tratar de forma coerente --------
class StepError extends Error {
    step: string;
    status: number;
    constructor(step: string, message: string, status = 500) {
        super(message);
        this.step = step;
        this.status = status;
    }
}

function errorResponse(e: unknown) {
    if (e instanceof StepError) {
        return new Response(JSON.stringify({
            error: {
                step: e.step,
                message: e.message,
            }
        }), {
            status: e.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({
        error: { step: "unknown", message }
    }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

// Helper: fetch com timeout, para nenhum provedor travar a function inteira
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 25000): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timeout);
    }
}

// -------- Etapa 1: descrever o rosto com gpt-5-mini --------
async function describeFace(openaiApiKey: string, imageUrl: string): Promise<string> {
    let resp: Response;
    try {
        resp = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${openaiApiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: TEXT_MODEL,
                reasoning_effort: "minimal",
                messages: [{
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Analyze this face carefully. Describe the person's gender, apparent ethnicity, facial structure, skin tone, hair color and style, eye color, and any prominent facial features (beard, glasses, freckles). Keep it as a concise, highly detailed physical description for an AI image generator to replicate the face exactly. Do not describe the background or clothing.",
                        },
                        {
                            type: "image_url",
                            image_url: { url: imageUrl },
                        },
                    ],
                }],
                max_completion_tokens: 1200,
            }),
        }, 30000);
    } catch (e) {
        throw new StepError("vision", `Falha ao contatar a API de análise facial: ${e instanceof Error ? e.message : String(e)}`, 502);
    }

    if (!resp.ok) {
        const detail = await resp.text().catch(() => "");
        throw new StepError("vision", `API de análise facial retornou erro (${resp.status}): ${detail}`, 502);
    }

    const data = await resp.json().catch(() => null);
    const description = data?.choices?.[0]?.message?.content;
    if (!description) {
        const finishReason = data?.choices?.[0]?.finish_reason ?? "desconhecido";
        throw new StepError("vision", `A análise facial não retornou nenhuma descrição (finish_reason: ${finishReason}).`, 502);
    }
    return description;
}

// -------- Etapa 2: gerar a imagem (com 1 retry para falhas transitórias) --------
async function generateAvatarImage(openaiApiKey: string, finalPrompt: string): Promise<Blob> {
    let lastErrorDetail = "";
    let attempts = 0;

    for (let attempt = 1; attempt <= 2; attempt++) {
        attempts = attempt;
        try {
            const imgResp = await fetchWithTimeout("https://api.openai.com/v1/images/generations", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${openaiApiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: IMAGE_MODEL,
                    prompt: finalPrompt,
                    n: 1,
                    size: "1024x1024",
                    quality: "medium",
                    output_format: "png",
                }),
            }, 90000);

            if (!imgResp.ok) {
                lastErrorDetail = `status ${imgResp.status}: ${await imgResp.text().catch(() => "")}`;
                console.warn(`${IMAGE_MODEL} tentativa ${attempt} falhou: ${lastErrorDetail}`);
                if (imgResp.status < 500 && imgResp.status !== 429) break;
                continue;
            }

            const imgData = await imgResp.json();
            const b64 = imgData.data?.[0]?.b64_json;
            const url = imgData.data?.[0]?.url;

            if (b64) {
                const binary = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
                return new Blob([binary], { type: "image/png" });
            }

            if (url) {
                const dl = await fetchWithTimeout(url, {}, 20000);
                if (!dl.ok) {
                    lastErrorDetail = `download da url falhou com status ${dl.status}`;
                    console.warn(`${IMAGE_MODEL} tentativa ${attempt}: ${lastErrorDetail}`);
                    continue;
                }
                return await dl.blob();
            }

            lastErrorDetail = `resposta sem imagem usável: ${JSON.stringify(imgData).slice(0, 300)}`;
            console.warn(`${IMAGE_MODEL} tentativa ${attempt}: ${lastErrorDetail}`);
        } catch (e) {
            lastErrorDetail = e instanceof Error ? e.message : String(e);
            console.error(`${IMAGE_MODEL} tentativa ${attempt} lançou erro:`, e);
            // A timed-out generation may still complete upstream; do not create another.
            if (e instanceof Error && e.name === 'AbortError') break;
        }
    }

    throw new StepError("image_generation", `Falha ao gerar a imagem com ${IMAGE_MODEL} após ${attempts} tentativa(s). Detalhe: ${lastErrorDetail}`, 502);
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        const { photoBase64, className } = await req.json().catch(() => {
            throw new StepError("validation", "Corpo da requisição inválido (JSON esperado).", 400);
        });

        if (!photoBase64 || !className) {
            throw new StepError("validation", "Os campos 'photoBase64' e 'className' são obrigatórios.", 400);
        }

        const classDesc = CLASS_PROMPTS[className];
        if (!classDesc) {
            throw new StepError("validation", `Classe inválida: '${className}'. Use uma das: ${Object.keys(CLASS_PROMPTS).join(", ")}.`, 400);
        }

        const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
        if (!openaiApiKey) throw new StepError("config", "OPENAI_API_KEY não configurada no servidor.", 500);

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new StepError("auth", "Cabeçalho de autorização ausente.", 401);

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
        const supabase = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: authHeader } }
        });

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) {
            throw new StepError("auth", `Usuário não autenticado: ${userError?.message ?? "sessão inválida"}`, 401);
        }

        const imageUrl = photoBase64.startsWith("data:") ? photoBase64 : `data:image/jpeg;base64,${photoBase64}`;

        // Etapa 1: descrever o rosto
        const faceDescription = await describeFace(openaiApiKey, imageUrl);

        // Etapa 2: gerar a imagem
        const finalPrompt = `Transform the person into an epic 2D anime dark-fantasy RPG character portrait, inspired by high-quality modern anime games such as Solo Leveling. ` +
            `IMPORTANT STYLE: pure anime illustration, anime linework, stylized anime facial features, anime eyes, cel shading and fantasy game artwork. Do NOT make it photorealistic, semi-realistic, or 3D. ` +
            `The character MUST LOOK LIKE THIS DESCRIPTION: ${faceDescription}. ` +
            `STRICT FRAMING: head-and-shoulders bust shot only, full head, face and neck visible, both eyes clearly visible, face centered in upper-center area. Do NOT show full body, hands or large weapons in the foreground. ` +
            `Apply this RPG class through clothing, armor, colors and aura: ${classDesc}. ` +
            `Dramatic anime lighting, dark fantasy background, subtle glow, magical particles, high detail, masterpiece.`;

        const originalImage = await generateAvatarImage(openaiApiKey, finalPrompt);
        const imageBlob = await optimizeGeneratedAvatar(originalImage);

        // Etapa 3: upload no Supabase Storage
        const fileName = `${user.id}/${crypto.randomUUID()}.webp`;
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, imageBlob, {
                contentType: 'image/webp',
                cacheControl: '31536000',
                upsert: false,
            });

        if (uploadError) {
            throw new StepError("storage", `Falha ao salvar a imagem: ${uploadError.message}`, 500);
        }

        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);

        return new Response(JSON.stringify({
            avatarUrl: publicUrlData.publicUrl,
            generatedBy: IMAGE_MODEL,
            imageFormat: 'webp',
            imageBytes: imageBlob.size,
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (e) {
        console.error("Error in generate-avatar:", e);
        return errorResponse(e);
    }
});
