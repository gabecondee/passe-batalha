import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { description } = await req.json();
    if (!description || typeof description !== 'string' || description.trim().length < 2) {
      return new Response(JSON.stringify({ error: 'Descrição inválida' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY ausente');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content:
              'Você é um nutricionista. Estime os macronutrientes de um alimento descrito em português brasileiro. Sempre retorne valores numéricos realistas, mesmo que aproximados. Considere a quantidade descrita pelo usuário (ex: "2 ovos cozidos", "100g de arroz branco", "1 fatia de pão integral").',
          },
          { role: 'user', content: description },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'register_nutrition',
              description: 'Registra a estimativa nutricional do alimento.',
              parameters: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Nome curto e padronizado do alimento' },
                  quantity: { type: 'string', description: 'Quantidade interpretada (ex: "2 unidades", "100g")' },
                  kcal: { type: 'number', description: 'Calorias totais (kcal)' },
                  carbs: { type: 'number', description: 'Carboidratos totais (g)' },
                  protein: { type: 'number', description: 'Proteínas totais (g)' },
                  fat: { type: 'number', description: 'Gorduras totais (g)' },
                },
                required: ['name', 'quantity', 'kcal', 'carbs', 'protein', 'fat'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'register_nutrition' } },
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: 'Muitas requisições, tente novamente em instantes.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: 'Créditos de IA esgotados.' }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error('AI error', response.status, t);
      return new Response(JSON.stringify({ error: 'Erro no gateway de IA' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) {
      return new Response(JSON.stringify({ error: 'Sem resposta estruturada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const parsed = JSON.parse(args);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('estimate-nutrition error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Erro' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
