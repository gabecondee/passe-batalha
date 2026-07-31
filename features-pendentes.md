# Funcionalidades Pendentes (Features Roadmap)

Este documento registra as funcionalidades que foram temporariamente desativadas ou simplificadas, e que devem ser retomadas no futuro.

## 1. Geração Dinâmica de Chefões por IA
**Status:** Desativado temporariamente (Fallback local genérico ativo em `BossQuizDialog.tsx`).
**Por que falta?** Falta uma chave de API de Inteligência Artificial (OpenAI, Gemini, DeepSeek, etc.) configurada nos cofres (Secrets) do projeto Supabase.

### O que precisa ser refeito quando a chave estiver disponível:
- **Restaurar Edge Function:** A função `supabase/functions/generate-boss` deve ser ativada na nuvem (`npx supabase functions deploy generate-boss`).
- **Refatorar o Front-End:** No arquivo `src/components/bosses/BossQuizDialog.tsx`, a função `generateBoss` deve voltar a fazer o `supabase.functions.invoke('generate-boss')` em vez de gerar o molde estático de 30 dias que está lá hoje.
- **Configurar Chave:** Executar `npx supabase secrets set [NOME_DA_VARIAVEL]="sua_chave"` no terminal.

### Notas sobre Integração (ex: DeepSeek):
A Inteligência Artificial originalmente fazia **duas coisas**: Texto (História e Missões) e Imagem (Avatar do Boss). 
- **DeepSeek:** É excelente e extremamente barato para a geração de Texto! Podemos perfeitamente refatorar a Edge Function para usar a chave do DeepSeek para cuspir o JSON com as habilidades e os 30 dias de campanha.
- **Limitação do DeepSeek:** Ele gera apenas texto, não imagens. Portanto, quando usarmos o DeepSeek para a inteligência, para a **imagem do Chefão** teremos que manter os avatares genéricos do DiceBear ou plugar uma segunda API (como um DALL-E 3 da OpenAI ou Midjourney) só para desenhar a arte.
