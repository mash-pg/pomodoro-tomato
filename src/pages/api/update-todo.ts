import type { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const supabase = createPagesServerClient({ req, res });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { todo_id, description, is_completed } = req.body;

    if (!todo_id || (description === undefined && is_completed === undefined)) {
      return res.status(400).json({ error: 'Todo ID and description or is_completed are required' });
    }

    const updateData: { description?: string; is_completed?: boolean } = {};
    if (description !== undefined) updateData.description = description;
    if (is_completed !== undefined) updateData.is_completed = is_completed;

    const { data, error } = await supabase
      .from('todos')
      .update(updateData)
      .eq('id', todo_id)
      .eq('user_id', user.id)
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Todo not found or not owned by user' });
    }

    return res.status(200).json({ message: 'Todo updated successfully', todo: data[0] });
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : JSON.stringify(e);
    return res.status(500).json({ error: 'Unexpected error', detail });
  }
}
