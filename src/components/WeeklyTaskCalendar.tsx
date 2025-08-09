"use client";

import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay } from "date-fns";
import { ja } from "date-fns/locale/ja";

interface Task {
  id: number;
  user_id: string;
  description: string | null;
  created_at: string;
}

interface WeeklyTaskCalendarProps {
  user: User | null;
  tasks: Task[]; // Change sessions to tasks
  onDeleteTask: (taskId: number) => void;
  onUpdateTask: (taskId: number, newDescription: string) => Promise<void>; // Add onUpdateTask prop
}

export default function WeeklyTaskCalendar({ user, tasks, onDeleteTask, onUpdateTask }: WeeklyTaskCalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 0 })); // 週の始まりを日曜日に設定
  const [selectedDateTasks, setSelectedDateTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editedDescription, setEditedDescription] = useState<string>('');

  const daysInWeek = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfWeek(currentWeekStart, { weekStartsOn: 0 })
  });

  const handlePreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const getTasksForDay = (date: Date) => {
    return tasks.filter(task =>
      isSameDay(new Date(task.created_at), date)
    );
  };

  const handleDayClick = (date: Date) => {
    const tasksForThisDay = getTasksForDay(date);
    setSelectedDateTasks(tasksForThisDay);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedDateTasks([]);
  };

  if (!user) {
    return null; // User should be handled by parent component
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">週ごとのタスク</h2>
      <div className="flex justify-between items-center mb-4">
        <button onClick={handlePreviousWeek} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white">
          &lt; 前の週
        </button>
        <h3 className="text-xl font-semibold">
          {format(currentWeekStart, "yyyy年MM月dd日", { locale: ja })} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 0 }), "yyyy年MM月dd日", { locale: ja })}
        </h3>
        <button onClick={handleNextWeek} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white">
          次の週 &gt;
        </button>
      </div>
      <div className="grid grid-cols-7 gap-2 text-center">
        {daysInWeek.map(day => {
          const tasksForDay = getTasksForDay(day);
          const hasTasks = tasksForDay.length > 0;
          return (
            <div
              key={day.toISOString()}
              className={`p-2 border border-gray-700 rounded-md cursor-pointer ${hasTasks ? 'bg-blue-700' : ''}`}
              onClick={() => handleDayClick(day)}
            >
              <div className="font-bold text-lg text-white">{format(day, "EEE", { locale: ja })}</div> {/* 曜日 */}
              <div className="text-sm text-white">{format(day, "MM/dd")}</div> {/* 月/日 */}
              <div className="mt-2 text-blue-400 text-xl font-bold">
                {hasTasks ? tasksForDay.length : ''}
              </div>
              <div className="text-xs text-gray-400">タスク</div>
            </div>
          );
        })}
      </div>

      {/* Task Detail Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-white">
              {selectedDateTasks.length > 0 ? format(new Date(selectedDateTasks[0].created_at), "yyyy年MM月dd日 (EEE)", { locale: ja }) : 'タスク詳細'}
            </h2>
            {selectedDateTasks.length === 0 ? (
              <p className="text-gray-400">この日にはタスクがありません。</p>
            ) : (
            <table className="min-w-full bg-gray-700 rounded-lg border border-gray-600">
              <thead>
                <tr>
                  <th className="py-2 px-4 text-center text-blue-500 border-r border-gray-600 border-b-4 border-gray-600">
                    時間
                  </th>
                  <th className="py-2 px-4 text-center text-black border-r border-gray-600 border-b-5 border-gray-600">
                    タスク内容
                  </th>
                  <th className="py-2 px-4 text-center text-red-500 border-b-4 border-gray-600" >
                    削除
                  </th>
                </tr>
              </thead>
              <tbody>
                {selectedDateTasks.map((task) => (
                  <tr key={task.id} className="border-t border-gray-600">
                    <td className="py-2 px-4 text-center text-gray-200 border-r border-gray-600">
                      {format(new Date(task.created_at), "HH:mm")}
                    </td>
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
                            onClick={async () => {
                              await onUpdateTask(task.id, editedDescription);
                              setSelectedDateTasks((prev) =>
                                prev.map((t) =>
                                  t.id === task.id ? { ...t, description: editedDescription } : t
                                )
                              );
                              setEditingTaskId(null);
                            }}
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
                        onClick={async () => {
                          await onDeleteTask(task.id);
                          setSelectedDateTasks((prev) => prev.filter((t) => t.id !== task.id));
                        }}
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

            )}
            <div className="flex justify-end mt-6">
              <button onClick={closeModal} className="py-2 px-5 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
