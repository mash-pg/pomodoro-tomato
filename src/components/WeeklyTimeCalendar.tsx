"use client";

import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay } from "date-fns";
import { ja } from "date-fns/locale/ja";
import dynamic from "next/dynamic";

const DynamicDayTimeline = dynamic(() => import("./DayTimeline"), { ssr: false });

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

export default function WeeklyTimeCalendar({ user, sessions }: WeeklyCalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 0 }));

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

  const getPomodoroTimeForDay = (date: Date) => {
    return sessions
      .filter(session => isSameDay(new Date(session.created_at), date))
      .reduce((total, session) => total + session.duration_minutes, 0);
  };

  const getSessionsForDay = (date: Date) => {
    return sessions.filter(session => isSameDay(new Date(session.created_at), date));
  };

  if (!user) {
    return null;
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">週ごとのポモドーロ (時間)</h2>
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
      {/* Responsive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 text-center">
        {daysInWeek.map(day => (
          <div key={day.toISOString()} className="p-2 md:p-4 border border-gray-700 rounded-md flex flex-row md:flex-col items-center md:items-center gap-4">
            {/* Date Info */}
            <div className="text-center w-24 md:w-full flex-shrink-0 md:flex-shrink-1">
              <div className="font-bold text-lg">{format(day, "EEE", { locale: ja })}</div>
              <div className="text-sm">{format(day, "MM/dd")}</div>
              <div className="mt-2 text-green-400 text-xl font-bold">
                {(getPomodoroTimeForDay(day) / 60).toFixed(1)}
              </div>
              <div className="text-xs text-gray-400 mb-0 md:mb-4">時間</div>
            </div>
            {/* Timeline */}
            <div className="flex-grow w-full">
              <DynamicDayTimeline sessions={getSessionsForDay(day)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
