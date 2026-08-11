// Supabase Edge Function: generate-boss
// Generates a full RPG Boss using OpenAI GPT-4o / GPT-4o-mini API and image generator.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Difficulty = "common" | "uncommon" | "rare" | "epic" | "legendary";

interface QuizInput {
  problem: string;
  attributeArea: string;
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
  common: { xp: 100, penalty: 50, maxFails: 10 },
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

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const apiKey = openaiApiKey || lovableApiKey;

    const total = input.timeScore + input.frequencyScore + input.impactScore + input.attemptsScore;
    const difficulty = classify(total);
    const rewards = REWARDS[difficulty];
    const attributeArea = input.attributeArea || "Mental";

    // === 1. Master Prompt GPT ===
    const masterPrompt = `Você é um especialista em Psicologia Comportamental, TCC (Terapia Cognitivo-Comportamental), Neurociência aplicada e narrativas RPG Dark Fantasy.

Transforme o problema pessoal abaixo em um CHEFÃO RPG soberbo para o aplicativo "Passe de Batalha", em português brasileiro.

Problema/Vício do Usuário: "${input.problem}"
Área de Atributo Afetada: "${attributeArea}"
Dificuldade/Raridade: ${RARITY_LABELS[difficulty]} (Pontuação ${total}/16)

Retorne APENAS um JSON válido (sem markdown, sem \`\`\`json) com esta estrutura EXATA:
{
  "name": "Nome Épico do Boss, ex: MORTH'ZUL - O Devorador de Vitalidade",
  "shortName": "Apenas o nome principal",
  "class": "${input.problem}",
  "description": "Entre 50 e 100 palavras. Tom sombrio, imersivo e psicológico. Explique quem é o Boss, como ele se manifesta e de qual recurso mental/emocional se alimenta.",
  "origin": "Entre 20 e 40 palavras. Explique a origem mística/psicológica do boss.",
  "abilities": [
    { "name": "Nome da Habilidade 1", "description": "Descrição curta do ataque comportamental" },
    { "name": "Nome da Habilidade 2", "description": "..." },
    { "name": "Nome da Habilidade 3", "description": "..." },
    { "name": "Nome da Habilidade 4", "description": "..." }
  ],
  "weaknesses": [
    { "name": "Nome da Fraqueza 1", "description": "Estratégia prática baseada em TCC/Neurociência" },
    { "name": "Nome da Fraqueza 2", "description": "..." },
    { "name": "Nome da Fraqueza 3", "description": "..." },
    { "name": "Nome da Fraqueza 4", "description": "..." }
  ],
  "imagePrompt": "Detailed DALL-E image prompt in ENGLISH: Dark fantasy RPG boss monster portrait, cinematic lighting, epic digital art, 8k resolution, vertical composition, symbolising '${input.problem}', highly detailed, dark atmosphere, no text, no UI.",
  "campaign": [
    { "day": 1, "attackName": "Golpe da Consciência", "action": "Ação prática diária mensurável para o dia 1" },
    ... EXATAMENTE 30 DIAS (dia 1 a 30) ...
    { "day": 30, "attackName": "Golpe Final", "action": "Ação de consolidação para o dia 30" }
  ]
}

REGRAS DA CAMPANHA DE 30 DIAS:
- Dias 1-7: Fase 1 (Consciência & Mapeamento de Gatilhos)
- Dias 8-14: Fase 2 (Redução de Estímulos & Barreira Física)
- Dias 15-21: Fase 3 (Substituição Comportamental Ativa)
- Dias 22-30: Fase 4 (Consolidação & Fortalecimento de Identidade)
- Exatamente 30 itens no array "campaign".
- Exatamente 4 habilidades e 4 fraquezas.
- Sem espiritualidade genérica, sem frase motivacional vazia. Ações práticas e objetivas.`;

    let bossContent: any = null;

    if (openaiApiKey) {
      // Direct OpenAI GPT API Call
      const textResp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: masterPrompt }],
          response_format: { type: "json_object" },
          temperature: 0.7,
        }),
      });

      if (textResp.ok) {
        const textData = await textResp.json();
        const rawContent = textData.choices?.[0]?.message?.content ?? "";
        bossContent = JSON.parse(rawContent);
      }
    } else if (lovableApiKey) {
      // Gateway Fallback
      const textResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "user", content: masterPrompt }],
          response_format: { type: "json_object" },
        }),
      });

      if (textResp.ok) {
        const textData = await textResp.json();
        const rawContent = textData.choices?.[0]?.message?.content ?? "";
        bossContent = JSON.parse(rawContent);
      }
    }

    // === 2. Generate Boss Portrait Image ===
    let portraitUrl: string | null = null;
    const promptText = bossContent?.imagePrompt || `Dark fantasy RPG boss monster portrait representing ${input.problem}, cinematic lighting, detailed digital art, vertical portrait, dark aura, no text`;

    if (openaiApiKey && bossContent?.imagePrompt) {
      try {
        const imgResp = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: { Authorization: `Bearer ${openaiApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: bossContent.imagePrompt,
            n: 1,
            size: "1024x1024",
            quality: "standard",
          }),
        });
        if (imgResp.ok) {
          const imgData = await imgResp.json();
          portraitUrl = imgData.data?.[0]?.url || null;
        }
      } catch (e) {
        console.error("DALL-E image generation error:", e);
      }
    }

    // Fallback to high-quality RPG Pollinations image generation if DALL-E key is not present or failed
    if (!portraitUrl) {
      const cleanPrompt = encodeURIComponent(`${input.problem} dark fantasy rpg boss monster portrait cinematic detailed 8k`);
      portraitUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=512&height=512&seed=${Date.now()}&nologo=true`;
    }

    const result = {
      difficulty,
      totalScore: total,
      rewards,
      portraitUrl,
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
