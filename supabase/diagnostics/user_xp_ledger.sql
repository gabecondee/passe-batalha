-- SOMENTE LEITURA. Disponível após a migration 20261015_atomic_xp_ledger.sql.
-- A abertura registra o saldo salvo na instalação; não recupera o histórico anterior.
WITH params AS (SELECT '6f4ef628-2f6d-4d12-a5d1-0c800778b2be'::uuid AS user_id)
SELECT e.created_at,e.area,e.source_type,e.source_id,e.requested_amount,
       e.amount AS xp_real_creditado_ou_debitado,e.balance_after,e.metadata
FROM public.xp_events e JOIN params p USING(user_id)
ORDER BY e.created_at,e.id;

-- Saldo atual versus soma do extrato (inclui a abertura e ajustes administrativos).
WITH params AS (SELECT '6f4ef628-2f6d-4d12-a5d1-0c800778b2be'::uuid AS user_id),
balances AS (
  SELECT v.* FROM public.profiles p JOIN params u ON u.user_id=p.id
  CROSS JOIN LATERAL (VALUES
    ('physical',p.xp_physical),('mental',p.xp_mental),('spiritual',p.xp_spiritual),
    ('professional',p.xp_professional),('financial',p.xp_financial)
  ) v(area,saldo_salvo)
), ledger AS (
  SELECT area,sum(amount) AS saldo_extrato FROM public.xp_events e JOIN params u USING(user_id) GROUP BY area
)
SELECT b.*,l.saldo_extrato,coalesce(b.saldo_salvo,0)-coalesce(l.saldo_extrato,0) AS divergencia
FROM balances b LEFT JOIN ledger l USING(area) ORDER BY b.area;
