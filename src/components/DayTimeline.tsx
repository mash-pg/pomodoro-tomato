'use client';

import React from 'react';

interface PomodoroSession {
  created_at: string;
  duration_minutes: number;
}

interface DayTimelineProps {
  sessions: PomodoroSession[];
}

const DayTimeline: React.FC<DayTimelineProps> = ({ sessions }) => {
  const totalMinutesInDay = 24 * 60;

  return (
    <>
      {/* Mobile View: Horizontal Timeline */}
      <div className="w-full mt-2 md:hidden">
        <div className="relative h-6 bg-gray-700 rounded">
          {sessions.map((session, index) => {
            const sessionDate = new Date(session.created_at);
            const startMinuteOfDay = sessionDate.getHours() * 60 + sessionDate.getMinutes();
            const leftPercentage = (startMinuteOfDay / totalMinutesInDay) * 100;
            const widthPercentage = (session.duration_minutes / totalMinutesInDay) * 100;
            return (
              <div
                key={`h-${index}`}
                className="absolute h-full bg-blue-500 rounded opacity-75"
                style={{ left: `${leftPercentage}%`, width: `${widthPercentage}%` }}
              ></div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0h</span>
          <span>6h</span>
          <span>12h</span>
          <span>18h</span>
          <span>24h</span>
        </div>
      </div>

      {/* Desktop View: Vertical Timeline */}
      <div className="hidden md:flex flex-row gap-2 h-128 w-full justify-center">
        <div className="relative h-full text-lg text-gray-400 flex flex-col justify-between">
          <span>0h</span>
          <span>6h</span>
          <span>12h</span>
          <span>18h</span>
          <span>24h</span>
        </div>
        <div className="relative h-full w-12 bg-gray-700 rounded">
          {sessions.map((session, index) => {
            const sessionDate = new Date(session.created_at);
            const startMinuteOfDay = sessionDate.getHours() * 60 + sessionDate.getMinutes();
            const topPercentage = (startMinuteOfDay / totalMinutesInDay) * 100;
            const heightPercentage = (session.duration_minutes / totalMinutesInDay) * 100;
            return (
              <div
                key={`v-${index}`}
                className="absolute w-full bg-blue-500 rounded opacity-75"
                style={{ top: `${topPercentage}%`, height: `${heightPercentage}%` }}
              ></div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default DayTimeline;