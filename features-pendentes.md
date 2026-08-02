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

## 2. Estimativa Nutricional de Alimentos por IA
**Status:** Funcional no código, mas retornará erro (Falha ao estimar com IA) sem a chave configurada.
**Onde Fica:** No arquivo `src/components/diet/FoodDialog.tsx` (Botão "Estimar com IA").
**Por que falta?** A função `estimateWithAI` invoca a Edge Function `estimate-nutrition` hospedada no Supabase. O objetivo dela é ler o que você digitou (ex: "2 ovos fritos") e usar a inteligência artificial para adivinhar as calorias e os macros e preencher os campos do formulário automaticamente. Sem uma chave de API configurada no projeto, o servidor da IA recusa a requisição.

### O que fazer no futuro:
- **Se colocar a Chave de API:** Não precisa mexer em absolutamente NADA no código Front-end! Basta fazer o deploy da Edge Function no Supabase e configurar a chave secreta nela. O botão vai magicamente passar a funcionar.
- **Se não for usar API por um bom tempo:** Podemos refatorar a tela `FoodDialog.tsx` para ter um "Fallback Local", ou seja, uma lista fixa embutida no aplicativo com as 100 comidas mais comuns (Arroz, Feijão, Frango, Banana, etc.). Assim você pode buscar nessa lista em vez de gastar com IA. Até lá, você deve preencher as calorias manualmente.
