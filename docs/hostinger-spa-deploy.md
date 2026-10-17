# Publicação do app com rotas diretas

O domínio `passedebatalha.app` deve servir o `index.html` também ao abrir
diretamente `/ranking`, `/login`, `/settings/profile` e outras rotas do React.
Um service worker instalado pode mascarar a ausência dessa regra até limpar o
cache. O redirecionamento de autenticação só acontece depois de carregar o app.

Para hospedagem estática Apache/LiteSpeed, o build inclui `dist/.htaccess`,
copiado de `public/.htaccess`. Publicar o conteúdo de `dist` no diretório do
site, incluindo esse arquivo oculto, junto de `index.html`. Preservar regras
adicionais da hospedagem ao integrar com um `.htaccess` já existente no servidor.
As regras do arquivo `vercel.json` só são aplicadas em publicações na Vercel.

Depois da publicação, conferir em janela privada, sem service worker/cache:

1. Abrir `/ranking` diretamente: o servidor entrega o app; sem sessão, ele
   navega para `/login`.
2. Abrir `/login` diretamente e atualizar com F5: o login continua acessível.
3. Com sessão válida, abrir `/ranking` e usar F5: a sessão e o ranking são
   restaurados.
4. Limpar os dados do site e recarregar: deve aparecer o login.

O build deve usar as variáveis de produção do Supabase. O `.env.local` de
desenvolvimento deste workspace aponta para o projeto de teste; não publicar
esse build como produção sem configurar o ambiente correto.

Falhas de consulta de XP e falhas de sessão são estados distintos. A ausência
de sessão deve abrir o login; falha de rede ou indisponibilidade do controle de
XP não devem apagar o saldo nem contornar a verificação dos triggers.
Para investigar o controle, conferir a resposta autenticada da chamada
`xp_control_status` e usar `supabase/diagnostics/xp_installation_check.sql` no
SQL Editor. Uma chamada administrativa sem `auth.uid()` retorna `false` por
projeto e não simula a sessão autenticada do usuário.
