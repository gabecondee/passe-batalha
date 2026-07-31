// Generate a full Boss (name, description, abilities, weaknesses, 30-day campaign,
// image prompt + generated portrait) from a small quiz using Lovable AI Gateway.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Difficulty = "common" | "uncommon" | "rare" | "epic" | "legendary";

interface QuizInput {
  problem: string;
  timeScore: 1 | 2 | 3 | 4;
  frequencyScore: 1 | 2 | 3 | 4;
  impactScore: 1 | 2 | 3 | 4;
  attemptsScore: 1 | 2 | 3 | 4;
}

const RARITY_LABELS: Record<Difficulty, string> = {
  common: "Comum",
  uncommon: "Incomum",
  rare: "Raro",
  epic: "Épico",
  legendary: "Lendário",
};

const REWARDS: Record<Difficulty, { xp: number; penalty: number; maxFails: number }> = {
  common: { xp: 50, penalty: 50, maxFails: 10 },
  uncommon: { xp: 300, penalty: 100, maxFails: 7 },
  rare: { xp: 600, penalty: 200, maxFails: 5 },
  epic: { xp: 1100, penalty: 350, maxFails: 3 },
  legendary: { xp: 1500, penalty: 500, maxFails: 1 },
};

function classify(total: number): Difficulty {
  if (total <= 5) return "common";
  if (total <= 8) return "uncommon";
  if (total <= 11) return "rare";
  if (total <= 14) return "epic";
  return "legendary";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const input = await req.json() as QuizInput;
    if (!input.problem || !input.timeScore || !input.frequencyScore || !input.impactScore || !input.attemptsScore) {
      return new Response(JSON.stringify({ error: "Missing quiz fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const total = input.timeScore + input.frequencyScore + input.impactScore + input.attemptsScore;
    const difficulty = classify(total);
    const rewards = REWARDS[difficulty];

    // === 1. Generate boss content via Gemini (JSON) ===
    const masterPrompt = `Você é um especialista em Psicologia Comportamental, TCC, Neurociência aplicada, Gamificação e narrativas RPG.

Transforme o problema pessoal abaixo em um CHEFÃO RPG completo para o app "Passe de Batalha", em português brasileiro.

Problema/Vício: ${input.problem}
Raridade já calculada: ${RARITY_LABELS[difficulty]} (pontuação ${total}/16)

Retorne APENAS um JSON válido (sem markdown, sem \`\`\`) com esta estrutura EXATA:
{
  "name": "Nome épico, ex: Morth'Zul - O Devorador de Vitalidade",
  "shortName": "Somente o nome principal, ex: Morth'Zul",
  "class": "${input.problem}",
  "description": "Entre 50 e 120 palavras. Tom sombrio. Explique quem é, como surgiu, como age, comportamentos que representa e recursos mentais que consome.",
  "origin": "Máximo 50 palavras.",
  "abilities": [
    { "name": "...", "description": "curta" },
    { "name": "...", "description": "curta" },
    { "name": "...", "description": "curta" },
    { "name": "...", "description": "curta" }
  ],
  "weaknesses": [
    { "name": "...", "description": "baseada em TCC/Psicologia Comportamental/Neurociência" },
    { "name": "...", "description": "..." },
    { "name": "...", "description": "..." },
    { "name": "...", "description": "..." }
  ],
  "imagePrompt": "Prompt em INGLÊS para gerar a imagem do boss: RPG dark fantasy, cinematic, extremely detailed, vertical portrait, no text, no UI, sombrio, simbolicamente inspirado em '${input.problem}'.",
  "campaign": [
    { "day": 1, "attackName": "Golpe da Consciência", "action": "prática, curta, mensurável" },
    ... EXATAMENTE 30 dias ...
    { "day": 30, "attackName": "...", "action": "..." }
  ]
}

REGRAS OBRIGATÓRIAS da campanha de 30 dias:
- Dias 1-7 = Consciência
- Dias 8-14 = Redução de gatilhos
- Dias 15-21 = Substituição comportamental
- Dias 22-30 = Consolidação
- Cada ação: prática, curta, objetiva, mensurável, progressiva.
- SEM espiritualidade, SEM pseudociência, SEM frases motivacionais genéricas.
- EXATAMENTE 30 objetos no array "campaign".
- EXATAMENTE 4 habilidades e 4 fraquezas.

Responda SOMENTE o JSON puro, nada mais.`;

    const textResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: masterPrompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!textResp.ok) {
      const detail = await textResp.text();
      return new Response(JSON.stringify({ error: "AI text generation failed", detail }), {
        status: textResp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const textData = await textResp.json();
    const rawContent = textData.choices?.[0]?.message?.content ?? "";
    let bossContent: any;
    try {
      bossContent = JSON.parse(rawContent);
    } catch {
      // Try to strip markdown fencing if the model included any
      const cleaned = rawContent.replace(/```json\s*|\s*```/g, "").trim();
      bossContent = JSON.parse(cleaned);
    }

    // Validation
    if (
      !bossContent?.name ||
      !bossContent?.description ||
      !Array.isArray(bossContent?.abilities) || bossContent.abilities.length < 4 ||
      !Array.isArray(bossContent?.weaknesses) || bossContent.weaknesses.length < 4 ||
      !Array.isArray(bossContent?.campaign) || bossContent.campaign.length !== 30 ||
      !bossContent?.imagePrompt
    ) {
      return new Response(JSON.stringify({ error: "Incomplete AI response", raw: bossContent }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === 2. Generate the boss portrait ===
    let portraitDataUrl: string | null = null;
    try {
      const imgResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{
            role: "user",
            content: [{ type: "text", text: bossContent.imagePrompt }],
          }],
          modalities: ["image", "text"],
        }),
      });
      if (imgResp.ok) {
        const imgData = await imgResp.json();
        portraitDataUrl = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url ?? null;
      }
    } catch (e) {
      console.error("image gen failed", e);
    }

    const result = {
      difficulty,
      totalScore: total,
      rewards,
      portraitDataUrl,
      boss: bossContent,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
