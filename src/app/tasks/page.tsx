"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';
import WeeklyTaskCalendar from '@/components/WeeklyTaskCalendar';

interface Task {
  id: number;
  user_id: string;
  description: string | null;
  created_at: string;
}

export default function TasksPage() {
  const [user, setUser] = useState<User | null>(null);
  const [todaysTasks, setTodaysTasks] = useState<Task[]>([]);
  const [weeklyTasks, setWeeklyTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Fetch today's tasks
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const { data: todaysTasksData, error: todaysTasksError } = await supabase
          .from('tasks')
          .select('id, user_id, description, created_at')
          .eq('user_id', user.id)
          .gte('created_at', today.toISOString())
          .lt('created_at', tomorrow.toISOString())
          .order('created_at', { ascending: true });

        if (todaysTasksError) {
          console.error("Error fetching today's tasks:", todaysTasksError);
          setError("今日のタスクの読み込みに失敗しました。");
        } else {
          setTodaysTasks(todaysTasksData || []);
        }

        // Fetch weekly tasks
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 7);
        endOfWeek.setHours(0, 0, 0, 0);

        const { data: weeklyTasksData, error: weeklyTasksError } = await supabase
          .from('tasks')
          .select('id, user_id, description, created_at')
          .eq('user_id', user.id)
          .gte('created_at', startOfWeek.toISOString())
          .lt('created_at', endOfWeek.toISOString())
          .order('created_at', { ascending: false }); // Newest first for weekly

        if (weeklyTasksError) {
          console.error("Error fetching weekly tasks:", weeklyTasksError);
          setError("今週のタスクの読み込みに失敗しました。");
        } else {
          setWeeklyTasks(weeklyTasksData || []);
        }

      } else {
        setTodaysTasks([]);
        setWeeklyTasks([]);
        setError("タスクを表示するにはログインしてください。");
      }
      setLoading(false);
    };

    fetchTasks();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => fetchTasks());
    return () => authListener.subscription.unsubscribe();
  }, []);

  const groupTasksByDate = (tasks: Task[]) => {
    const grouped: { [key: string]: Task[] } = {};
    tasks.forEach(task => {
      const date = new Date(task.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(task);
    });
    return grouped;
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 bg-gray-900 text-white pt-20">
      <div className="z-10 w-full max-w-6xl items-center justify-between font-mono text-sm flex flex-col text-center">
        <h1 className="text-3xl font-bold mb-8">あなたのタスク履歴</h1>

        {loading && <p className="text-gray-400">タスクを読み込み中...</p>}
        {error && <p className="text-red-500 mb-4">{error}</p>}

        {!user && !loading && !error && <p className="text-gray-400">タスクを表示するにはログインしてください。</p>}

        {user && !loading && !error && (
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Today's Tasks */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-4">今日のタスク</h2>
              {todaysTasks.length === 0 ? (
                <p className="text-gray-400">今日完了したタスクはありません。</p>
              ) : (
                <ul className="space-y-2">
                  {todaysTasks.map(task => (
                    <li key={task.id} className="text-gray-200">
                      <span className="font-semibold mr-2">{new Date(task.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                      {task.description}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Weekly Tasks */}
            <WeeklyTaskCalendar user={user} tasks={weeklyTasks} />
          </div>
        )}
      </div>
    </main>
  );
}
