import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';
import webpush from 'web-push';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { userId } = req.body;

    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }

    const notificationPayload = JSON.stringify({
      title: 'Pomodoro Timer',
      body: 'Time for a break!',
    });

    const vapidOptions = {
      vapidDetails: {
        subject: 'mailto:your-email@example.com',
        publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        privateKey: process.env.VAPID_PRIVATE_KEY!,
      },
    };

    const promises = subscriptions.map((s: { subscription: webpush.PushSubscription }) =>
      webpush.sendNotification(s.subscription, notificationPayload, vapidOptions)
    );

    try {
      await Promise.all(promises);
      res.status(200).json({ message: 'Notifications sent.' });
    } catch (err) {
      console.error('Error sending notifications:', err);
      res.status(500).json({ error: 'Failed to send notifications' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
