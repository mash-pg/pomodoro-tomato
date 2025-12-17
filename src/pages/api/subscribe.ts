import { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
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
  // Create authenticated Supabase client
  const supabase = createPagesServerClient({ req, res });

  // Verify user authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('POST /api/subscribe - Authentication failed:', authError);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    const { fcmToken, subscription } = req.body;
    console.log('POST /api/subscribe - Received FCM Token:', fcmToken);
    console.log('POST /api/subscribe - User ID:', user.id);
    console.log('POST /api/subscribe - Received subscription:', subscription);

    // Save FCM token and subscription to Supabase (use authenticated user.id)
    const { error } = await supabase
      .from('push_subscriptions')
      .insert([{ user_id: user.id, fcm_token: fcmToken, subscription: subscription }]);

    if (error) {
      console.error('POST /api/subscribe - Supabase error:', error);
      return res.status(500).json({ error: 'Failed to save FCM token' });
    }

    res.status(201).json({ message: 'FCM token saved.' });
  } else if (req.method === 'DELETE') {
    const { fcmToken } = req.body;
    console.log('DELETE /api/subscribe - Received FCM Token to delete:', fcmToken);
    console.log('DELETE /api/subscribe - User ID:', user.id);

    // Remove FCM token from Supabase (only user's own tokens)
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('fcm_token', fcmToken)
      .eq('user_id', user.id);

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