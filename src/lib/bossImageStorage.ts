import { supabase } from '@/integrations/supabase/client';
import { optimizePortrait } from './optimizePortrait';
import { localImageUrl } from './localImages';

/**
 * Baixa uma imagem de uma URL temporária (como DALL-E, Pollinations, etc.)
 * e faz o upload permanente para o Supabase Storage no bucket 'boss-portraits'.
 * Retorna a URL pública PERMANENTE do Supabase.
 */
export async function uploadBossPortraitToSupabase(
  imageUrl: string,
  bossId: string
): Promise<string> {
  try {
    // Bundled fallbacks already have permanent URLs; do not duplicate them in Storage.
    if (imageUrl.startsWith('/') && !imageUrl.startsWith('//')) return localImageUrl(imageUrl);
    // Se a imagem já for uma URL do Supabase ou um data SVG estático, retorna diretamente
    if (imageUrl.includes('supabase.co/storage')) {
      return imageUrl;
    }

    let blob: Blob;
    
    // Se a IA retornar a imagem em Base64, convertemos para Blob localmente
    if (imageUrl.startsWith('data:image/')) {
      const res = await fetch(imageUrl);
      blob = await res.blob();
    } else {
      // Baixa o blob da URL externa (OpenAI, etc)
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Falha ao baixar imagem para upload: ${response.statusText}`);
      }
      blob = await response.blob();
    }

    blob = await optimizePortrait(blob);
    const extension = ({ 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/svg+xml': 'svg', 'image/gif': 'gif' } as Record<string, string>)[blob.type] || 'png';
    const fileName = `${bossId}-${Date.now()}.${extension}`;

    // 2. Faz o upload para o bucket 'boss-portraits' no Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('boss-portraits')
      .upload(fileName, blob, {
        contentType: blob.type || 'image/png',
        // Every upload has a new URL, so browsers can retain it for a year.
        cacheControl: '31536000',
        upsert: true,
      });

    if (uploadError) {
      console.warn('Bucket boss-portraits não disponível, mantendo URL direta:', uploadError);
      return imageUrl;
    }

    // 3. Obtém a URL pública PERMANENTE do Supabase Storage
    const { data: publicUrlData } = supabase.storage
      .from('boss-portraits')
      .getPublicUrl(uploadData.path);

    if (publicUrlData?.publicUrl) {
      return publicUrlData.publicUrl;
    }

    return imageUrl;
  } catch (err) {
    console.warn('Erro ao persisitr imagem no Supabase Storage, usando URL original:', err);
    return imageUrl;
  }
}
