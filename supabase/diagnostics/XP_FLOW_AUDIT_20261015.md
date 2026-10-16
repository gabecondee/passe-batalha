# Conferência dos caminhos de XP — 15/10/2026

## Escopo e evidência

Revisão estática das referências a XP e nível em `src`, das rotas em `App.tsx`, das funções em `supabase/functions` e dos schemas/migrations SQL do repositório. As rotas de leitura e escrita abaixo foram seguidas até sua fonte; foram adicionados testes de regressão dos componentes/hook, serviços e banco isolado.

Isso não equivale a navegar autenticado por todas as telas de produção, nem a inspecionar as funções e triggers realmente instaladas no Supabase. Não há conexão administrativa de produção neste ambiente. O script `xp_installation_check.sql` permite conferir a instalação e reconciliar saldos após as migrations.

## Fonte do saldo e do histórico

- `profiles.xp_physical`, `xp_mental`, `xp_spiritual`, `xp_professional`, `xp_financial`: saldo de progressão confirmado.
- `xp_events`: extrato com origem, valor solicitado, valor efetivo e saldo resultante. A função privada atualiza extrato e perfil na mesma transação da atividade.
- O app lê o saldo materializado em `profiles`; não soma todo o extrato a cada renderização. Não são dois saldos independentes.
- `user_attributes.initial_xp`: avaliação inicial, separada e persistida, que pode aparecer nos totais de atributos. Não aumenta o nível nem gera um lançamento de ganho de progressão.
- `profiles.total_xp` e os campos legados de nível não são fonte de progressão do app. A view opcional `global_ranking` foi corrigida para não depender de `profiles.total_xp`.
- O extrato contém abertura e marcadores de fontes antigas. Não recupera lançamentos históricos que nunca foram salvos.

## Leituras verificadas

| Tela/uso | Caminho atual |
| --- | --- |
| Home, personagem, perfil, inventário, central de configurações e estatísticas | `GameContext` → `useXpBalance` → saldos de `profiles`; cartões gerais mostram XP de progressão. |
| Barras e nível do personagem e das áreas | `getLevelInfo`, mesma tabela oficial; removido o cálculo independente de barra por módulo 500 no perfil. |
| Radar e detalhes de áreas | Atributos do `GameContext`; incluem avaliação inicial, identificada separadamente do XP que sobe nível. |
| Ranking, posição nas estatísticas e requisitos de conquistas de ranking | `useGlobalRanking` compartilhado; perfis reais e `progressionXp`; desempate por ofensiva/data/ID. Nenhum ranking fictício para conceder conquistas. |
| View SQL `global_ranking`, quando instalada | Soma dos mesmos cinco saldos, respeitando RLS. |
| Missões e bosses — recompensa anunciada | Configuração/estimativa da atividade. Não é um saldo nem prova de pagamento. O resumo de missão explica que o XP é pago por ação diária. |
| XP de conquistas nas estatísticas | Total nominal das conquistas com desbloqueio registrado, rotulado como nominal. Não representa um extrato de créditos históricos. |
| Exportação da conta | O exportador existente continua sendo uma cópia de localStorage. Não deve ser usado como backup de XP; o saldo/extrato autoritativos estão no banco. |

O carregamento inicial aguarda saldo, controle no banco e dados do perfil. Erros mostram repetição, sem exibir um personagem fictício de zero XP como progresso carregado. Renovação de token do mesmo usuário não reinicia o perfil.

## Escritas verificadas

| Origem | Registro confirmado | Controle de XP |
| --- | --- | --- |
| Ação diária em Home ou Missões | `missions.completed_dates`, via `useMissionPersistence` | `credit_mission_xp`: uma origem por missão/data, 5/10/20/35/50 XP conforme dificuldade. |
| Conquista, inclusive por diário, dieta, finanças, check-in, loja e ranking | `user_achievements`, via `useAchievementsData` | `credit_achievement_xp`: recompensa do catálogo no servidor, uma por usuário/conquista. |
| Treino na tela de treino | `workout_logs`, via `confirmWorkout` | `credit_workout_xp`: 10 XP por registro completo, uma vez por ID. O chamador mantém o ID nas repetições. |
| Treino concluído pela Agenda | Mesmo serviço e tabela da tela de treino | Mesmo trigger; a Agenda agora confirma a gravação e emite os eventos para atualizar o saldo exibido. |
| Vitória, derrota, abandono e encerramento automático de boss | `boss_battles`, via `BossContext` | `settle_boss_xp`: uma liquidação por batalha, distribuição da configuração e piso zero por área na penalidade. |
| Compensação do Martim | Script administrativo específico | `record_xp_event`, com motivo e valor; repetição não duplica o ajuste. |
| Onboarding | `user_attributes.initial_xp` | Configuração inicial separada; nenhum crédito de progressão e nenhum reset de saldo ganho. |

Concluir uma missão não paga seu `xp_reward` novamente. Excluir uma missão não remove XP já ganho ou o lançamento do extrato. Uma gravação atrasada de treino não pode reabrir um registro de sucesso. Diário, dieta, finanças, loja, agenda manual e check-in não têm crédito direto de XP no código atual; seus desbloqueios de conquistas usam a origem de conquistas acima. A energia e os fragmentos são sistemas distintos.

Não foram encontrados updates de saldos de progressão pelo frontend ou pelas Edge Functions. A geração de bosses salva parâmetros de recompensa, sem creditar XP ao jogador.

## Caminhos antigos removidos ou corrigidos nesta conferência

- Removidos `useSkills`, `useMissions` e `missionXpCalculator`, sem consumidores nas rotas. Mantinham progressão em memória, mensagens de recompensa sem persistência e uma tabela de recompensas incompatível com as ações diárias.
- Removida a consulta a ranking fictício para requisitos de conquistas e estatísticas.
- Unificado o XP de progressão nos cartões gerais; a avaliação inicial continua nos atributos e está identificada.
- Agenda e treino usam o mesmo serviço de confirmação, IDs estáveis por tentativa e eventos após o banco confirmar.
- Adicionada checagem de implantação: `xp_control_status()` verifica os seis triggers esperados. Sem o controle instalado/habilitado, o app atualizado bloqueia o carregamento de progresso e as ações até uma tentativa bem-sucedida.

## Limites da garantia

- Os requisitos completos de conquistas continuam sendo avaliados no frontend. A revisão corrigiu o ranking fictício, mas não converteu todos os requisitos/contadores de hábitos em regras de elegibilidade no servidor. O catálogo e o pagamento único são controlados no banco.
- Treinos são deduplicados por ID de registro. Duas sessões que criem registros diferentes não são consideradas a mesma atividade pelo extrato. Impedir duplicatas lógicas por dia/treino exigiria uma regra de unicidade de produto adicional, incluindo tratamento de registros históricos duplicados.
- Um administrador ou serviço privilegiado ainda pode executar SQL direto e alterar saldos fora do método. Para manter o extrato, deve usar `record_xp_event`. O diagnóstico acusa divergências de saldo/extrato.
- Não é possível inferir com certeza o XP histórico que nunca foi persistido; reposições antigas continuam separadas da correção estrutural.
- A revisão não é uma auditoria integral de todas as funcionalidades, permissões e regras de negócio do produto. Cobre os caminhos de XP identificados no código e as regressões exercitadas localmente.

## Implantação atualizada

Aplicar nesta ordem, antes de publicar o frontend:

1. `20261015_atomic_xp_ledger.sql` (uma vez).
2. `20261015_xp_read_consistency.sql` (complementar; pode ser repetida).
3. Executar `xp_installation_check.sql`: seis triggers habilitados, permissão de verificação verdadeira, permissão de crédito arbitrário falsa e nenhuma divergência.
4. Publicar a versão atualizada; reabrir o app/PWA.
5. Confirmar uma ação diária/treino e recarregar: saldo deve permanecer, e repetir a mesma origem não deve gerar outro pagamento.
6. Aplicar a compensação do Martim separadamente, após revisar sua simulação. O plano mais recente é `martim_restore_10256.sql` (10.256 XP), substituindo o de 10.000; contempla também o acréscimo de 256 se o anterior já foi aplicado.

O build foi gerado localmente, mas nenhuma dessas alterações foi aplicada ao banco nem publicada durante a revisão.
