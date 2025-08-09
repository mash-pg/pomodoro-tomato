import type { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';

// Initialize the admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res
      .status(405)
      .json({ error: 'Method Not Allowed', detail: `Use DELETE, got ${req.method}` });
  }

  try {
    const supabase = createPagesServerClient({ req, res });

    const { data: { user }, error: getUserErr } = await supabase.auth.getUser();
    if (getUserErr) {
      return res.status(500).json({ error: 'Failed to get user', detail: getUserErr.message });
    }
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { task_id } = req.body;

    if (!task_id) {
      return res.status(400).json({ error: 'Bad Request', detail: 'task_id is required' });
    }

    // Delete the task using the admin client
    const { error: deleteError } = await supabaseAdmin
      .from('tasks')
      .delete()
      .eq('id', task_id)
      .eq('user_id', user.id); // Ensure only the user's own tasks can be deleted

    if (deleteError) {
      return res.status(500).json({ error: 'Failed to delete task', detail: deleteError.message });
    }

    return res.status(200).json({ message: 'Task deleted successfully' });
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : JSON.stringify(e);
    return res.status(500).json({ error: 'Unexpected error', detail });
  }
}
