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
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editedDescription, setEditedDescription] = useState<string>('');

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

// 置き換え：handleDeleteTask
const handleDeleteTask = async (taskId: number) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    const response = await fetch('/api/delete-task', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ task_id: taskId }),
    });

    const json = await response.json();
    if (!response.ok) throw new Error(json.error || 'Failed to delete task');

    setTodaysTasks(prev => prev.filter(t => t.id !== taskId));
    setWeeklyTasks(prev => prev.filter(t => t.id !== taskId)); // ← 週一覧も同期
  } catch (err) {
    console.error('Error deleting task:', err);
    setError((err as Error).message || 'タスクの削除に失敗しました。');
  }
};

// 置き換え：handleUpdateTask
const handleUpdateTask = async (taskId: number, newDescription: string) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    const response = await fetch('/api/update-task', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ task_id: taskId, description: newDescription }),
    });

    const json = await response.json();
    if (!response.ok) throw new Error(json.error || 'Failed to update task');

    const updated = json.data as Task; // サーバからの確定値
    setTodaysTasks(prev => prev.map(t => (t.id === taskId ? { ...t, description: updated.description } : t)));
    setWeeklyTasks(prev => prev.map(t => (t.id === taskId ? { ...t, description: updated.description } : t)));
    setEditingTaskId(null);
  } catch (err) {
    console.error('Error updating task:', err);
    setError((err as Error).message || 'タスクの更新に失敗しました。');
  }
};

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
            <div className="bg-gray-800 p-8 rounded-lg shadow-xl border border-blue-500">
              <h2 className="text-2xl font-bold mb-6 text-blue-400">今日のタスク</h2>
              {todaysTasks.length === 0 ? (
                <p className="text-gray-400">今日完了したタスクはありません。</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-gray-700 rounded-lg border border-gray-600">
                    <thead>
                      <tr>
                        <th className="py-2 px-4 text-center text-red-500 border-r border-gray-600 border-b-4 border-gray-600">時間</th>
                        <th className="py-2 px-4 text-center text-red-500 border-r border-gray-600 border-b-4 border-gray-600">内容</th>
                        <th className="py-2 px-4 text-center text-red-500 border-b-4 border-gray-600">削除</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todaysTasks.map(task => (
                        <tr key={task.id} className="border-t border-gray-600">
                          <td className="py-2 px-4 text-center text-gray-200 border-r border-gray-600">{new Date(task.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="py-2 px-4 text-center text-gray-200 border-r border-gray-600">
                            {editingTaskId === task.id ? (
                              <input
                                type="text"
                                value={editedDescription}
                                onChange={(e) => setEditedDescription(e.target.value)}
                                className="w-full bg-gray-700 text-white border border-gray-600 rounded px-2 py-1"
                              />
                            ) : (
                              task.description
                            )}
                          </td>
                          <td className="py-2 px-4 text-center flex justify-center items-center space-x-2">
                            {editingTaskId === task.id ? (
                              <>
                                <button
                                  onClick={() => handleUpdateTask(task.id, editedDescription)}
                                  className="p-1 rounded-full bg-green-600 hover:bg-green-700 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                                  aria-label="Save task"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => setEditingTaskId(null)}
                                  className="p-1 rounded-full bg-gray-600 hover:bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
                                  aria-label="Cancel edit"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingTaskId(task.id);
                                  setEditedDescription(task.description || '');
                                }}
                                className="p-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                                aria-label="Edit task"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
                                </svg>
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-1 rounded-full bg-red-600 hover:bg-red-700 text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                              aria-label="Delete task"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Weekly Tasks */}
            <WeeklyTaskCalendar user={user} tasks={weeklyTasks} onDeleteTask={handleDeleteTask} onUpdateTask={handleUpdateTask} />
          </div>
        )}
      </div>
    </main>
  );
}
