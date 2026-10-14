# Confirmação de golpes e proteção de histórico

Implementado em 13/10/2026 após a auditoria dos relatos de sucesso que virava falha.

## Experiência

- Os quatro botões existentes, no painel e no detalhe do boss, usam um diálogo compartilhado com spinner e “Salvando golpe”.
- Enquanto a requisição está pendente, o diálogo bloqueia interação, Escape e fechamento; o contexto impede envios repetidos mesmo antes de um novo render.
- Se não confirmar, aparece “Não conseguimos confirmar o golpe”, com Fechar e Tentar novamente. A tentativa mantém a ação original (sucesso ou falha).
- Há limite de 20 segundos para a operação de leitura/gravação. Um timeout não comprova que o servidor deixou de salvar: a tentativa seguinte verifica primeiro o registro existente.
- Nenhum erro de rede é convertido em falha do dia. A regra de dias não realizados continua existindo.

## Persistência

Antes do golpe, o cliente consulta a batalha pelo ID. Um dia já registrado é preservado; se o resultado coincide com a tentativa, confirma sem gravar novamente.

Updates usam o ID da batalha, usuário, status ativo e comparação do `days_history` com a versão lida. Se outra sessão alterar o histórico entre leitura e gravação, a atualização não alcança nenhuma linha e oferece nova tentativa.

No foco/intervalo, o app busca dados atuais em vez de gravar a memória antiga. Normalização automática usa a mesma comparação de histórico. Se houver conflito, busca novamente, com limite de duas tentativas extras. Carregamentos iniciados antes de um golpe não substituem seu resultado local.

Uma batalha só entra no estado local após o INSERT confirmado e com o ID retornado. O contador permanece no dia de calendário após um golpe. A mensagem do painel diferencia sucesso confirmado, falha registrada e indisponibilidade.

## Publicação

Aplicar `supabase/migrations/20261013_protect_recorded_boss_days.sql` antes de publicar o cliente. A migration adiciona um trigger que rejeita alterações/removal de dias já confirmados, protegendo também contra clientes antigos. Ela não reescreve dados existentes. Não foi aplicada a um banco remoto nesta tarefa, nem validada em uma instância PostgreSQL disponível.

Em homologação, verificar dois aparelhos: salvar sucesso em um, retornar ao outro no dia seguinte e confirmar que o histórico continua sucesso. Verificar também falha de conexão e retomada pelo botão Tentar novamente.

Os testes de regressão usam o provider real com Supabase simulado: preservação entre sessões, corrida com normalização, alteração proibida de sucesso, contador, envio repetido, recuperação de rede e retry após resposta incerta/conflito. Esses testes não substituem a validação do trigger em PostgreSQL.

Validação local: 10 testes passaram e o build de produção passou. A checagem global com `tsc` não passou: o projeto contém inconsistências de tipos, incluindo o arquivo gerado do Supabase que só declara três tabelas e não declara `boss_battles`/`custom_bosses`. O build do Vite não executa essa checagem de tipos.

O relatório `auditoria-golpes-boss.md` descreve os defeitos antes destas alterações. Múltiplas batalhas ativas já existentes não foram removidas; o novo cliente atualiza somente a batalha selecionada por ID.
