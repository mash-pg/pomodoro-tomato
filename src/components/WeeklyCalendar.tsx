"use client";

import { useState } from "react";

import { User } from "@supabase/supabase-js";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay } from "date-fns";
import { ja } from "date-fns/locale"; // 日本語ロケールをインポート

interface PomodoroSession {
  id: number;
  created_at: string;
  duration_minutes: number;
  user_id: string;
}

interface WeeklyCalendarProps {
  user: User | null;
  sessions: PomodoroSession[];
}

export default function WeeklyCalendar({ user, sessions }: WeeklyCalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 0 })); // 週の始まりを日曜日に設定

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

  const getPomodorosForDay = (date: Date) => {
    return sessions.filter(session =>
      isSameDay(new Date(session.created_at), date)
    ).length;
  };

  

  if (!user) {
    return null; // User should be handled by parent component
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">週ごとのポモドーロ</h2>
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
        {daysInWeek.map(day => (
          <div key={day.toISOString()} className="p-2 border border-gray-700 rounded-md">
            <div className="font-bold text-lg">{format(day, "EEE", { locale: ja })}</div> {/* 曜日 */}
            <div className="text-sm">{format(day, "MM/dd")}</div> {/* 月/日 */}
            <div className="mt-2 text-blue-400 text-xl font-bold">
              {getPomodorosForDay(day)}
            </div>
            <div className="text-xs text-gray-400">ポモドーロ</div>
          </div>
        ))}
      </div>
    </div>
  );
}