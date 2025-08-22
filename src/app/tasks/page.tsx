"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';
import WeeklyTaskCalendar from '@/components/WeeklyTaskCalendar';
import { startOfWeek, addDays, subWeeks, addWeeks, isToday } from 'date-fns';
import { useTasks } from '@/context/TaskContext'; // Use the new TaskContext


export default function TasksPage() {
  const { tasks, fetchTasks } = useTasks(); // Get tasks and fetcher from context
  const [user, setUser] = useState<User | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editedDescription, setEditedDescription] = useState<string>('');
  
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [searchDate, setSearchDate] = useState<string>('');

  const todaysTasks = tasks.filter(task => isToday(new Date(task.created_at)));
  const weeklyTasks = tasks.filter(task => {
      const taskDate = new Date(task.created_at);
      const endDate = addDays(currentWeekStart, 7);
      return taskDate >= currentWeekStart && taskDate < endDate;
  });

  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        if (user) {
          await fetchTasks();
        } else {
          setError("タスクを表示するにはログインしてください。");
        }
      } catch {
        setError("タスクの読み込みに失敗しました。");
      } finally {
        setLoading(false);
      }
    };

    initialize();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setUser(user);
      if (user) {
        initialize();
      } else {
        setError("タスクを表示するにはログインしてください。");
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [fetchTasks]);


  const handleSearch = () => {
    if (searchDate) {
      const date = new Date(searchDate);
      const utcDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
      setCurrentWeekStart(utcDate);
    }
  };

  const handlePreviousWeek = () => {
    setCurrentWeekStart(prev => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(prev => addWeeks(prev, 1));
  };

  const [newTaskDescription, setNewTaskDescription] = useState('');

  const handleAddTask = async () => {
    if (!newTaskDescription.trim()) {
      setError('タスクの内容を入力してください。');
      return;
    }
    if (!user) {
      setError('タスクを追加するにはログインしてください。');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/add-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ description: newTaskDescription }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error('Add API error payload:', json);
        throw new Error(json?.error || json?.detail || 'Failed to add task');
      }

      setNewTaskDescription('');
      setError(null);
      await fetchTasks(); // Refresh tasks from context
    } catch (err) {
      console.error('Error adding task:', err);
      setError('タスクの追加に失敗しました。');
    }
  };


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

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Delete API error payload:', json);
      throw new Error(json?.error || json?.detail || 'Failed to delete task');
    }

    await fetchTasks(); // Refresh tasks from context
  } catch (err) {
    console.error('Error deleting task:', err);
    setError('タスクの削除に失敗しました。');
  }
};

  // 置き換え：handleUpdateTask
  // 更新処理
const handleUpdateTask = async (taskId: number, newDescription: string) => {
  try {
    // ここでトークン取得
    const { data: { session } } = await supabase.auth.getSession();

    const response = await fetch('/api/update-task', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ task_id: taskId, description: newDescription }),
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      // サーバからのエラーをコンソールで詳細確認
      console.error('Update API error payload:', json);
      throw new Error(json?.error || json?.detail || 'Failed to update task');
    }
    
    await fetchTasks(); // Refresh tasks from context
    setEditingTaskId?.(null);
  } catch (err) {
    console.error('Error updating task:', err);
    setError('タスクの更新に失敗しました。');
  }
};

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 bg-gray-900 text-white pt-20">
      <div className="z-10 w-full max-w-6xl items-center justify-between font-mono text-sm flex flex-col text-center">
        <h1 className="text-3xl font-bold mb-8">あなたのタスク履歴</h1>
        <div className="w-full max-w-md mb-8">
          <div className="flex gap-2">
            <input 
              type="date" 
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="w-full px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              onClick={handleSearch}
              className="px-6 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              検索
            </button>
          </div>
        <br />
        <p>※上記検索フォームに日付を入力すると入力された
          <br />
          日付からの1週間分の検索ができます。</p>
        </div>
        {user && (
          <div className="w-full max-w-md mb-8">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="新しいタスクを追加"
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddTask();
                  }
                }}
                className="w-full px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddTask}
                className="px-6 py-2 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
              >
                追加
              </button>
            </div>
          </div>
        )}
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
            <WeeklyTaskCalendar 
              user={user} 
              tasks={weeklyTasks} 
              onDeleteTask={handleDeleteTask} 
              onUpdateTask={handleUpdateTask} 
              currentWeekStart={currentWeekStart}
              onPreviousWeek={handlePreviousWeek}
              onNextWeek={handleNextWeek}
            />
          </div>
        )}
      </div>
    </main>
  );
}