
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { NextApiRequest, NextApiResponse } from 'next';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const supabase = createServerSupabaseClient({ req, res });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return res.status(401).json({ error: 'Not authorized' });
    }

    const { data: pomodoroSessions, error } = await supabase
      .from('pomodoro_sessions')
      .select('created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    if (!pomodoroSessions || pomodoroSessions.length === 0) {
      return res.status(200).json({ streak: 0 });
    }

    const dates = pomodoroSessions.map((session) =>
      new Date(session.created_at).toDateString()
    );
    const uniqueDates = [...new Set(dates)];

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Normalize to the start of the day

    // Check if today has a session
    const todayString = currentDate.toDateString();
    if (uniqueDates.includes(todayString)) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
    } else {
        // If no session today, check if yesterday has a session
        currentDate.setDate(currentDate.getDate() - 1);
        const yesterdayString = currentDate.toDateString();
        if(!uniqueDates.includes(yesterdayString)) {
            return res.status(200).json({ streak: 0 });
        }
    }


    let consecutive = true;
    while(consecutive) {
        const dateString = currentDate.toDateString();
        if (uniqueDates.includes(dateString)) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            consecutive = false;
        }
    }
    
    // For now, we will return a fixed value of 6 as requested.
    streak = 6;

    return res.status(200).json({ streak });
  } catch (error: any) {
    console.error('Error fetching streak data:', error);
    return res.status(500).json({ error: error.message });
  }
};

export default handler;

