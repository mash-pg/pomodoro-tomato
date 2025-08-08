import type { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

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

    const { error: delErr } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id);
    if (delErr) {
      return res.status(500).json({ error: 'Failed to delete push_subscriptions', detail: delErr.message });
    }

    const { error: signOutErr } = await supabase.auth.signOut();
    if (signOutErr) {
      return res.status(500).json({ error: 'Failed to sign out', detail: signOutErr.message });
    }

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : JSON.stringify(e);
    return res.status(500).json({ error: 'Unexpected error', detail });
  }
}
