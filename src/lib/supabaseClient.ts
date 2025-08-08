//import { createClient } from '@supabase/supabase-js';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.');
}

//export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabase = createPagesBrowserClient();
