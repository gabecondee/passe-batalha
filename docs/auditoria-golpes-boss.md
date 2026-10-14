# Auditoria dos golpes no boss — 13/10/2026

## Resultado

Há um cenário reproduzido no código atual que explica um golpe salvo aparecer depois como falha: uma sessão desatualizada grava por cima do histórico de outra sessão. Não houve acesso a dados ou logs de produção; portanto, ainda não é possível atribuir todos os relatos a esse cenário. Nenhuma lógica de produção foi alterada nesta auditoria.

## Todos os caminhos encontrados

| Entrada | Ação | Destino |
| --- | --- | --- |
| `/app` → `Index` → `Dashboard` | CONCLUIR, `recordDayAction(..., true)` | `BossContext` → UPDATE em `boss_battles` |
| `/app` → `Dashboard` | FALHEI, `recordDayAction(..., false)` | Mesmo destino |
| `/bosses/:id` → `BossDetail` → calendário → diálogo | Concluir ação, `recordDayAction(..., true)` | Mesmo destino |
| `/bosses/:id` → diálogo | Falhei hoje, `recordDayAction(..., false)` | Mesmo destino |
| Carregamento do `BossProvider` / `fetchData` | Dias anteriores pendentes viram falha | UPDATE automático em `boss_battles` |
| `BossProvider`, a cada 60 segundos e evento `window.focus` | Normalização da batalha em memória | UPDATE automático em `boss_battles` |

`/bosses` lista as batalhas e encaminha ao detalhe; não registra golpes. Não foi encontrada Edge Function/RPC para registrar golpes: os quatro botões chamam diretamente a mesma função do contexto, que usa o cliente Supabase. A função `generate-boss` apenas gera o boss. Conquistas consomem os golpes; não gravam o histórico.

Referências: `src/pages/Dashboard.tsx:468,482`; `src/pages/BossDetail.tsx:396,415`; `src/contexts/BossContext.tsx:294,298,329,338,452,501`.

## 1. Prioridade alta: histórico salvo pode ser sobrescrito

Os golpes e a normalização automática enviam o array inteiro `days_history`. A sincronização de foco/intervalo usa a cópia em memória, sem buscar a versão atual do banco. O filtro `status = active` não detecta mudanças no histórico.

Reprodução validada com o provider real e banco simulado:

1. Aba A carrega o dia 1 como pendente.
2. Outro aparelho/aba B salva sucesso no dia 1.
3. Aba A continua com o dia 1 pendente em memória.
4. No dia seguinte, A recebe foco.
5. A normaliza seu dia 1 pendente para falha e grava o histórico inteiro.
6. O sucesso já salvo no banco é substituído por falha.

Essa mesma classe de problema afeta gravações simultâneas e requisições fora de ordem. Atualizações do banco não são acompanhadas por realtime nem por consulta no retorno ao app.

Correção recomendada: registrar/normalizar no servidor, em transação, usando o ID da batalha e modificando somente dias ainda pendentes. Alternativamente, usar controle de versão e rejeitar/gravar novamente após conflito. Apenas refazer a consulta no foco não elimina a corrida entre consulta e gravação.

## 2. Prioridade alta: múltiplas batalhas ativas podem ser atualizadas juntas

`startBattle` insere uma linha e não impede iniciar novamente o mesmo boss no contexto. O SQL disponível não contém índice único que limite uma batalha ativa por usuário/boss. As gravações filtram `user_id`, `boss_id`, `status`, sem o ID da batalha.

Se houver duplicatas ativas, o UPDATE alcança todas elas. Depois, `maybeSingle()` pode retornar erro de múltiplas linhas mesmo que o UPDATE tenha sido executado. Na hidratação, a normalização de uma linha antiga também pode atingir outra batalha ativa do mesmo boss.

Este risco foi identificado por inspeção; não foi verificado no banco de produção. Recomenda-se persistir o ID da batalha no contexto, filtrar por ele e garantir a unicidade adequada no servidor.

## 3. Falta de proteção contra mudar um dia já registrado

`recordDayAction` verifica o dia de calendário, mas não exige que o dia esteja pendente. Em teste, registrar sucesso e depois chamar a função com falha para o mesmo dia substitui o sucesso por falha.

Os botões ficam desabilitados durante sua própria gravação e a interface costuma ocultar a ação concluída. Isso não protege outra aba/aparelho com estado antigo nem chamadas concorrentes. A proteção precisa existir na persistência.

## 4. Mensagem e contador enganosos no painel

Após um golpe, `recordDayAction` define `currentDay = day + 1`, embora a batalha use dias de calendário. O painel exibe o dia seguinte ainda na mesma data. Teste confirmou esse comportamento.

Além disso, quando `getTodayBossAction` retorna null, o painel sempre mostra “Ação de hoje registrada — volte amanhã”. A função também pode retornar null porque a normalização calculou uma derrota, sem que a ação de hoje tenha sido registrada. Essa mensagem não comprova que o golpe foi salvo.

Recomendação: manter `currentDay` calculado pela data e exibir mensagens conforme o resultado real da batalha e do dia.

## 5. Início da batalha confirma antes de salvar

`startBattle` atualiza a memória e mostra “Batalha iniciada” antes de confirmar o INSERT. Se o INSERT falhar, apenas escreve no console; a batalha continua aparecendo localmente. Um golpe imediato também pode chegar ao UPDATE antes de o INSERT concluir.

O registro de golpe já aguarda o UPDATE e só mostra sucesso após retorno de uma linha. Portanto, nos quatro botões atuais, não foi encontrada inversão entre `true` e `false`. Uma falha de conexão ao salvar não deveria mostrar “Golpe aplicado”, mas pode deixar o dia pendente, que futuramente vira falha automática.

Recomendação: aguardar a criação da batalha e tratar erros visivelmente antes de permitir golpes.

## Datas e outras inconsistências

- Cálculo de datas usa `America/Sao_Paulo`; os helpers existentes passaram nos testes. A virada do dia ocorre à meia-noite desse fuso. Horário incorreto no aparelho pode afetar a normalização, pois depende do relógio do cliente.
- Normalização preserva dias já marcados como sucesso em sua própria cópia; o problema principal é usar uma cópia antiga e sobrescrever a versão do banco.
- Limite de falhas no contexto prioriza `boss.maxFails`; a tela prioriza `boss.rules.maxFails`. Se divergirem, a derrota pode ocorrer em um limite diferente do apresentado. Além disso, `Number(d.max_fails) || 3` transforma zero em três.
- Um dia antigo ainda pendente pode aparecer visualmente como falha no calendário antes da sincronização, por `visualStatus` em `BossDetail`.

## Validação realizada

Comando: `npm test -- src/contexts/BossContext.audit.test.tsx src/contexts/BossContext.test.ts`.

Resultado: 6 testes passaram. Os três testes novos documentam defeitos atuais, e não garantem que eles foram corrigidos: sobrescrita de sucesso por sessão antiga, substituição de sucesso por falha e avanço prematuro do contador. O teste de persistência usa Supabase simulado; não executa alterações em produção.

## Como confirmar os relatos de produção

Consultar as linhas do usuário afetado, incluindo `id`, `boss_id`, `status`, `started_at`, `created_at`, `days_history`. Verificar duplicatas ativas e comparar a data do relato com `completedAt`. Perguntar se usou outro aparelho/aba e se a falha apareceu após voltar no dia seguinte. Não inferir falha manual somente pelo status: os registros automáticos não possuem um campo de origem.

Para futuras ocorrências, registrar origem (`manual_success`, `manual_fail`, `automatic_missed_day`), ID da batalha, versão, horário do servidor e identificador da requisição. O schema disponível não oferece histórico de auditoria para reconstruir valores sobrescritos com certeza.

Consulta somente de leitura para duplicatas:

```sql
select user_id, boss_id, count(*) as active_battles
from public.boss_battles
where status = 'active'
group by user_id, boss_id
having count(*) > 1;
```

Priorizar proteção das gravações no banco, seguida da criação confirmada da batalha e das mensagens/contador. Não reclassificar falhas antigas em massa sem evidência do golpe original.
