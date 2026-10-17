# Publicar a otimização de imagens

1. Publicar o frontend com as variáveis de ambiente de produção. O `.env.local`
   usado para desenvolvimento pode continuar apontando para o projeto de teste;
   não reutilizar esse arquivo como configuração de produção.
2. No projeto de produção, publicar separadamente as Edge Functions presentes
   em `supabase/functions/generate-avatar/index.ts` e
   `supabase/functions/generate-boss/index.ts`. As secrets permanecem no projeto.
   O commit e o deploy do frontend não publicam essas funções automaticamente.
3. Validar uma geração de avatar e uma de chefão, uma edição de foto do perfil,
   o recarregamento da página e a foto exibida no ranking.
4. Compactar os arquivos antigos seguindo `OPTIMIZE_SUPABASE_IMAGES.md`, começando
   por uma simulação e um lote pequeno no projeto correto. Preservar os relatórios
   privados e os originais até conferir os links no aplicativo.

O avatar de produção do piloto foi confirmado pelo usuário como WebP de 49.600
bytes, comparado ao PNG anterior de 1.694.777 bytes. Isso valida aquele arquivo;
as demais imagens antigas ainda precisam da migração.

## Limpeza pendente

Esta versão não exclui automaticamente imagens anteriores nem gerações
abandonadas. A redução do tráfego vem dos arquivos menores, carregamento sob
demanda e cache; a limpeza posterior reduz o armazenamento ocupado.

A limpeza precisa identificar arquivos sem referências (incluindo os campos
`profiles.avatar` e `profiles.avatar_url`), respeitar a propriedade do arquivo e
evitar excluir imagens usadas por outro perfil. Nunca apagar o original antes
de confirmar o novo arquivo e a gravação da referência. Não excluir objetos
diretamente por SQL em `storage.objects`; usar a API do Storage.
