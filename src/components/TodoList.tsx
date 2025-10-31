"use client";

import React, { useState, useEffect } from 'react'; // ← useEffect を追加！

interface Todo {
  id: number;
  description: string | null;
  is_completed: boolean;
}

interface TodoListProps {
  todos: Todo[]; // 親からは未完了のみが来る想定
  onUpdateTodo: (todoId: number, newDescription: string, isCompleted: boolean) => Promise<void>;
  onDeleteTodo: (todoId: number) => Promise<void>;
  totals?: { total: number; completed: number }; // ★ 親からの全体集計
}

export default function TodoList({ todos, onUpdateTodo, onDeleteTodo, totals }: TodoListProps) {
  const [editingTodoId, setEditingTodoId] = useState<number | null>(null);
  const [editedDescription, setEditedDescription] = useState<string>('');

  // ★ 親集計を使う（なければフォールバック）
  const total = totals?.total ?? todos.length;
  const completed = totals?.completed ?? 0;
  const remaining = total - completed;
  // ✅ デイリーカウント管理
  const DAILY_KEY = "daily_completed_count";
  const DATE_KEY = "daily_completed_date";
  const [dailyCompleted, setDailyCompleted] = useState(0);
  useEffect(() => {
    const savedCount = Number(localStorage.getItem(DAILY_KEY) || 0);
    const savedDate = localStorage.getItem(DATE_KEY);
    const today = new Date().toLocaleDateString();

    if (savedDate === today) {
      setDailyCompleted(savedCount);
    } else {
      localStorage.setItem(DATE_KEY, today);
      localStorage.setItem(DAILY_KEY, "0");
      setDailyCompleted(0);
    }
  }, []);

  const handleToggleComplete = async (todo: Todo) => {
    
    const nextCompleted = !todo.is_completed;
    
    await onUpdateTodo(todo.id, todo.description || '', nextCompleted);

    if (!todo.is_completed && nextCompleted) {
      const newCount = dailyCompleted + 1;
      setDailyCompleted(newCount);
      localStorage.setItem(DAILY_KEY, String(newCount));
    }
  };

  const handleStartEdit = (todo: Todo) => {
    setEditingTodoId(todo.id);
    setEditedDescription(todo.description || '');
  };

  const handleCancelEdit = () => {
    setEditingTodoId(null);
    setEditedDescription('');
  };

  const handleSaveEdit = async (todo: Todo) => {
    await onUpdateTodo(todo.id, editedDescription, todo.is_completed);
    setEditingTodoId(null);
    setEditedDescription('');
  };

  return (
    <div className="w-full bg-gray-800 p-8 rounded-lg shadow-xl border border-blue-500">
      <h2 className="text-2xl font-bold mb-6 text-blue-400">未完了のタスク</h2>

      <div className="flex items-center gap-2 text-sm mb-4">
        <span className="px-2 py-1 rounded bg-gray-700 text-amber-300 border border-gray-600 text-2xl font-bold">未完了: {remaining}</span>
        <span className="px-2 py-1 rounded bg-gray-700 text-blue-300 border border-gray-600 text-2xl font-bold">今日の達成: {dailyCompleted}</span>
        <span className="px-2 py-1 rounded bg-gray-700 text-gray-100 border border-gray-600 text-xl">これまでの合計数: {total}</span>
        <span className="px-2 py-1 rounded bg-gray-700 text-emerald-300 border border-gray-600 text-xl">これまでの完了数: {completed}</span>
      </div>

      {todos.length === 0 ? (
        <p className="text-gray-400">未完了のタスクはありません。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-700 rounded-lg border border-gray-600">
            <thead>
              <tr>
                <th className="py-2 px-4 text-center text-red-500 border-r border-gray-600 border-b-4 border-gray-600 w-16">完了</th>
                <th className="py-2 px-4 text-center text-red-500 border-r border-gray-600 border-b-4 border-gray-600">内容</th>
                <th className="py-2 px-4 text-center text-red-500 border-b-4 border-gray-600 w-32">操作</th>
              </tr>
            </thead>
            <tbody>
              {todos.map(todo => (
                <tr key={todo.id} className="border-t border-gray-600">
                  <td className="py-2 px-4 text-center border-r border-gray-600">
                    <input
                      type="checkbox"
                      checked={todo.is_completed}
                      onChange={() => handleToggleComplete(todo)}
                      className="form-checkbox h-5 w-5 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-2 px-4 text-left border-r border-gray-600">
                    {editingTodoId === todo.id ? (
                      <input
                        type="text"
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        className="w-full bg-gray-700 text-white border border-gray-600 rounded px-2 py-1"
                      />
                    ) : (
                      <span className={`${todo.is_completed ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                        {todo.description}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-4 text-center flex justify-center items-center space-x-2">
                    {editingTodoId === todo.id ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(todo)}
                          className="p-1 rounded-full bg-green-600 hover:bg-green-700 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                          aria-label="Save todo"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={handleCancelEdit}
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
                        onClick={() => handleStartEdit(todo)}
                        className="p-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                        aria-label="Edit todo"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteTodo(todo.id)}
                      className="p-1 rounded-full bg-red-600 hover:bg-red-700 text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                      aria-label="Delete todo"
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
  );
}
