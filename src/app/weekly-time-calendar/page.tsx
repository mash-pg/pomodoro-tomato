"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User, AuthChangeEvent, Session } from "@supabase/supabase-js";
import dynamic from "next/dynamic";

const DynamicWeeklyTimeCalendar = dynamic(() => import("@/components/WeeklyTimeCalendar"), { ssr: false });

interface PomodoroSession {
  id: number;
  created_at: string;
  duration_minutes: number;
  user_id: string;
}

export default function WeeklyTimeCalendarPage() {
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
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

    const { data: authListener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user || null);
      fetchUserAndSessions(); // Re-fetch when auth state changes
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

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
      <h1 className="text-4xl font-bold mb-8">週ごとのポモドーロ (時間)</h1>
      <div className="w-full max-w-7xl">
        {user && (
          <DynamicWeeklyTimeCalendar user={user} sessions={sessions} />
        )}
      </div>
    </main>
  );
}
