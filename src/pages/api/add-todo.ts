import type { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const supabase = createPagesServerClient({ req, res });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { description } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const { data, error } = await supabase
      .from('todos')
      .insert({ user_id: user.id, description, is_completed: false })
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ message: 'Todo added successfully', todo: data[0] });
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : JSON.stringify(e);
    return res.status(500).json({ error: 'Unexpected error', detail });
  }
}
