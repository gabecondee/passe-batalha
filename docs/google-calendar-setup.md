# Conexão persistente com Google Agenda

## Causa e mudança

A integração anterior usava o token OAuth do navegador (`localStorage`). Ele não era compartilhado entre dispositivos e expirava em aproximadamente uma hora, sem renovação. A nova integração usa autorização OAuth com acesso offline, vinculada ao usuário autenticado do Supabase. A função `google-calendar` guarda tokens criptografados com AES-GCM e renova o acesso ao consultar, criar ou excluir eventos. Nenhum token Google é enviado ao frontend.

## Ativação

1. Aplique a migration `supabase/migrations/20261013_google_calendar_connections.sql` no projeto Supabase. As tabelas têm RLS, sem permissões para `anon` ou `authenticated`; somente a função com `service_role` pode ler e escrever.
2. No Google Cloud, habilite a Google Calendar API. Use um cliente OAuth do tipo **Aplicativo da Web**. Cadastre como URI de redirecionamento autorizada:

   `https://rxkppgpujtxluqyygbvk.supabase.co/functions/v1/google-calendar`

   Para outro projeto Supabase, substitua o domínio pelo seu. Não coloque uma barra final ou query string.

3. Configure os secrets da função no Supabase:

   - `GOOGLE_CALENDAR_CLIENT_ID`: ID do cliente OAuth da Web.
   - `GOOGLE_CALENDAR_CLIENT_SECRET`: segredo desse cliente; nunca use uma variável `VITE_` para ele.
   - `GOOGLE_CALENDAR_ALLOWED_ORIGINS`: origens exatas separadas por vírgula, por exemplo `https://passedebatalha.app,http://localhost:8080`. Cada origem deve incluir o protocolo e não incluir caminhos. Cadastre os domínios de produção e de teste que realmente serão usados.
   - `GOOGLE_CALENDAR_TOKEN_KEY`: 32 bytes aleatórios codificados em base64. Gere uma vez com `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` e salve diretamente nos secrets. Preserve essa chave: trocar sem migrar os tokens criptografados exige reconectar os usuários.

   `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são fornecidos pelo ambiente das Edge Functions.

4. Publique a função com `supabase functions deploy google-calendar`. O `config.toml` desabilita a validação JWT do gateway porque o Google precisa chamar o callback sem login. A função valida o JWT de **todo POST** com `auth.getUser`; o GET só aceita um `state` aleatório de uso único, com validade de 10 minutos e vinculado ao usuário que iniciou a conexão.
5. Publique o frontend após ativar a função e a migration. `VITE_GOOGLE_CALENDAR_CLIENT_ID` não é mais usado pelo frontend.

## Comportamento esperado e migração

Os usuários da integração antiga precisam conectar uma vez novamente. O token antigo não contém `refresh_token` e não pode ser convertido em uma autorização persistente. Os eventos já salvos no aplicativo são preservados.

A autorização abre por redirecionamento completo, compatível com PWA sem depender de popups. Depois o Google retorna à tela de integrações. Se o sistema operacional abrir o retorno no navegador externo, a autorização já estará salva no servidor: ao reabrir o PWA, ele consulta o estado da conta e sincroniza. Se o navegador externo pedir login, entre com a mesma conta do aplicativo.

A cada abertura, retorno ao app e recuperação de rede, o estado é consultado novamente. Falhas temporárias não removem a autorização. Quando o Google revoga ou invalida o refresh token, o aplicativo informa a necessidade de reconectar. Desconectar revoga a autorização Google e remove o vínculo do servidor.

**Google em modo Testing:** os refresh tokens para esses escopos expiram em sete dias. Para uso contínuo, configure o consentimento para produção e cumpra a verificação exigida pelo Google. A renovação automática não contorna revogação, políticas do Workspace ou expiração definida pelo Google.

Referência oficial: https://developers.google.com/identity/protocols/oauth2/web-server

## Validação após publicar

- Conecte no computador e entre com a mesma conta do aplicativo no celular; ambos devem mostrar a conexão e os eventos.
- Feche o PWA, reabra depois de mais de uma hora e confirme que a sincronização ocorre sem novo consentimento.
- Desconecte em um dispositivo; ao voltar ao outro, o vínculo deve aparecer desconectado.
- Desligue a rede e restaure; uma falha temporária não deve apagar o vínculo.
- Revogue o acesso na conta Google e sincronize; deve aparecer uma mensagem para reconectar.
- Troque de usuário no mesmo navegador; os eventos e a conexão da conta anterior não devem aparecer.

Os testes locais cobrem os estados da interface e as regras de segurança. O fluxo real exige os secrets, publicação e uma conta Google de teste.
