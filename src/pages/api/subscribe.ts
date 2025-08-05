import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(Buffer.from(process.env.FIREBASE_ADMIN_SDK_CONFIG_BASE64!, 'base64').toString('utf8'))),
    });
    
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    // Optionally, re-throw the error or handle it appropriately
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { fcmToken, userId, subscription } = req.body;
    console.log('POST /api/subscribe - Received FCM Token:', fcmToken);
    console.log('POST /api/subscribe - Received userId:', userId);
    console.log('POST /api/subscribe - Received subscription:', subscription);

    // Save FCM token and subscription to Supabase
    const { error } = await supabase
      .from('push_subscriptions')
      .insert([{ user_id: userId, fcm_token: fcmToken, subscription: subscription }]);

    if (error) {
      console.error('POST /api/subscribe - Supabase error:', error);
      return res.status(500).json({ error: 'Failed to save FCM token' });
    }

    res.status(201).json({ message: 'FCM token saved.' });
  } else if (req.method === 'DELETE') {
    const { fcmToken } = req.body;
    console.log('DELETE /api/subscribe - Received FCM Token to delete:', fcmToken);

    // Remove FCM token from Supabase
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('fcm_token', fcmToken);

    if (error) {
      console.error('DELETE /api/subscribe - Supabase error:', error);
      return res.status(500).json({ error: 'Failed to delete FCM token' });
    }

    res.status(200).json({ message: 'FCM token unsubscribed successfully.' });
  } else {
    res.setHeader('Allow', ['POST', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}