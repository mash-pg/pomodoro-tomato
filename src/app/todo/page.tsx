"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';
import { useTodos } from '@/context/TodoContext';
import TodoList from '@/components/TodoList';

export default function TodoPage() {
  const { todos, fetchTodos } = useTodos();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTodoDescription, setNewTodoDescription] = useState('');
  // ▼▼ ここに追加（useEffect の前）▼▼
  const { allTodos, incompleteTodos, totalCount, completedCount } = useMemo(() => {
    const all = todos || [];
    const completed = all.filter(t => t.is_completed).length;
    return {
      allTodos: all,
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

  const handleUpdateTodo = async (todoId: number, newDescription: string, isCompleted: boolean) => {
    try {
      const response = await fetch('/api/update-todo', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ todo_id: todoId, description: newDescription, is_completed: isCompleted }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json?.error || json?.detail || 'Failed to update todo');
      }
      
      await fetchTodos();
    } catch (err) {
      console.error('Error updating todo:', err);
      setError('ToDoの更新に失敗しました。');
    }
  };

  const handleDeleteTodo = async (todoId: number) => {
    try {
      const response = await fetch('/api/delete-todo', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ todo_id: todoId }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json?.error || json?.detail || 'Failed to delete todo');
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
        <TodoList
          todos={incompleteTodos}                                   // 未完了のみ表示
          onUpdateTodo={handleUpdateTodo}
          onDeleteTodo={handleDeleteTodo}
          totals={{ total: totalCount, completed: completedCount }}  // 全体の合計/完了を渡す
        />
        )}
      </div>
    </main>
  );
}
