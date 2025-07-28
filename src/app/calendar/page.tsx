"use client";

import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";
import { format } from "date-fns";
import WeeklyCalendar from "@/components/WeeklyCalendar"; // Import WeeklyCalendar

interface PomodoroSession {
  id: number;
  created_at: string;
  duration_minutes: number;
  user_id: string;
}

export default function CalendarPage() {
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [date, setDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserAndSessions = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        if (user) {
          const { data: sessionsData, error: sessionsError } = await supabase
            .from('pomodoro_sessions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (sessionsError) {
            throw sessionsError;
          }
          setSessions(sessionsData as PomodoroSession[]);
        }
      } catch (err: unknown) {
        console.error("Error fetching user or sessions:", err);
        setError((err as Error).message || "データの取得中にエラーが発生しました。");
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndSessions();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      fetchUserAndSessions(); // Re-fetch when auth state changes
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const getDailyPomodoros = (date: Date) => {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).getTime();

    return sessions.filter(session => {
      const sessionTime = new Date(session.created_at).getTime();
      return sessionTime >= startOfDay && sessionTime <= endOfDay;
    }).length;
  };

  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const pomodoros = getDailyPomodoros(date);
      if (pomodoros > 0) {
        return (
          <div className="flex justify-center items-center mt-1">
            <span className="text-xs font-bold text-blue-600">{pomodoros}</span>
          </div>
        );
      }
    }
    return null;
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">読み込み中...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center min-h-screen text-red-500">エラー: {error}</div>;
  }

  if (!user) {
    return <div className="flex justify-center items-center min-h-screen text-gray-500">ログインしてください。</div>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-8">ポモドーロカレンダー</h1>
      <div className="flex flex-col md:flex-row md:space-x-8 w-full max-w-7xl">
        {/* Monthly Calendar */}
        <div className="w-full md:w-2/5 bg-gray-800 p-6 rounded-lg shadow-lg mb-8 md:mb-0">
          <Calendar
            onChange={(value) => setDate(value instanceof Date ? value : new Date())}
            value={date}
            tileContent={tileContent}
            className="react-calendar-custom"
          />
          <div className="mt-8 text-center">
            <h2 className="text-2xl font-semibold mb-4">
              {format(date, "yyyy年MM月dd日")} のポモドーロ: {getDailyPomodoros(date)} 回
            </h2>
          </div>
        </div>

        {/* Weekly Calendar Component */}
        <div className="w-full md:w-3/5 overflow-x-auto">
          <WeeklyCalendar user={user} sessions={sessions} />
        </div>
      </div>
    </main>
  );
}
