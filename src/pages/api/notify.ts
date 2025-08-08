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
    const { userId } = req.body;

    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('fcm_token')
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to fetch FCM tokens:', error);
      return res.status(500).json({ error: 'Failed to fetch FCM tokens' });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({ message: 'No FCM tokens found for this user.' });
    }

    const messagePayload = {
      notification: {
        title: 'Pomodoro Timer',
        body: 'Time for a break!',
      },
    };

    const tokens = subscriptions.map((s: { fcm_token: string }) => s.fcm_token);

    try {
      // Send to all tokens for the user
      const response = await admin.messaging().sendEachForMulticast({ tokens, notification: messagePayload.notification });
      console.log('Successfully sent message:', response);

      const tokensToDelete: string[] = [];
      response.responses.forEach((result, index) => {
        if (!result.success) {
          const error = result.error;
          if (error && (error.code === 'messaging/registration-token-not-registered' || error.code === 'messaging/invalid-registration-token')) {
            const invalidToken = tokens[index];
            tokensToDelete.push(invalidToken);
            console.log(`Token ${invalidToken} is invalid. Marking for deletion.`);
          }
        }
      });

      if (tokensToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('push_subscriptions')
          .delete()
          .in('fcm_token', tokensToDelete);

        if (deleteError) {
          console.error('Failed to delete invalid tokens:', deleteError);
        } else {
          console.log('Successfully deleted invalid tokens.');
        }
      }

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
