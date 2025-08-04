import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';
import webpush from 'web-push';

// Ensure web-push uses Node.js's Buffer
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(webpush as any).Buffer = Buffer;

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { subscription, userId } = req.body;

    const { error } = await supabase
      .from('push_subscriptions')
      .insert([{ user_id: userId, subscription: subscription }]);

    if (error) {
      console.error('Error saving subscription:', error);
      return res.status(500).json({ error: 'Failed to save subscription' });
    }

    res.status(201).json({ message: 'Subscription saved.' });
  } else if (req.method === 'DELETE') {
    // TODO: Implement unsubscription logic
    res.status(200).json({ message: 'Unsubscribed successfully.' });
  } else {
    res.setHeader('Allow', ['POST', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
