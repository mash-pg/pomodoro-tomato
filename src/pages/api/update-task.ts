// /pages/api/update-task.ts
import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log(`[API] Received request for /api/update-task. Method: ${req.method}`);
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { task_id, description } = req.body ?? {};
  console.log(`[API] Update Task - task_id: ${task_id}, description: ${description}`);

  if (!task_id || typeof description === 'undefined') {
    return res.status(400).json({ error: 'Task ID and description are required.' });
  }

  // クライアントから来た Bearer トークンを Supabase に伝える
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: req.headers.authorization || '' } },
  });

  try {
    const { data, error } = await supabase
      .from('tasks')
      .update({ description })
      .eq('id', task_id)
      .select('id, user_id, description, created_at') // ← updated_at を外す
      .maybeSingle(); // 配列ではなく1件

    if (error) {
      console.error('[API] Update Task - Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      console.warn('[API] Update Task - Not found or not permitted.');
      return res.status(404).json({ error: 'Not found or not permitted.' });
    }

    console.log('[API] Update Task - Success:', data);
    return res.status(200).json({ message: 'Task updated successfully', data });
  } catch (e: unknown) {
    console.error('[API] Update Task - Unexpected error:', e);
    const message = e instanceof Error ? e.message : 'An unexpected error occurred.';
    return res.status(500).json({ error: message });
  }
}
