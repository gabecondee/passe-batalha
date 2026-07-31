# Auditoria de Integração — Passe de Batalha

Objetivo: garantir que XP, Fragmentos, Skills, Missões, Agenda, Diário, Dieta, Treinos, Finanças, Conquistas, Ranking, Inventário, Dashboard e Estatísticas funcionem como um único ecossistema reativo, sem quebrar a identidade visual nem a lógica de negócio.

## Fase 1 — Mapeamento (somente leitura)

Ler e mapear estados/fontes de verdade atuais para evitar retrabalho:
- `GameContext` (user, skills, attributes, missions, XP)
- `BossContext` (batalhas, vitórias/derrotas)
- Hooks: `useStreakReward` (fragments, streak), `useAchievementsData` (conquistas), `useAgenda`, `useJournal`, `useMeals`, `useFinances`, `useSkills`, `useMissions` (legado), `useAchievements`
- Páginas: Dashboard, Skills, Missions, Agenda, Journal, Diet, Training, Resources (Finanças), Ranking, Inventory, Shop, Achievements, Settings/*
- Storage: chaves em `localStorage` e tabelas Supabase (`user_achievements`, `user_streaks`, `achievements`)

Entregável: lista dos pontos onde cada estado é lido/escrito, para identificar duplicações e dessincronizações.

## Fase 2 — Unificação de fontes de verdade

Problemas conhecidos a corrigir:
1. Existem dois sistemas de missões (`GameContext.missions` e `useMissions.ts` legado). Consolidar tudo no `GameContext` e remover leituras de `useMissions` onde ainda houver.
2. `applyBossReward` / `applyBossPenalty` recalculam nível por `xp/100` em vez de `getLevelInfo` — alinhar com o sistema oficial de leveling.
3. Fragmentos, streak e histórico vivem só em `localStorage` via `useStreakReward`. Criar hook central `useEconomy` (fragmentos + histórico) reutilizado por Shop, Inventário, Dashboard, Estatísticas e Conquistas.
4. Conquistas hoje só marcam desbloqueio; não creditam XP nem Fragmentos. Passar a chamar `applyBossReward`/`useEconomy.addFragments` quando desbloquear e disparar popup único.

## Fase 3 — Barramento de eventos

Criar `src/lib/eventBus.ts` (EventTarget simples) com eventos:
- `xp:gained` `{ area, amount, source }`
- `mission:completed|created|deleted`
- `journal:entry-added`
- `meal:logged`
- `workout:completed`
- `finance:changed`
- `agenda:event-completed`
- `fragments:changed`
- `achievement:unlocked`

Cada hook/contexto emite ao mutar. `useAchievementsData` e `StatisticsSettings` escutam e reavaliam automaticamente (sem refresh manual). Ranking recomputa posição do usuário em `xp:gained`.

## Fase 4 — Integrações específicas

- **Missões**: ao concluir, além do XP já dado, emitir `xp:gained` por área → atualiza Skills (via bonus por atributo), Dashboard, Ranking, Conquistas, Fragmentos (recompensa por dificuldade), Agenda (marcar item vinculado).
- **Skills**: `addXpToSkill` e `applyBossReward` passam a emitir `xp:gained`.
- **Agenda**: ao concluir compromisso vinculado a missão, delega para `completeMission`. Ao criar evento com data, aparece na Agenda automaticamente (já ocorre — validar).
- **Diário**: emitir `journal:entry-added` → conquistas de escrita, estatísticas, streak de escrita.
- **Dieta**: registrar refeição emite `meal:logged` → conquistas de consistência, streak alimentar, estatísticas.
- **Treinos**: concluir treino emite `workout:completed` → XP físico, streak, conquistas, fragmentos.
- **Finanças**: cada transação emite `finance:changed` → resumo, saldo, conquistas de disciplina financeira.
- **Conquistas**: ao desbloquear, dispara popup, credita XP na área correspondente (via `applyBossReward`) e Fragmentos (via `useEconomy`).
- **Ranking**: derivar posição em tempo real do `user.totalXP` (o ranking global de outros usuários fica com mock enquanto não há usuários; a lógica de ordenação/atualização já reage a mudanças do usuário).
- **Inventário e Dashboard**: passar a ler Fragmentos, XP, nível e investimentos de fontes únicas (`GameContext` + `useEconomy`).
- **Perfil (Settings)**: `ProfileSettings` já persiste em `localStorage`; garantir que Dashboard, Ranking e Sidebar reagem a mudanças (usar `updateAvatar`/`setName` no contexto, não só `localStorage`).

## Fase 5 — Validação

- Percorrer manualmente via Playwright os fluxos: criar/concluir/excluir missão → conferir XP, Skills, Dashboard, Ranking, Conquistas, Fragmentos, Estatísticas.
- Registrar entrada no diário → conferir contador, conquistas, streak.
- Concluir treino → conferir XP físico, streak, fragmentos.
- Registrar transação → conferir saldo, resumo, conquistas.
- Desbloquear conquista de teste → conferir popup, XP creditado, fragmentos creditados, inventário.
- Editar perfil → conferir Dashboard, Sidebar, Ranking.

## Fase 6 — Relatório final

Documento em `docs/audit-report.md` com:
- Integrações auditadas e status (OK / corrigido / pendente)
- Problemas encontrados e correções aplicadas
- Sugestões futuras (migrar `localStorage` para Supabase, índices, memoização adicional)

## Escopo / restrições

- Não altera identidade visual nem regras de negócio.
- Não remove funcionalidades.
- Reaproveita hooks e contextos existentes; cria apenas `eventBus` e `useEconomy`.
- Preserva dados em `localStorage` (migrações de chave, se necessárias, com fallback).

## Detalhes técnicos

- `eventBus`: singleton baseado em `EventTarget` + hook `useBusEvent(name, handler)` com cleanup.
- `useEconomy`: encapsula leitura/escrita de `total_fragments`, `fragment_history`, `shop_purchases`, expõe `balance`, `add(amount, reason)`, `spend(...)`, `history`.
- `getLevelInfo` passa a ser a única função de cálculo de nível em todo o app (remover `Math.floor(xp/100)` residual em `GameContext.applyBossReward/Penalty`).
- `useAchievementsData` reavalia em cada evento relevante em vez de depender de renderização.

## Estimativa

Alto esforço, mas incremental. Fases 2–4 são as maiores; Fase 1 é rápida; Fase 5 é validação assistida. Nenhuma etapa quebra telas existentes.
