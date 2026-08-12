import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';

// Try loading .env.local first
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
} else {
  dotenv.config();
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data: ranking } = await supabase.from('global_ranking').select('*').limit(3);
  console.log('Global Ranking:', JSON.stringify(ranking, null, 2));
}
run();
