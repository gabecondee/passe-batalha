# Relatório de Auditoria — Passe de Batalha

Data: 2026-07-12
Escopo: integração e sincronização entre todas as áreas do app (XP, Skills, Missões, Agenda, Diário, Dieta, Treinos, Finanças, Conquistas, Fragmentos, Inventário, Dashboard, Ranking, Estatísticas, Perfil).

## Correções aplicadas nesta rodada

### 1. Barramento de eventos central
- **Novo:** `src/lib/eventBus.ts` com tipos fortes para todos os eventos de domínio (`xp:gained`, `mission:*`, `journal:*`, `meal:logged`, `workout:completed`, `finance:changed`, `fragments:changed`, `achievement:unlocked`, `agenda:event-completed`).
- Hooks: `useBusEvent`, `useBusEventType`.

### 2. Sistema de Missões
- `GameContext.createMission`, `completeMission` e `deleteMission` agora emitem eventos no barramento.
- `completeMission` também emite `xp:gained` com área correta — Skills, Dashboard, Ranking e Conquistas reagem em cascata.

### 3. Fragmentos como fonte única
- `useStreakReward` agora dispara `streak-reward:sync` em cada escrita, e todas as instâncias do hook (Dashboard, Inventário, Loja, Configurações, Conquistas) refletem o novo saldo imediatamente.
- **Novo:** função `addFragments(amount, reason)` — usada por conquistas para creditar fragmentos sem depender de check-in.

### 4. Conquistas realmente recompensam
- `useAchievementsData` ao detectar novo desbloqueio:
  - Credita **XP** na área correta via `applyBossReward` (única fonte de níveis).
  - Credita **Fragmentos** proporcionais ao XP (mín. 5, máx. 500).
  - Emite `achievement:unlocked` no barramento.
  - Enfileira popup existente.
- Também reavalia estatísticas ao receber qualquer evento relevante do barramento.

### 5. Contadores globais de progresso
- **Diário:** `useJournal` grava `journal_entries_count` em cada criação/exclusão e emite `journal:entry-added|deleted`. Antes o contador nunca era escrito e as conquistas de escrita ficavam presas em 0.
- **Dieta:** `useMeals.addFood` marca a data no set `diet_days_set_v1`, atualiza `diet_days_followed` e emite `meal:logged`.
- **Treinos:** `saveDayWorkout` detecta quando todos os sets do dia estão concluídos, incrementa `trainings_completed` uma única vez por (data, dia) e emite `workout:completed`.

### 6. Finanças passam a ser globais
- `useFinances` migrado para `localStorage` (`passe_finances_v1`) com evento `finances:sync`. Antes cada página instanciava um estado local e as transações registradas em uma tela não apareciam nas outras.
- Cada mutação emite `finance:changed` com o novo saldo.

### 7. Ranking reativo
- Já derivava do `user.totalXP` do `GameContext` — validado. Novos ganhos de XP (missões, conquistas, boss, skills) reordenam automaticamente.

## Integrações já funcionando corretamente

- Dashboard, Skills e Radar consomem `attributes` do `GameContext` (memoizados) e reagem a qualquer mutação de skill/atributo.
- `applyBossReward` / `applyBossPenalty` alimentam os mesmos atributos que o Dashboard e o Ranking leem.
- Level up global é detectado por comparação de nível anterior no `GameContext` e dispara a tela de comemoração.
- Agenda lê missões do `GameContext`; missões com `deadline` já aparecem no calendário.
- Boss Battles: vitórias/derrotas atualizam `useAchievementsData.bossesDefeated`.

## Pontos remanescentes (recomendações futuras)

1. **Popup global de conquistas.** Hoje o popup só aparece quando o usuário está na aba Conquistas ou Estatísticas (que instanciam o hook). Recomenda-se extrair `useAchievementsData` para um `AchievementsProvider` em `App.tsx` e renderizar o `UnlockDialog` no `MainLayout`, permitindo que a notificação apareça em qualquer tela.
2. **Persistência em Cloud.** `useJournal`, `useMeals`, `useFinances`, `useStreakReward` e `workoutStorage` ainda usam apenas `localStorage`. Migrar para tabelas Supabase com RLS por usuário quando o app entrar em produção multiusuário — isso também alimenta o Ranking global real.
3. **Ranking global real.** A lista base ainda vem de `mockData.ranking`. Quando houver auth ativa, substituir por consulta a uma view materializada `public.ranking_global` ordenada por `total_xp`.
4. **Streak universal (não só check-in).** Journal, Meal, Workout já emitem eventos que poderiam alimentar streaks específicos (`journal_streak`, `diet_streak`, `training_streak`). Hoje só o streak diário do check-in é rastreado.
5. **Duplicação `useMissions` legado.** `src/hooks/useMissions.ts` não é mais consumido em telas ativas — pode ser removido em uma limpeza futura para eliminar confusão de fonte de verdade.
6. **`applyBossReward/Penalty` para skills.** Continua usando `xp/100` (compatível com `XP_PER_LEVEL` das skills). Se o sistema de níveis de skill mudar, alinhar com `getLevelInfo`.
7. **Perfil global.** `ProfileSettings` grava em `localStorage` (`user_name`, `user_avatar`). `GameContext` só relê o nome/avatar na inicialização — mudanças em outras telas requerem um refresh para propagar. Recomenda-se expor `setName` no contexto (já existe `updateAvatar`).
8. **Agenda ↔ missões vinculadas.** Estrutura atual permite exibir a missão, mas não há campo cruzado `agendaEventId` na missão. Ao concluir um evento de agenda, hoje não há como fechar a missão associada automaticamente.

## Cuidados respeitados

- Nenhuma funcionalidade foi removida.
- Identidade visual (preto + dourado, Orbitron/Inter) preservada.
- Regras de negócio (níveis, dificuldade, streaks, custos da loja) intactas.
- Dados persistidos em `localStorage` foram preservados; novas chaves só adicionam informação.
- Reaproveitados hooks e contextos existentes; apenas o `eventBus` foi criado.
