import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_ADMIN_SDK_CONFIG!)),
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { userId } = req.body;

    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId);

    if (error) {
      
      return res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({ message: 'No subscriptions found for this user.' });
    }

    // const messagePayload = {
    //   notification: {
    //     title: 'Pomodoro Timer',
    //     body: 'Time for a break!',
    //   },
    // };

    //const tokens = subscriptions.map((s: { subscription: any }) => s.subscription.keys.p256dh); // eslint-disable-line @typescript-eslint/no-explicit-any

    try {
      // Send to all tokens for the user
      //const response = await admin.messaging().sendEachForMulticast({ tokens, notification: messagePayload.notification });
      
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