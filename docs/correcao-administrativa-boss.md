# Proteção do app com correção direta pelo proprietário

A pedido do proprietário: sem campo de motivo, sem tabela de auditoria adicional e sem função administrativa separada.

## Aplicar

1. Abrir o SQL Editor do Supabase com o papel `postgres`.
2. Executar inteiro `supabase/migrations/20261015_allow_owner_boss_corrections.sql`, incluindo BEGIN e COMMIT.
3. Não é necessário executar primeiro a migration de 13/10: a nova instala a proteção sozinha e também atualiza uma instalação anterior. Não executar a versão antiga depois da nova, pois ela substituiria a função pela versão sem exceção administrativa.

A aplicação não reescreve históricos de batalha nem XP.

## Uso diário

O aplicativo usa o papel de banco `authenticated` e não pode modificar/remover dias já confirmados como sucesso ou falha. Ele continua podendo registrar um dia pendente normalmente.

No SQL Editor, conferir o papel com:

```sql
select current_user;
```

Se o resultado for `postgres`, os UPDATEs administrativos continuam funcionando diretamente, inclusive para corrigir um dia de fail para success ou de success para fail. Não é necessário desabilitar a trigger. A exceção também contempla o papel de infraestrutura `supabase_admin`.

Ser proprietário de uma conta no aplicativo não concede essa exceção: ela depende do papel real no banco, não de um campo no perfil ou JWT. O papel `service_role` não foi incluído na exceção.

Continuar restringindo correções ao ID da batalha, ID do usuário e dia desejado. A trigger não corrige XP, não recalcula automaticamente o status geral da batalha e não oferece proteção contra um UPDATE equivocado feito pelo administrador. Isso preserva o controle direto solicitado.

“Sem log” significa que esta solução não cria auditoria adicional. A infraestrutura do Supabase pode continuar mantendo os logs normais do serviço.

## Validação local

O script `scripts/test-boss-trigger.mjs` executa a migration em um PostgreSQL em memória com papéis, RLS e trigger reais via PGlite. Os 11 testes passaram: preservação do histórico, invocação com o papel correto, bloqueio de sobrescrita/remoção/duplicação pelo app, gravação de dias pendentes, correção direta por postgres e rejeição de tentativa de simular a exceção por campos de JWT. Nenhuma conexão com produção foi usada.

Para repetir, instalar `@electric-sql/pglite` em um diretório temporário e executar o script com o caminho absoluto para `node_modules/@electric-sql/pglite/dist/index.js` como argumento. A dependência não foi adicionada ao app.
