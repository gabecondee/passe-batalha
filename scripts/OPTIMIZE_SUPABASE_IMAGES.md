# Compactar imagens antigas no Supabase

A rotina administrativa baixa imagens públicas do próprio projeto, converte para
WebP de até 512 px (preservando proporção e transparência), envia uma nova versão,
confere os bytes enviados e atualiza o link no banco. Não usa Image Transformations
do plano Pro nem exige publicar uma Edge Function.

Escopo: `profiles.avatar`, `custom_bosses.portrait` e `shop_items.image_url`.
Cada execução trata uma tabela; os padrões são simulação e no máximo 10 imagens.
Somente imagens referenciadas pelo aplicativo são processadas. URLs externas,
locais, assinadas, imagens inline e versões já migradas ficam intactas.
PNG/JPEG/WebP estáticos são aceitos; arquivos animados ou acima dos limites são
ignorados ou registrados como erro, sem trocar o link. Só há substituição quando
o novo arquivo é pelo menos 10% menor.

## Preparação

Requer Node com as dependências do projeto e Python com Pillow. O executor aceita
`PYTHON_EXECUTABLE` com o caminho do Python, caso ele não esteja no PATH.

Configure em `.env.local` (ignorado pelo Git):

```dotenv
SUPABASE_URL=https://SEU_PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SUA_CREDENCIAL_ADMINISTRATIVA
# Opcional:
# PYTHON_EXECUTABLE=C:/caminho/python.exe
```

Use uma credencial administrativa do próprio projeto, obtida no painel do
Supabase. Nunca dê prefixo `VITE_` a essa chave, nunca a coloque no front-end e
nunca a envie pelo chat. Essa rotina roda fora do aplicativo.

## Testar e executar

Para manter a migração separada do ambiente do app, pode usar um arquivo privado
`.env.storage-production` (ignorado pelo Git), contendo `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY` e, se necessário, `PYTHON_EXECUTABLE`.
Ao informar `--env-file`, o executor exige URL e credencial nesse arquivo e não
carrega `.env` ou `.env.local`:

```powershell
node scripts/optimize-supabase-images.mjs --env-file .env.storage-production --table profiles --limit 3
```

Esse comando apenas simula; não acrescentar `--apply` antes de conferir o relatório.

## Backup completo das imagens antes da migração

```powershell
node scripts/backup-supabase-images.mjs .env.storage-production
```

O utilitário está restrito ao projeto de produção deste app e só lê o Supabase.
Ele salva os arquivos dos buckets de imagens, as referências de `profiles`
(incluindo `avatar_url`), `custom_bosses` e `shop_items`, os tamanhos e os hashes
SHA-256 em uma pasta privada `production-backup-*` dentro de
`.storage-image-optimization/`. O indicador `complete` do manifesto só fica
verdadeiro ao terminar todos os downloads. A credencial não entra no backup.

Para reutilizar os originais desse backup durante a migração e evitar outro
download dos mesmos arquivos, acrescente:

```powershell
node scripts/optimize-supabase-images.mjs --env-file .env.storage-production --table profiles --limit 10 --source-backup .storage-image-optimization/production-backup-DATA --apply
```

Use o caminho real criado pelo backup. O executor exige um manifesto completo
do mesmo projeto e verifica o hash dos arquivos locais antes de compactá-los.
A conferência do upload sempre baixa a versão nova do Supabase, sem usar o cache
do backup. Objetos e referências criados depois do snapshot podem não fazer parte
dele; os relatórios de cada lote continuam sendo necessários para recuperação.

Para um piloto restrito à sua conta, obtenha o ID do seu usuário no painel e use:

```powershell
node scripts/optimize-supabase-images.mjs --table profiles --user-id SEU_USER_ID --limit 1
node scripts/optimize-supabase-images.mjs --table profiles --user-id SEU_USER_ID --limit 1 --apply
```

O primeiro comando apenas mede; o segundo altera somente o avatar desse perfil.
O filtro também aceita `--table custom_bosses` para retratos pertencentes ao mesmo
usuário. Ele não se aplica ao catálogo global da loja. Confira a imagem no app e
no ranking antes de expandir o lote. A seleção por usuário é feita no banco e a
rotina rejeita uma resposta que contenha outro proprietário.

Primeiro examine um lote pequeno. A simulação baixa e comprime imagens para medir
a economia, mas não faz upload e não escreve no banco:

```powershell
node scripts/optimize-supabase-images.mjs --table profiles --limit 3
```

O resultado mostra quantas imagens seriam alteradas e os tamanhos antes/depois.
O relatório completo fica em `.storage-image-optimization/`, ignorado pelo Git.
Ele contém links antigos e novos para recuperação; preserve-o em local privado.

Para aplicar um lote:

```powershell
node scripts/optimize-supabase-images.mjs --table profiles --limit 10 --apply
node scripts/optimize-supabase-images.mjs --table custom_bosses --limit 10 --apply
node scripts/optimize-supabase-images.mjs --table shop_items --limit 10 --apply
```

O script verifica os primeiros 1000 registros por padrão. `--max-scan` aumenta
esse teto, até 10000, e `--limit` admite até 100 downloads por execução. Para
coleções maiores, amplie o teto ou adapte a seleção antes de executar.
Lotes repetidos pulam links `_optimized/v1/` já gravados. Para continuar sem
baixar novamente imagens sem economia ou com erro, passe `--after-id` com o valor
`next_after_id` retornado pelo lote anterior, sempre na mesma tabela. Quando ele
for `null`, a varredura da tabela terminou. Revise os erros separadamente antes
de considerar a migração concluída. Uma nova simulação não deve avançar o cursor
da aplicação: comece a aplicação do mesmo ponto para processar os candidatos
que foram apenas simulados.

## Integridade e recuperação

- Os originais não são apagados nem sobrescritos. A ocupação do Storage aumenta
  temporariamente com as versões menores.
- Cada URL nova inclui o hash do arquivo; uma mudança de imagem não reutiliza o
  cache da versão antiga. Novos arquivos têm cache de navegador de um ano.
- O upload é verificado antes de trocar o link. A troca exige que o link anterior
  ainda seja o mesmo: uma foto alterada pelo usuário durante o lote é preservada.
- Os links de recuperação são gravados antes da alteração no banco. Se houver
  timeout na escrita, o status pode ficar `update-unconfirmed`: confira o valor
  atual da coluna antes de retomar ou recuperar.
- Para recuperar uma linha, restaure `old_url` da entrada do relatório somente
  se a coluna ainda contiver `new_url`. Assim não se perde uma troca posterior
  feita pelo usuário. O original continua disponível.
- O script não altera políticas de acesso, buckets ou permissões.

Os downloads de migração também consomem tráfego uma vez; a economia ocorre nos
acessos futuros. A simulação seguida da aplicação pode baixar a imagem duas
vezes. Comece pequeno, confirme as imagens no app e compare o egress diário nos
dias seguintes. O consumo já contabilizado no ciclo não será removido.

Os relatórios podem mencionar conflitos ou erros. Não confunda quantidade de
imagens candidatas ou economia estimada com quantidade de alterações confirmadas.
