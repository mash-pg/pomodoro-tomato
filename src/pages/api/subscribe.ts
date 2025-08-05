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
    const { subscription, userId } = req.body;
    console.log('POST /api/subscribe - Received subscription:', subscription);
    console.log('POST /api/subscribe - Received userId:', userId);

    // Save subscription to Supabase
    const { error } = await supabase
      .from('push_subscriptions')
      .insert([{ user_id: userId, subscription: subscription }]);

    if (error) {
      console.error('POST /api/subscribe - Supabase error:', error);
      return res.status(500).json({ error: 'Failed to save subscription' });
    }

    res.status(201).json({ message: 'Subscription saved.' });
  } else if (req.method === 'DELETE') {
    const { subscription } = req.body;
    console.log('DELETE /api/subscribe - Received subscription:', subscription);
    console.log('DELETE /api/subscribe - Endpoint to delete:', subscription.endpoint);

    // Remove subscription from Supabase
    const { error } = await supabase
      .from('push_subscriptions')
      .delete() // delete() を先に呼び出す
      .eq('endpoint', subscription.endpoint);

    if (error) {
      console.error('DELETE /api/subscribe - Supabase error:', error);
      return res.status(500).json({ error: 'Failed to delete subscription' });
    }

    res.status(200).json({ message: 'Unsubscribed successfully.' });
  } else {
    res.setHeader('Allow', ['POST', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}