import type { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const supabase = createPagesServerClient({ req, res });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { todo_id } = req.body;

    if (!todo_id) {
      return res.status(400).json({ error: 'Todo ID is required' });
    }

    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', todo_id)
      .eq('user_id', user.id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ message: 'Todo deleted successfully' });
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : JSON.stringify(e);
    return res.status(500).json({ error: 'Unexpected error', detail });
  }
}
