# Investigação de recorrência — 15/10/2026

## Limite da conclusão

O usuário informou uma correção manual em uma batalha específica, trocando todo `fail` por `success`, reativando a batalha e compensando XP. O histórico resultante, sozinho, não comprova a origem das falhas anteriores. Não houve acesso autenticado direto às batalhas privadas; os resultados de produção abaixo foram fornecidos pelo usuário após executar o diagnóstico.

A versão local contém a correção de sobrescrita por compare-and-swap e o diálogo de confirmação. O Git registra essas mudanças no commit `9232dbe`. Isso não comprova a versão aberta em cada PWA nem a aplicação da migration no Supabase.

## Defeito reproduzido e corrigido: um dia antigo bloqueia o atual

Tanto o painel (`getTodayBossAction`) quanto o calendário em `BossDetail` verificavam se **qualquer** `completedAt` caía na data de hoje. Ao encontrar um, bloqueavam o golpe do dia atual, mesmo que ele ainda estivesse pendente.

Reprodução: batalha iniciada em 12/10; dia 1 com status success e `completedAt = 2026-10-13T04:00:00Z`; dia 2 pendente; data atual 13/10. O painel retornava null em vez da ação do dia 2. No dia seguinte, o dia 2 pendente pode ser convertido automaticamente em falha.

Esse dado pode aparecer em históricos legados ou reparos. Versões anteriores geravam falhas automáticas com o fim do dia no fuso do aparelho, que pode cair na data seguinte em São Paulo. O SQL informado troca somente o status, preservando `completedAt`: não cria necessariamente o problema, mas também não elimina uma inconsistência existente.

Correção feita: disponibilidade depende do número e do status do dia da batalha. Horários de outros dias não bloqueiam o dia pendente. Um timestamp inválido em outro dia também não pode mais derrubar essa consulta com `RangeError`.

Isso **não** comprova que o caso informado tenha exatamente esse horário; a consulta de diagnóstico verifica esse ponto.

## Outro defeito reproduzido e corrigido: dias como texto

Os dias de campanhas geradas por IA não tinham validação de numeração. Históricos JSON podem conter `"day": "1"`, embora o TypeScript declare number. A comparação estrita com 1 escondia o botão ou impedia a gravação.

Reprodução: histórico normal de 30 dias com rótulos numéricos em texto. A ação do dia atual era null. Agora as comparações aceitam rótulos numéricos em texto, preservando a representação original no banco para não reescrever dias já imutáveis. Novas campanhas são numeradas de 1 a N na criação, em vez de confiar nos rótulos da IA.

Não há evidência de que esse usuário tenha dias em texto; é outro defeito real encontrado na investigação. Dia ausente ou duplicado em histórico existente continua exigindo diagnóstico e reparo específico.

## Proteção do banco: ausência confirmada pelo diagnóstico fornecido

A migration é `supabase/migrations/20261013_protect_recorded_boss_days.sql`. Ela adiciona o trigger `protect_recorded_boss_days`; um arquivo versionado não significa migration aplicada.

A consulta 1 retornou sem linhas, confirmando que a tabela consultada não possui triggers de usuário, incluindo `protect_recorded_boss_days`. Portanto, a proteção preparada em 13/10 não está instalada nesse banco. O trigger original bloqueia também reparos administrativos de dias confirmados. Antes de aplicar em produção, considerar esse efeito no procedimento de suporte.

Sem essa proteção, versões antigas do app ainda podem substituir o histórico inteiro por uma cópia desatualizada. O cliente atual usa ID e comparação do histórico; a proteção do banco é necessária para proteger também contra versões antigas.

## Fragilidade ainda existente: relógio do cliente

A conversão automática de pending para fail usa `new Date()` do aparelho. O fuso São Paulo está explícito, mas isso não corrige um relógio adiantado. Um aparelho adiantado pode gravar como perdidos dias que ainda não acabaram no servidor. O trigger de imutabilidade preserva sucessos já salvos, mas não valida a data real para dias anteriormente pendentes.

Recomendação de próxima mudança estrutural: registrar golpes e normalizar dias em uma função transacional no banco, usando horário do servidor, bloqueio da linha e auditoria (origem manual/automática, resultado anterior, resultado novo, horário e ID da tentativa). O loading, sozinho, não resolve esse problema. Essa transferência para o servidor não foi implementada nesta investigação.

## Verificações executadas

- Os três testes novos falharam antes das mudanças e passaram depois: horário legado bloqueando dia atual, timestamp inválido causando crash, dia numérico em texto impedindo ação.
- 13 testes dos bosses passaram após as mudanças (Supabase simulado).
- O script `scripts/audit-boss-requests.mjs` faz somente GET e não imprime credenciais/históricos privados. O acesso público retornou HTTP 200, sem bosses visíveis. Não permite concluir que o banco está vazio nem que a proteção está aplicada.
- Um GET para um ID inexistente com amostra de 30 tarefas locais e filtro JSON codificado com 5.799 bytes retornou 200. Não foi reproduzida rejeição por tamanho de URL nessa amostra; ela não cobre campanhas personalizadas maiores.

## Resultados de produção fornecidos pelo usuário

- Consulta 1 sem linhas: proteção por trigger ausente.
- Consulta 2: servidor em 15/10/2026, batalha no dia 21, iniciada em 25/09/2026. A numeração do calendário está correta nesse momento.
- Consulta 3: dia 21 como success, registrado em `2026-10-15T21:59:56.447Z`, equivalente a 18:59:56 em São Paulo. Hoje foi salvo corretamente.
- Dias 2 (26/09), 19 (13/10) e 20 (14/10): `completedAt` no formato `YYYY-MM-DDT12:00:00.000`, sem fuso. É o formato produzido pela normalização automática atual para um dia pendente convertido em fail. Como o UPDATE manual preservou `completedAt`, os sucessos atuais desses dias não comprovam registro manual original do golpe. O formato é evidência compatível com processamento automático; não identifica sozinho o motivo de o dia estar pendente.
- As datas dos demais registros com fuso correspondem aos respectivos dias do calendário. Não foi encontrada, nesse resultado, a divergência de data que reproduziu o bloqueio por `actedToday`. A correção do defeito continua válida, mas não se deve atribuir este caso a ele.
- `completed_date_sao_paulo = null` nos três registros sem fuso é uma escolha da consulta (não converter data ambígua), não sinal de que o banco perdeu a data.
- Consulta 4: uma única batalha ativa para `boss-morthzul`. Não há duplicação ativa desse boss no resultado fornecido.
- Não foi fornecido resultado da consulta 3b sobre tipo dos rótulos dos dias; não concluir que há dias em texto nessa batalha.

Conclusão: há uma lacuna confirmada de proteção no banco e evidência de processamento automático nos dias corrigidos. Não é possível distinguir, pelo histórico atual, entre golpe não persistido, sobrescrita por cliente antigo ou outra causa anterior ao reparo. Não afirmar que a causa individual já está provada.

## Próximos passos de produção

Executar `supabase/diagnostics/boss_report_20261015.sql` no SQL Editor e examinar os resultados. É somente leitura e já contém os IDs fornecidos no relato. Verifica triggers, dia calculado pelo servidor, datas dos registros, representação dos números e batalhas ativas simultâneas.

Aplicar a migration de proteção após avaliar o procedimento de suporte, publicar as correções do cliente e validar com duas sessões. Para tratar a fragilidade do relógio e identificar novas ocorrências, mover a operação para o servidor com auditoria. Ainda falta confirmar a versão usada no aparelho e se o usuário viu a confirmação de salvamento nos dias afetados. Nenhum dado de usuário ou XP foi alterado por esta investigação. Não aplicar outra correção em massa sem identificar quais dias foram efetivamente cumpridos.

## Decisão posterior do proprietário sobre correções administrativas

O proprietário pediu correção direta, sem motivo e sem log adicional. Foi preparada a migration independente `20261015_allow_owner_boss_corrections.sql`: mantém a proteção para o app e permite UPDATE direto pelos papéis de banco `postgres`/`supabase_admin`. Ela substitui a recomendação de aplicar somente a migration original de 13/10, cuja versão bloquearia também o proprietário. A migration nova não foi aplicada remotamente. Procedimento e limites em `docs/correcao-administrativa-boss.md`.

## Cancelamento da mudança de horário para o servidor

Em 15/10/2026, o proprietário cancelou a transferência do relógio e das gravações para RPCs no servidor, por considerar os ajustes anteriores suficientes nesta etapa. A implementação e a migration dessa transferência foram removidas do projeto. Foram preservados o loading, a confirmação de gravação, a tentativa segura, a comparação de histórico e os ajustes de compatibilidade de dias/horários legados. A normalização continua usando o relógio do aparelho com o fuso São Paulo. Nenhuma migration da transferência foi aplicada por esta tarefa no banco remoto.
