import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.');
}

export const supabase = typeof window !== 'undefined'
  ? createClient(supabaseUrl, supabaseAnonKey)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  : ({} as any); // サーバーサイドでは空のオブジェクトを返すか、適切なモックを返す