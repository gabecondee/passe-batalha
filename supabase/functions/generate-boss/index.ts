// Supabase Edge Function: generate-boss
// Generates a full RPG Boss using OpenAI text + image generation.

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Difficulty = |
    "common" |
    "uncommon" |
    "rare" |
    "epic" |
    "legendary";

interface QuizInput {
    problem: string;
    attributeArea: string;
    timeScore: 1 | 2 | 3 | 4;
    frequencyScore: 1 | 2 | 3 | 4;
    impactScore: 1 | 2 | 3 | 4;
    attemptsScore: 1 | 2 | 3 | 4;
}

const RARITY_LABELS: Record < Difficulty, string > = {
    common: "Comum",
    uncommon: "Incomum",
    rare: "Raro",
    epic: "Épico",
    legendary: "Lendário",
};

const REWARDS: Record <
    Difficulty, {
        xp: number;penalty: number;maxFails: number
    } >
    = {
        common: {
            xp: 50,
            penalty: 50,
            maxFails: 10
        },
        uncommon: {
            xp: 300,
            penalty: 100,
            maxFails: 7
        },
        rare: {
            xp: 600,
            penalty: 200,
            maxFails: 5
        },
        epic: {
            xp: 1100,
            penalty: 350,
            maxFails: 3
        },
        legendary: {
            xp: 1500,
            penalty: 500,
            maxFails: 1
        },
    };

function classify(total: number): Difficulty {
    if (total <= 5) return "common";
    if (total <= 8) return "uncommon";
    if (total <= 11) return "rare";
    if (total <= 14) return "epic";
    return "legendary";
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, {
            headers: corsHeaders,
        });
    }

    try {
        // ============================================================
        // 1. INPUT
        // ============================================================

        const input = (await req.json()) as QuizInput;

        if (
            !input.problem ||
            !input.timeScore ||
            !input.frequencyScore ||
            !input.impactScore ||
            !input.attemptsScore
        ) {
            return new Response(
                JSON.stringify({
                    error: "Missing quiz fields",
                }), {
                    status: 400,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                },
            );
        }

        // ============================================================
        // 2. OPENAI KEY
        // ============================================================

        const apiKey = Deno.env.get("OPENAI_API_KEY");

        if (!apiKey) {
            throw new Error(
                "OPENAI_API_KEY not configured",
            );
        }

        // ============================================================
        // 3. DIFFICULTY
        // ============================================================

        const total =
            input.timeScore +
            input.frequencyScore +
            input.impactScore +
            input.attemptsScore;

        const difficulty = classify(total);

        const rewards = REWARDS[difficulty];

        const attributeArea =
            input.attributeArea || "Mental";

        // ============================================================
        // 4. MASTER PROMPT
        // ============================================================

        const masterPrompt = `
Você é um especialista em Psicologia Comportamental,
TCC (Terapia Cognitivo-Comportamental),
Neurociência aplicada, Gamificação e narrativas RPG Dark Fantasy.

Sua tarefa é transformar o problema pessoal abaixo em um
CHEFÃO RPG completo para o aplicativo "Passe de Batalha".

O resultado deve parecer um personagem de um RPG Dark Fantasy,
com identidade própria, nome memorável e forte presença visual.

============================================================
DADOS DO USUÁRIO
============================================================

Problema/Vício:
${input.problem}

Área de Atributo Afetada:
${attributeArea}

Raridade:
${RARITY_LABELS[difficulty]}

Pontuação:
${total}/16

============================================================
IDENTIDADE DO BOSS
============================================================

O Boss NÃO deve receber um nome genérico ou simplesmente
repetir o problema do usuário.

O nome deve parecer o nome de um verdadeiro CHEFÃO DE RPG.

Use nomes no estilo:

"MORTH'ZUL - O DEVORADOR DE VITALIDADE"

"O nome deve ter duas partes:

1. Um nome próprio sombrio, único e memorável.
2. Um título/apelido épico relacionado ao comportamento representado.

Exemplos de estrutura:

"MORTH'ZUL - O DEVORADOR DE VITALIDADE"
"OCULUS SOMNUS - O OLHO QUE NUNCA DORME"
"NARGUL - O ADORMECIDO"
"VORTHAK - O SENHOR DA PROCRASTINAÇÃO"

NÃO use simplesmente:

"O Vício"
"O Ilusionista da Tentação"
"O Monstro da Pornografia"
"O Demônio das Redes Sociais"

O problema pode inspirar o Boss, mas NÃO deve ser simplesmente
copiado como nome.

O título deve transformar o comportamento em uma entidade RPG.

============================================================
DESCRIÇÃO
============================================================

A descrição deve ser CURTA.

Entre 15 e 30 palavras.

Ela aparecerá diretamente no card do Boss.

Deve explicar rapidamente quem é o Boss e como ele age.

Exemplo de estilo:

"Uma entidade sombria que se alimenta da atenção fragmentada e transforma pequenos impulsos em ciclos intermináveis de distração."

NÃO escreva uma história longa.

NÃO ultrapasse 30 palavras.

============================================================
ORIGIN
============================================================

Máximo de 40 palavras.

Explique brevemente a origem psicológica/mística do Boss.

Pode ser mais narrativo que a descrição.

============================================================
HABILIDADES
============================================================

Exatamente 4 habilidades.

Os nomes devem ser curtos, temáticos e parecer ataques
de um Boss de RPG.

Exemplos:

"Sedução do Abismo"
"Roubo de Foco"
"Correntes do Impulso"
"Tempestade de Dopamina"

As descrições devem ser CURTAS.

Entre 8 e 20 palavras cada.

As habilidades representam os mecanismos comportamentais
do problema.

============================================================
FRAQUEZAS
============================================================

Exatamente 4 fraquezas.

Os nomes devem parecer mecânicas de combate contra o Boss.

Exemplos:

"Consciência"
"Barreira Física"
"Substituição"
"Controle de Estímulos"

As descrições devem ser práticas e objetivas.

Baseie-se em:

- TCC
- Psicologia Comportamental
- Neurociência
- Controle de estímulos
- Formação de hábitos
- Substituição comportamental

NÃO use espiritualidade.

NÃO use pseudociência.

NÃO use frases motivacionais vazias.

============================================================
IMAGE PROMPT
============================================================

O campo "imagePrompt" deve ser escrito SOMENTE EM INGLÊS.

Ele será usado diretamente para gerar a imagem do Boss.

A imagem deve representar visualmente o personagem criado.

IMPORTANTE:

A imagem deve parecer uma arte oficial de um RPG Dark Fantasy.

Use:

- dark fantasy RPG boss
- cinematic lighting
- extremely detailed
- epic character design
- dramatic atmosphere
- vertical character portrait
- full character visible
- powerful silhouette
- detailed armor or creature anatomy
- dark mystical environment
- cinematic composition
- high contrast
- professional fantasy game concept art
- imposing presence
- unique visual identity

A aparência deve ser SIMBOLICAMENTE relacionada ao problema:

"${input.problem}"

Mas NÃO escreva o problema como texto na imagem.

NÃO coloque:

- text
- letters
- words
- UI
- interface
- watermark
- logo
- captions

O personagem deve ocupar a maior parte da composição.

============================================================
CAMPAIGN
============================================================

Crie EXATAMENTE 30 dias.

Cada item deve conter:

day
attackName
action

As ações devem ser:

- práticas
- curtas
- objetivas
- mensuráveis
- progressivas

FASES:

Dias 1-7:
Consciência e identificação de gatilhos.

Dias 8-14:
Redução de estímulos e barreiras físicas/ambientais.

Dias 15-21:
Substituição comportamental ativa.

Dias 22-30:
Consolidação e fortalecimento da nova rotina.

Não use espiritualidade.

Não use pseudociência.

Não use frases motivacionais genéricas.

============================================================
FORMATO DE RESPOSTA
============================================================

Retorne SOMENTE JSON válido.

NÃO use markdown.

NÃO use \`\`\`json.

NÃO escreva explicações antes ou depois do JSON.

Estrutura EXATA:

{
  "name": "NOME TEMÁTICO - O TÍTULO DO BOSS",
  "shortName": "NOME PRINCIPAL",
  "class": "${input.problem}",
  "description": "Descrição curta de 15 a 30 palavras.",
  "origin": "Origem do Boss em até 40 palavras.",
  "abilities": [
    {
      "name": "Habilidade 1",
      "description": "Descrição curta."
    },
    {
      "name": "Habilidade 2",
      "description": "Descrição curta."
    },
    {
      "name": "Habilidade 3",
      "description": "Descrição curta."
    },
    {
      "name": "Habilidade 4",
      "description": "Descrição curta."
    }
  ],
  "weaknesses": [
    {
      "name": "Fraqueza 1",
      "description": "Estratégia prática."
    },
    {
      "name": "Fraqueza 2",
      "description": "Estratégia prática."
    },
    {
      "name": "Fraqueza 3",
      "description": "Estratégia prática."
    },
    {
      "name": "Fraqueza 4",
      "description": "Estratégia prática."
    }
  ],
  "imagePrompt": "Detailed English prompt for a dark fantasy RPG boss...",
  "campaign": [
    {
      "day": 1,
      "attackName": "Golpe da Consciência",
      "action": "Ação prática, curta e mensurável."
    }
  ]
}

REQUISITOS ABSOLUTOS:

- Exatamente 4 abilities.
- Exatamente 4 weaknesses.
- Exatamente 30 campaign items.
- campaign deve conter day 1 até day 30.
- Nenhum dia pode faltar.
- Nenhum dia pode repetir.
- description entre 15 e 30 palavras.
- origin máximo 40 palavras.
- ability descriptions curtas.
- weakness descriptions práticas.
- name deve ser temático e parecer um Boss de RPG.
- shortName deve conter somente o nome principal.
- imagePrompt deve ser em inglês.
- Retorne SOMENTE JSON.
`;

        // ============================================================
        // 5. GENERATE BOSS TEXT
        // ============================================================

        const textResp = await fetch(
            "https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [{
                        role: "user",
                        content: masterPrompt,
                    }, ],
                    response_format: {
                        type: "json_object",
                    },
                    temperature: 0.8,
                }),
            },
        );

        if (!textResp.ok) {
            const detail = await textResp.text();

            console.error(
                "OpenAI text generation failed:",
                textResp.status,
                detail,
            );

            return new Response(
                JSON.stringify({
                    error: "AI text generation failed",
                    status: textResp.status,
                    detail,
                }), {
                    status: textResp.status,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                },
            );
        }

        const textData = await textResp.json();

        const rawContent =
            textData?.choices?.[0]?.message?.content ?? "";

        let bossContent: any;

        try {
            bossContent = JSON.parse(rawContent);
        } catch {
            const cleaned = rawContent
                .replace(/```json\s*/gi, "")
                .replace(/```\s*/g, "")
                .trim();

            bossContent = JSON.parse(cleaned);
        }

        // ============================================================
        // 6. VALIDATION
        // ============================================================

        if (
            !bossContent?.name ||
            !bossContent?.shortName ||
            !bossContent?.description ||
            !bossContent?.origin ||
            !Array.isArray(bossContent?.abilities) ||
            bossContent.abilities.length !== 4 ||
            !Array.isArray(bossContent?.weaknesses) ||
            bossContent.weaknesses.length !== 4 ||
            !Array.isArray(bossContent?.campaign) ||
            bossContent.campaign.length !== 30 ||
            !bossContent?.imagePrompt
        ) {
            return new Response(
                JSON.stringify({
                    error: "Incomplete AI response",
                    raw: bossContent,
                }), {
                    status: 502,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                },
            );
        }

        // ============================================================
        // 7. GENERATE IMAGE
        // ============================================================

        let portraitDataUrl: string | null = null;

        try {
            const imgResp = await fetch(
                "https://api.openai.com/v1/images/generations", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model: "gpt-image-2",
                        prompt: bossContent.imagePrompt,
                        size: "1024x1536",
                        quality: "medium",
                        output_format: "png",
                    }),
                },
            );

            const imgText = await imgResp.text();

            if (!imgResp.ok) {
                console.error(
                    "OpenAI image generation failed:",
                    imgResp.status,
                    imgText,
                );
            } else {
                const imgData = JSON.parse(imgText);

                const base64 =
                    imgData?.data?.[0]?.b64_json ?? null;

                if (base64) {
                    portraitDataUrl =
                        `data:image/png;base64,${base64}`;
                }
            }
        } catch (e) {
            console.error(
                "image generation failed:",
                e,
            );
        }

        // ============================================================
        // 8. RESPONSE
        // ============================================================

        const result = {
            difficulty,
            totalScore: total,
            rewards,
            portraitDataUrl,
            boss: bossContent,
        };

        return new Response(
            JSON.stringify(result), {
                status: 200,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
            },
        );
    } catch (e) {
        console.error(
            "generate-boss error:",
            e,
        );

        return new Response(
            JSON.stringify({
                error: e instanceof Error ?
                    e.message :
                    String(e),
            }), {
                status: 500,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
            },
        );
    }
});