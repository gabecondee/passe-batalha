# Auditoria de egress — 17/10/2026

Consulta de produção realizada em 17/10/2026 às 15:58 (America/Sao_Paulo).
Foram lidas referências do banco e cabeçalhos HTTP; nenhum dado foi alterado no
Supabase. Duas respostas GET foram verificadas com cancelamento do corpo.
Não houve acesso aos logs de tráfego nem ao total faturado do painel.

## Resultado atual

| Imagens referenciadas pelo aplicativo | Arquivos distintos | Total de bytes | Maior arquivo |
| --- | ---: | ---: | ---: |
| Avatares em `profiles.avatar` | 29 | 1.469.194 | 63.246 |
| Retratos em `custom_bosses.portrait` | 10 | 89.666 | 39.040 |
| Loja em `shop_items.image_url` | 0 no Storage deste projeto | 0 | 0 |

Todas as 39 URLs públicas retornaram HTTP 200 no HEAD. Não foram encontrados
avatares ou retratos inline nem referências HTTP de outros servidores nessas
colunas. O catálogo da loja usa imagens locais. O total de perfis no banco é 69;
isso não mede usuários ativos nem contradiz a estimativa de 30 usuários.

As duas amostras GET retornaram `Cache-Control: public, max-age=31536000` e
`CF-Cache-Status: HIT`. O HEAD retornou `no-cache`; ele não deve ser usado para
concluir que o navegador recebe imagens sem cache. O cache HTTP das amostras
está configurado para um ano.

Um relatório local de migração anterior registra 34 imagens já compactadas
(25 avatares e 9 chefes), com 59.571.166 bytes antes e 1.326.526 bytes depois:
redução de 97,8% no peso desse conjunto. A consulta atual confirma que as imagens
referenciadas estão pequenas. Essa porcentagem não é uma medição de redução do
egress faturado. Os originais foram preservados na migração anterior.

## Ajuste realizado nesta auditoria

O service worker aceitava somente o host definido em `VITE_SUPABASE_URL`.
O ambiente local aponta o banco para outro projeto, enquanto as referências
existentes podem carregar imagens de produção. Nesse cenário, o cache do
service worker não cobria esses retratos, embora o cache HTTP ainda pudesse atuar.

O cache agora cobre os buckets públicos `avatars` e `boss-portraits` em hosts
Supabase e no domínio HTTPS explicitamente configurado. APIs, autenticação,
URLs assinadas e outros buckets continuam fora da regra. Foi mantido o cache
existente e o limite de 100 entradas; a retenção aumentou de 7 para 30 dias.
As URLs de novas imagens são versionadas, evitando reaproveitar a imagem antiga.

A mudança está no código local. Sua aplicação aos usuários depende de publicar
uma versão do frontend e o navegador receber o service worker atualizado.

## Como identificar os arquivos que consumiram a cota

Cached Egress mede dados entregues pelo CDN do Storage. Um HIT no CDN ainda
consome essa cota; reutilizar uma imagem no dispositivo evita outra transferência.
Fonte: [Supabase — Egress](https://supabase.com/docs/guides/platform/manage-your-usage/egress).

Execute `supabase/diagnostics/storage_egress_logs.sql` no Explorer do Supabase,
com fonte Logs e o período do alerta. A consulta lista os arquivos mais
solicitados e distingue HIT de outras respostas. Ela não deve ser executada
no SQL Editor PostgreSQL. Compare especialmente URLs antigas PNG com URLs WebP
otimizadas. Fonte da consulta:
[Supabase — Storage bandwidth](https://supabase.com/docs/guides/storage/serving/bandwidth).

O consumo depende de tamanho × número de transferências. Como exemplo,
30 avatares de 1,7 MB transferidos 100 vezes representam cerca de 5,1 GB.
Isso explica como poucos usuários podem consumir a cota, mas não estabelece
que esse foi o histórico real deste projeto. Downloads administrativos e
pré-visualizações dos arquivos também devem ser considerados na leitura dos logs.

Não é necessário excluir originais para reduzir tráfego: arquivos que não são
acessados ocupam armazenamento, sem gerar downloads por apenas existirem.
As otimizações reduzem transferências futuras e não descontam o consumo passado.

## Repetir a conferência de imagens

```powershell
node scripts/audit-storage-egress.mjs .env.storage-production
node scripts/audit-storage-egress.mjs .env.storage-production --sample-get
```

A rotina padrão consulta referências e HEAD. A opção adicional confere os
cabeçalhos GET de uma imagem por tabela e cancela o corpo; alguns bytes podem
chegar antes do cancelamento. Não faz upload, compactação ou exclusão.
URLs externas não são consultadas; referências externas são contadas no relatório.
O arquivo de ambiente administrativo existente é privado e não entra no Git.
