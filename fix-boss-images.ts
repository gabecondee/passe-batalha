import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltam credenciais do Supabase no .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixImages() {
  console.log('Atualizando imagens dos chefões padrões...');

  const updates = [
    { id: 'boss-morthzul', portrait: '/images/bosses/boss-morthzul.jpg' },
    { id: 'boss-oculus-somnus', portrait: '/images/bosses/boss-oculus-somnus.png' },
    { id: 'boss-nargul', portrait: '/images/bosses/boss-nargul.png' }
  ];

  for (const update of updates) {
    const { error } = await supabase
      .from('custom_bosses')
      .update({ portrait: update.portrait })
      .eq('id', update.id);
    
    if (error) {
      console.error(`Erro ao atualizar ${update.id}:`, error);
    } else {
      console.log(`${update.id} atualizado com sucesso para ${update.portrait}`);
    }
  }
}

fixImages();
