import { supabase } from '@/integrations/supabase/client';
import { optimizePortrait } from '@/lib/optimizePortrait';

/** Persist a versioned file URL instead of repeating base64 in ranking responses. */
export async function saveProfileAvatar(userId: string, image: string | null): Promise<string | null> {
  let avatar = image;
  if (image?.startsWith('data:image/')) {
    const response = await fetch(image);
    const blob = await optimizePortrait(await response.blob());
    const extension = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/jpeg' ? 'jpg' : 'png';
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from('avatars').upload(path, blob, {
      contentType: blob.type,
      cacheControl: '31536000',
      upsert: false,
    });
    if (error) throw error;
    avatar = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  }
  const { data, error } = await supabase.from('profiles').update({ avatar })
    .eq('id', userId).select('id').single();
  if (error) throw error;
  if (!data) throw new Error('Perfil não encontrado para salvar a foto.');
  return avatar;
}
