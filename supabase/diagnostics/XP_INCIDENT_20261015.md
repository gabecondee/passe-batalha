# Investigação de XP — Martim, 15/10/2026

**Plano atualizado a pedido do responsável: 10.256 XP, nível 20.** Usar `martim_restore_10256.sql` em lugar do arquivo anterior de 10.000. O plano credita 10.056 XP sobre a abertura auditada de 200, ou somente os 256 restantes se a reposição anterior de 10.000 já foi aplicada. Preserva ganhos posteriores e não duplica o crédito ao repetir. As políticas anteriores abaixo documentam a investigação e os testes; não são o plano atual.

## Evidências do banco fornecidas pelo responsável

Usuário `6f4ef628-2f6d-4d12-a5d1-0c800778b2be`:

- Último nível visto: 19; saldo salvo: 200 XP, nível 2.
- 186 ações diárias: 1.680 XP nominais; 24 conquistas: 870 XP; dois treinos completos: 20 XP.
- Uma batalha perdida, com penalidade configurada de 500 XP exclusivamente espirituais.
- Saldo por área: física 10, mental 50, espiritual 20, profissional 35, financeira 85.
- As regras atuais reconstruiriam créditos físicos de 160, mentais de 810, profissionais de 960 e financeiros de 540. A penalidade espiritual não explica as diferenças nas outras áreas.
- A versão da tabela de níveis não mudou desde o primeiro commit. Nível 19 requer 7.982 XP; nível 20 requer 9.419 XP. Não há prova do nível 20 neste material.

O banco não guardava o histórico das atualizações de saldo. Não é possível atribuir com certeza uma requisição específica à perda histórica, nem recuperar o total exato ou a distribuição antiga por área. Também podem ter existido regras de crédito diferentes e atividades removidas.

## Falhas verificadas no código anterior

1. `GameContext.addAttributeXp`, `applyBossReward` e `applyBossPenalty` calculavam um saldo absoluto em memória e faziam `UPDATE profiles SET xp_area = saldo`. Dois clientes partindo de 200 e creditando 20 e 30 podem terminar em 220 ou 230, em vez de 250. Respostas/gravações fora de ordem numa mesma sessão têm o mesmo problema. Não havia incremento transacional nem proteção contra substituição por saldo antigo.
2. Missão diária, conquista e treino eram persistidos separadamente do crédito. Se a segunda requisição falhasse, o registro existia sem o XP. Uma repetição da ação já marcada não recuperava o crédito.
3. Conquistas usavam `upsert(ignoreDuplicates: true)` e pagavam no frontend mesmo quando outra aba/hook já tinha inserido a mesma conquista. O saldo podia subir artificialmente na sessão. Falhas de persistência eram registradas apenas no console.
4. Treinos creditavam XP antes de verificar o salvamento do histórico. Isso também permitia uma recompensa aparente sem registro confirmado.
5. Recompensas e penalidades de boss eram processadas na página de detalhes. `rewardsProcessed` ficava em memória e era inferido como verdadeiro ao carregar uma batalha encerrada. Não era prova de liquidação financeira.
6. O carregamento de `GameContext` dependia do objeto inteiro de autenticação: renovação de sessão podia recarregar snapshots antigos e zerar skills. Skills de XP local eram somadas ao nível, mas suas alterações não eram persistidas. A página atual de Skills é somente leitura para XP, portanto este caminho não comprova a causa do caso do Martim.
7. No código anterior ao commit `9a05949`, concluir uma missão alterava somente o estado React. Isso é compatível com conquistas de missões concluídas coexistirem com zero missões concluídas no banco. Esse problema já tinha sido corrigido naquele commit. Não há informação para identificar quais missões antigas estavam concluídas.

São mecanismos de falha confirmados no código, com cenários cobertos em testes locais. Não constituem prova de qual deles ocorreu na conta histórica.

## Correção implementada

Migration `20261015_atomic_xp_ledger.sql`:

- Preserva todos os saldos existentes; registra uma abertura e marca fontes antigas sem repagar atividades históricas.
- Bloqueia gravações concorrentes durante a instalação para tornar consistente a abertura.
- Credita a missão, conquista e treino por triggers na mesma transação do registro da atividade.
- Liquida cada batalha uma vez, inclusive quando encerrada fora da página de detalhes.
- Bloqueia a linha do perfil, calcula sobre o saldo atual e registra valor solicitado, valor efetivo, saldo resultante, origem e configuração do boss.
- Impede que clientes sobrescrevam saldos diretamente e que alterem o extrato. Leitura do extrato é restrita ao dono por RLS.
- Penalidades preservam o piso zero por área. O XP inicial do onboarding continua separado.
- Não credita recompensa adicional pelo simples estado `completed` de missão, seguindo o código atual; são as ações diárias que recebem XP.
- A recompensa de treino de 10 XP passa a valer para qualquer conclusão persistida como `success`, inclusive pela Agenda. Antes, o crédito dependia da tela usada.
- Não permite encerrar um boss sem configuração no banco; a transação falha, em vez de inventar valores.

Frontend:

- O nível usa apenas saldos confirmados do banco. Remove a API não utilizada de XP de skills em memória.
- Recarrega o saldo após atividades, repetição confirmada, foco e retorno da conexão.
- Ignora respostas antigas e resultados de outra conta; preserva o último saldo confirmado em falha de leitura e oferece repetição.
- Não paga conquistas antes do banco confirmar e não deriva novos desbloqueios enquanto o saldo inicial não carregar.
- Treinos e abandono de boss só confirmam sucesso após o banco confirmar.

Os requisitos de desbloqueio de conquistas continuam sendo avaliados no frontend, como antes. A migration garante pagamento único e persistência atômica; não é uma reimplementação de todos os requisitos no servidor.

## Recuperação revisável

`martim_recovery_preview.sql` termina em **ROLLBACK**. Pode ser executado para simular sem alterar a conta permanentemente.

| Política | Resultado sobre o snapshot enviado | Natureza |
| --- | --- | --- |
| `atividades` (padrão) | 2.490 XP, nível 11 | Recompõe pisos nominais por área; mantém os 20 XP espirituais, pois o débito efetivo antigo é desconhecido. |
| `piso19` | 7.982 XP, nível 19 | Acrescenta compensação administrativa até o mínimo do último nível visto. Distribuição adicional proporcional aos créditos nominais; não representa distribuição histórica recuperada. |
| `relato10000` (critério escolhido na continuação da investigação) | 10.000 XP, nível 20 | Compensação baseada no relato do usuário. Acréscimo de 9.800 XP ao snapshot auditado; distribuição estimada pelas atividades. |

Após a apresentação dos cenários, o responsável reiterou que o usuário relatou 10.000 XP e nível 20. Foi preparado `martim_restore_10000.sql` para efetivar esse critério com **COMMIT**, sem pressupor prova histórica do valor. O script compartilha as proteções da prévia e preserva créditos posteriores à abertura; por exemplo, 20 XP novos resultam em 10.020 XP após a compensação. Nenhuma reposição foi executada no banco de produção pelo agente.

Pisos do primeiro plano: física 160, mental 810, espiritual 20, profissional 960 e financeira 540. Acréscimo total: 2.290 XP.

Não usar o resumo simplificado de 2.070 XP como saldo correto: ele subtrai 500 XP do total sem simular a limitação da penalidade à área espiritual.

A recuperação exige que a abertura da migration corresponda ao snapshot auditado de 200 XP. Se houver diferença, ela aborta para revisão. Créditos ganhos depois da abertura são preservados por acréscimos, sem substituir saldos. Repetir o mesmo plano não paga duas vezes. Trocar de política depois de aplicar uma exige revisão e um novo ajuste administrativo.

Os saldos anteriores e os acréscimos ficam no extrato. A recuperação não altera missões, datas, conquistas, batalhas ou onboarding e não pretende recuperar dados que não foram persistidos.

## Aplicação em produção

1. Executar `20261015_atomic_xp_ledger.sql` uma vez e depois `20261015_xp_read_consistency.sql` no SQL Editor administrativo. Não publicar primeiro o frontend: ele verifica a presença e habilitação dos triggers e depende das duas migrations. Conferir a instalação com `xp_installation_check.sql`.
2. Publicar a aplicação corrigida. Abas/PWAs antigos podem tentar gravar saldos absolutos e receberão erro; o banco estará protegido. Reabrir o app atualizado para sincronizar.
3. Executar a prévia de recuperação, escolher a política e revisar `ANTES`, `recovery_plan`, `SIMULACAO_DEPOIS` e os lançamentos.
4. Para efetivar o plano revisado, trocar apenas o **último** `ROLLBACK;` por `COMMIT;` e executar o script inteiro novamente.
   Para o critério escolhido de 10.000 XP, `martim_restore_10000.sql` já está preenchido e termina em COMMIT. Para simular esse arquivo específico, trocar o último COMMIT por ROLLBACK.
5. Validar o saldo e o nível no app após recarregar e consultar `user_xp_ledger.sql` (divergência deve ser zero).

Nenhuma migration ou restauração foi executada no Supabase de produção durante esta investigação. O ambiente local tem a chave pública do app, sem uma conexão administrativa de banco configurada.

## Validação local

- Testes de regressão React: saldo mantido em renovação de sessão, falha de leitura, respostas fora de ordem, troca de usuário, repetição de ação e confirmação de persistência.
- PostgreSQL isolado (PGlite): abertura, fontes históricas sem repagamento, créditos acumulados, repetições, proteção contra saldo antigo, rollback da atividade quando XP falha, penalidade restrita à área, liquidação única de boss, distribuição 30/70, permissões e catálogo de 109 conquistas.
- Prévia dos dois planos de recuperação, rollback integral, efetivação repetível sem duplicação e preservação de créditos posteriores.
- Build de produção. O projeto possui erros preexistentes na verificação TypeScript global, especialmente pelo schema gerado incompleto de tabelas; não foi feita uma regeneração geral de tipos nesta correção.

Comandos:

```powershell
npm.cmd test
npm.cmd run build
node scripts/test-xp-ledger.mjs .tmp/xp-tools/node_modules/@electric-sql/pglite/dist/index.js
```

PGlite é somente uma dependência temporária local de validação; não entra no bundle nem nas dependências da aplicação.

A conferência complementar dos caminhos de XP, incluindo ranking, Agenda e os limites da validação, está documentada em `XP_FLOW_AUDIT_20261015.md`.
