"use client";

import React, { useState, useMemo, useEffect } from "react";

interface Todo {
  id: number;
  description: string | null;
  is_completed: boolean;
}

interface TodoListProps {
  todos: Todo[]; // 親からは未完了のみ or 全件が来る想定
  // 🔧 変更：prevCompleted を第四引数で渡せるように
  onUpdateTodo: (
    todoId: number,
    newDescription: string,
    isCompleted: boolean,
    prevCompleted?: boolean
  ) => Promise<void>;
  onDeleteTodo: (todoId: number) => Promise<void>;
  totals?: { total: number; completed: number };
  title?: string;
  pageSize?: number;
  // ✅ 追加：親からもらう「今日の達成数」（DB基準）
  dailyCompleted?: number;
  containerTestId?: string; // ★ 追加
}

export default function TodoList({
  todos,
  onUpdateTodo,
  onDeleteTodo,
  totals,
  title,
  pageSize = 5,
  dailyCompleted = 0, // ✅ 追加：表示用
  containerTestId, // ★ 追加
}: TodoListProps) {
  const [editingTodoId, setEditingTodoId] = useState<number | null>(null);
  const [editedDescription, setEditedDescription] = useState<string>("");

  // 親集計（フォールバックあり）
  const total = totals?.total ?? todos.length;
  const completed = totals?.completed ?? 0;
  const remaining = total - completed;

  // ✅ 変更：localStorage 依存は廃止（DB基準になったため削除）
  //   - dailyCompleted は props で受け取り表示のみ行う

  const handleToggleComplete = async (todo: Todo) => {
    const next = !todo.is_completed;
    await onUpdateTodo(todo.id, todo.description || "", next, todo.is_completed);
  };


  const handleStartEdit = (todo: Todo) => {
    setEditingTodoId(todo.id);
    setEditedDescription(todo.description || "");
  };

  const handleCancelEdit = () => {
    setEditingTodoId(null);
    setEditedDescription("");
  };

  const handleSaveEdit = async (todo: Todo) => {
    await onUpdateTodo(todo.id, editedDescription, todo.is_completed, todo.is_completed);
    setEditingTodoId(null);
    setEditedDescription("");
  };

  // ===== ページング =====
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(todos.length / pageSize));

  useEffect(() => {
    setCurrentPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const { pageItems, rangeLabel } = useMemo(() => {
    if (todos.length === 0) {
      return { pageItems: [] as Todo[], rangeLabel: "0–0 / 0" };
    }
    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, todos.length);
    const humanStart = startIdx + 1;
    const humanEnd = endIdx;
    return {
      pageItems: todos.slice(startIdx, endIdx),
      rangeLabel: `${humanStart}–${humanEnd} / ${todos.length}`,
    };
  }, [todos, currentPage, pageSize]);

  const goToPage = (page: number) => {
    const clamped = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(clamped);
  };

  return (
    <div
      className="w-full bg-gray-800 p-8 rounded-lg shadow-xl border border-blue-500"
      data-testid={containerTestId} // ★ ここを追加
    >
      <h2 className="text-2xl font-bold mb-6 text-blue-400">
        {title ?? "未完了のタスク"}
      </h2>

      <div className="flex items-center gap-2 text-sm mb-4">
        <span className="px-2 py-1 rounded bg-gray-700 text-amber-300 border border-gray-600 text-2xl font-bold">
          未完了: {remaining}
        </span>
        <span className="px-2 py-1 rounded bg-gray-700 text-blue-300 border border-gray-600 text-2xl font-bold">
          今日の達成: {dailyCompleted}
        </span>
        <span className="px-2 py-1 rounded bg-gray-700 text-gray-100 border border-gray-600 text-xl">
          これまでの合計数: {total}
        </span>
        <span className="px-2 py-1 rounded bg-gray-700 text-emerald-300 border border-gray-600 text-xl">
          これまでの完了数: {completed}
        </span>
      </div>

      {/* ページング（ヘッダ） */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-300">表示: {rangeLabel}</div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 rounded border bg-gray-700 text-gray-100 border-gray-600 hover:bg-gray-600 disabled:opacity-50"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            ←
          </button>
          <span className="text-gray-300 text-sm">
            {currentPage} / {totalPages}
          </span>
          <button
            className="px-3 py-1 rounded border bg-gray-700 text-gray-100 border-gray-600 hover:bg-gray-600 disabled:opacity-50"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            →
          </button>
        </div>
      </div>

      {pageItems.length === 0 ? (
        <p className="text-gray-400">表示するタスクはありません。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-700 rounded-lg border border-gray-600">
            <thead>
              <tr>
                <th className="py-2 px-4 text-center text-red-500 border-r border-gray-600 border-b-4 border-gray-600 w-16">
                  完了
                </th>
                <th className="py-2 px-4 text-center text-red-500 border-r border-gray-600 border-b-4 border-gray-600">
                  内容
                </th>
                <th className="py-2 px-4 text-center text-red-500 border-b-4 border-gray-600 w-32">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((todo) => (
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
                      <span
                        className={`${
                          todo.is_completed
                            ? "line-through text-gray-500"
                            : "text-gray-200"
                        }`}
                      >
                        {todo.description ?? (
                          <em className="text-gray-500">（無題）</em>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-4 text-center flex justify-center items-center space-x-2">
                    {editingTodoId === todo.id ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(todo)}
                          className="p-1 rounded-full bg-green-600 hover:bg-green-700 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                          aria-label="Save todo"
                        >
                          ✓
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1 rounded-full bg-gray-600 hover:bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
                          aria-label="Cancel edit"
                        >
                          ×
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleStartEdit(todo)}
                        className="p-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Edit todo"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"
                          />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteTodo(todo.id)}
                      className="p-1 rounded-full bg-red-600 hover:bg-red-700 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      aria-label="Delete todo"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ページング（フッタ） */}
          <div className="flex items-center justify-between mt-3">
            <div className="text-sm text-gray-300">表示: {rangeLabel}</div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1 rounded border bg-gray-700 text-gray-100 border-gray-600 hover:bg-gray-600 disabled:opacity-50"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ←
              </button>
              <span className="text-gray-300 text-sm">
                {currentPage} / {totalPages}
              </span>
              <button
                className="px-3 py-1 rounded border bg-gray-700 text-gray-100 border-gray-600 hover:bg-gray-600 disabled:opacity-50"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
