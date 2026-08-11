import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/['"]/g, '');
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkLatestBosses() {
  const { data, error } = await supabase
    .from('custom_bosses')
    .select('id, name, portrait')
    .order('created_at', { ascending: false })
    .limit(2);
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Latest Bosses:');
    console.log(JSON.stringify(data, null, 2));
  }
}

checkLatestBosses();
