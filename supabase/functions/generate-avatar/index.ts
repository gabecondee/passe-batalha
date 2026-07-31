// Generate a dark-fantasy anime avatar from a user photo + chosen class
// Uses Lovable AI Gateway (google/gemini-2.5-flash-image) for image editing.
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { photoBase64, className } = await req.json();
    if (!photoBase64 || !className) {
      return new Response(JSON.stringify({ error: "photoBase64 and className required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const classDesc = CLASS_PROMPTS[className] ?? CLASS_PROMPTS.warrior;
    const prompt = `Transform the person in this photo into an epic anime dark-fantasy RPG character PORTRAIT inspired by Solo Leveling. STRICT FRAMING: head-and-shoulders bust shot (head, face, shoulders and upper chest only). Face must be fully visible, centered, eyes clearly shown, no cropping of forehead, chin or sides. Do NOT show full body, legs, hands, weapons in foreground, or armor-only compositions. Preserve facial identity (face shape, hair, ethnicity). Apply this class styling subtly on shoulders/upper armor: ${classDesc}. Dramatic cinematic lighting, dark moody background with subtle glow, high detail. Composition must work as both a rectangular card and a small circular avatar — face occupies the upper-center area.`;

    const imageUrl = photoBase64.startsWith("data:") ? photoBase64 : `data:image/jpeg;base64,${photoBase64}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        }],
        modalities: ["image", "text"],
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return new Response(JSON.stringify({ error: "AI gateway error", detail: txt }), {
        status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const avatarUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!avatarUrl) {
      return new Response(JSON.stringify({ error: "no image returned", raw: data }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ avatarUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
