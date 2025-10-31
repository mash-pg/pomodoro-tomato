"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';
import { useTodos } from '@/context/TodoContext';
import TodoList from '@/components/TodoList';
// ✅ 追加：DB 日次カウント用ヘルパ
import { getTodayCount, incTodayCount, decTodayCount } from "@/lib/dailyProgress";

type TodoRow = {
  id: number;
  description: string | null;
  is_completed: boolean;
  created_at: string;
  completed_at?: string | null; // ★ 追加（APIで返ってくる列）
};
// ★ 追加：UTCで「今日」判定
const isTodayUTC = (iso?: string | null) => {
  if (!iso) return false;
  const d = iso.slice(0, 10);                 // YYYY-MM-DD
  const today = new Date().toISOString().slice(0, 10);
  return d === today;
};

export default function TodoPage() {
  const { todos, fetchTodos } = useTodos();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTodoDescription, setNewTodoDescription] = useState('');
    // ✅ 追加：DBから取得する「今日の達成数」
  const [todayCompleted, setTodayCompleted] = useState(0);

  // ▼▼ ここに追加（useEffect の前）▼▼
  const { allTodos, incompleteTodos, totalCount, completedCount } = useMemo(() => {
    const all = (todos || []) as TodoRow[];
    const completed = all.filter(t => t.is_completed).length;
    return {
      allTodos: all.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      incompleteTodos: all.filter(t => !t.is_completed),
      totalCount: all.length,
      completedCount: completed,
    };
  }, [todos]);

  
  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        if (user) {
          await fetchTodos();
            // ✅ 追加：DBから今日の達成数を取得
            try {
              const c = await getTodayCount();
              setTodayCompleted(c);
            } catch (e) {
              console.error("getTodayCount error", e);
            }
        } else {
          setError("ToDoリストを表示するにはログインしてください。");
        }
      } catch {
        setError("ToDoの読み込みに失敗しました。");
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
        setError("ToDoリストを表示するにはログインしてください。");
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [fetchTodos]);

  // ✅ 追加：初回だけ localStorage → DB へ今日分を移行（あれば）
  useEffect(() => {
    const migrateLocal = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const DAILY_KEY = "daily_completed_count";
      const DATE_KEY = "daily_completed_date";
      const lsCount = Number(localStorage.getItem(DAILY_KEY) || 0);
      const lsDate = localStorage.getItem(DATE_KEY) || "";
      const todayLocal = new Date().toLocaleDateString();
      if (lsCount > 0 && lsDate === todayLocal) {
        try {
          await incTodayCount(lsCount);
          const c = await getTodayCount();
          setTodayCompleted(c);
        } catch (e) {
          console.error("migrate local->db error", e);
        }
      }
      // 移行後はクリア
      localStorage.removeItem(DAILY_KEY);
      localStorage.removeItem(DATE_KEY);
    };
    migrateLocal();
  }, []);

  const handleAddTodo = async () => {
    if (!newTodoDescription.trim()) {
      setError('ToDoの内容を入力してください。');
      return;
    }
    if (!user) {
      setError('ToDoを追加するにはログインしてください。');
      return;
    }

    try {
      const response = await fetch('/api/add-todo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description: newTodoDescription }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json?.error || json?.detail || 'Failed to add todo');
      }

      setNewTodoDescription('');
      setError(null);
      await fetchTodos();
    } catch (err) {
      console.error('Error adding todo:', err);
      setError('ToDoの追加に失敗しました。');
    }
  };

const handleUpdateTodo = async (
  todoId: number,
  newDescription: string,
  isCompleted: boolean,
  prevCompleted?: boolean
) => {
  try {
    // 対象todo（削除ではないので存在するはず）
    const before = (allTodos as TodoRow[]).find(t => t.id === todoId);

    const response = await fetch('/api/update-todo', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ todo_id: todoId, description: newDescription, is_completed: isCompleted }),
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json?.error || json?.detail || 'Failed to update todo');

    // 増減判定
    if (prevCompleted === false && isCompleted === true) {
      // 未完了 -> 完了
      await incTodayCount(1);
      setTodayCompleted(v => v + 1);
    } else if (prevCompleted === true && isCompleted === false) {
      // 完了 -> 未完了（今日完了分なら-1）
      if (before && isTodayUTC(before.completed_at)) {
        await decTodayCount(1);
        setTodayCompleted(v => Math.max(0, v - 1));
      }
    }

    await fetchTodos();
  } catch (err) {
    console.error('Error updating todo:', err);
    setError('ToDoの更新に失敗しました。');
  }
};


  // ★ 変更：handleDeleteTodo に減算ロジックを追加
  const handleDeleteTodo = async (todoId: number) => {
    try {
      // 削除前に対象を掴んでおく
      const before = (allTodos as TodoRow[]).find(t => t.id === todoId);

      const response = await fetch('/api/delete-todo', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ todo_id: todoId }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.error || json?.detail || 'Failed to delete todo');

      // もし「完了済」かつ「今日完了」だったら -1
      if (before?.is_completed && isTodayUTC(before.completed_at)) {
        await decTodayCount(1);
        setTodayCompleted(v => Math.max(0, v - 1));
      }

      await fetchTodos();
    } catch (err) {
      console.error('Error deleting todo:', err);
      setError('ToDoの削除に失敗しました。');
    }
  };
  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 bg-gray-900 text-white pt-20">
      <div className="z-10 w-full max-w-4xl items-center justify-between font-mono text-sm flex flex-col text-center">
        <h1 className="text-3xl font-bold mb-8">ToDoリスト</h1>
        
        {user && (
          <div className="w-full max-w-md mb-8">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="新しいToDoを追加"
                value={newTodoDescription}
                onChange={(e) => setNewTodoDescription(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddTodo();
                  }
                }}
                className="w-full px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddTodo}
                className="px-6 py-2 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
              >
                追加
              </button>
            </div>
          </div>
        )}

        {loading && <p className="text-gray-400">ToDoを読み込み中...</p>}
        {error && <p className="text-red-500 mb-4">{error}</p>}

        {!user && !loading && !error && <p className="text-gray-400">ToDoリストを表示するにはログインしてください。</p>}

        {user && !loading && !error && (
        <>
          {/* 未完了のみ（タイトル任意。ページング不要なら pageSize 省略） */}
          <TodoList
            title="未完了のタスク"
            todos={incompleteTodos}
            onUpdateTodo={handleUpdateTodo}
            onDeleteTodo={handleDeleteTodo}
            totals={{ total: totalCount, completed: completedCount }}
            pageSize={15}   // ★ ここを追加：1ページ15件表示
            // ✅ 追加：親で持つ「今日の達成数」を渡す
            dailyCompleted={todayCompleted}
            containerTestId="incomplete-list"   // ★ 追加
          />

          {/* これまでの ToDo（全件） → 10件/ページ */}
          <div className="mt-8 w-full">
            <TodoList
              title="これまでのタスク（全件）"
              todos={allTodos}
              onUpdateTodo={handleUpdateTodo}
              onDeleteTodo={handleDeleteTodo}
              totals={{ total: totalCount, completed: completedCount }}
              pageSize={10}   // ★ 10件/ページ
              // ✅ 追加：同様に渡す
              dailyCompleted={todayCompleted}
              containerTestId="all-list"         // ★ 追加
            />
          </div>
        </>
        )}
      </div>
    </main>
  );
}
