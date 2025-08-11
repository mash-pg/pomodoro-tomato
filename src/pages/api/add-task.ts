import type { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';

// Initialize the admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res
      .status(405)
      .json({ error: 'Method Not Allowed', detail: `Use POST, got ${req.method}` });
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

    const { description } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Bad Request', detail: 'description is required' });
    }

    const { data, error: insertError } = await supabaseAdmin
      .from('tasks')
      .insert({ user_id: user.id, description })
      .select(); // Select the inserted data to return it

    if (insertError) {
      return res.status(500).json({ error: 'Failed to add task', detail: insertError.message });
    }

    return res.status(201).json({ message: 'Task added successfully', task: data[0] });
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : JSON.stringify(e);
    return res.status(500).json({ error: 'Unexpected error', detail });
  }
}
