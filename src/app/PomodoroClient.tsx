"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import SettingsModal from "@/components/SettingsModal";
import { useSettings } from "@/context/SettingsContext";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";

// Define types for clarity
type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak';

interface PomodoroSession {
  id: number;
  created_at: string;
  duration_minutes: number;
  user_id: string;
}

// UserSettings interface is no longer directly used here, but kept for reference if needed elsewhere.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface UserSettings {
  user_id: string;
  work_minutes: number;
  short_break_minutes: number;
  long_break_minutes: number;
  long_break_interval: number;
  auto_start_work: boolean;
  auto_start_break: boolean;
  mute_notifications: boolean; // Added for Supabase settings
  dark_mode: boolean; // Added for Supabase settings
}

export default function PomodoroClient() {
  // --- Timer Settings ---
  const [workDuration, setWorkDuration] = useState(25); // minutes
  const [shortBreakDuration, setShortBreakDuration] = useState(5); // minutes
  const [longBreakDuration, setLongBreakDuration] = useState(15); // minutes
  const [longBreakInterval, setLongBreakInterval] = useState(4); // pomodoros
  const [autoStartWork, setAutoStartWork] = useState(false);
  const [autoStartBreak, setAutoStartBreak] = useState(false);
  const [muteNotifications, setMuteNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(true); // Default to dark mode

  // --- Timer State ---
  const [currentMode, setCurrentMode] = useState<TimerMode>('pomodoro');
  const [minutes, setMinutes] = useState(workDuration);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0); // Completed pomodoro sessions (current session)

  // --- User and Session Data ---
  const [user, setUser] = useState<User | null>(null);
  const [allSessions, setAllSessions] = useState<PomodoroSession[]>([]);
  const [dailyStats, setDailyStats] = useState({ count: 0, time: 0 });
  const [weeklyStats, setWeeklyStats] = useState({ count: 0, time: 0 });
  const [monthlyStats, setMonthlyStats] = useState({ count: 0, time: 0 });

  // --- UI State (from Context) ---
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { showSettingsModal, setShowSettingsModal, settingsRef } = useSettings(); // Get settingsRef from context

  // --- Refs for audio ---
  const pomodoroEndAudioRef = useRef<HTMLAudioElement | null>(null);
  const shortBreakEndAudioRef = useRef<HTMLAudioElement | null>(null);
  const longBreakEndAudioRef = useRef<HTMLAudioElement | null>(null);

  // --- Helper to get current duration based on mode ---
  const getDuration = useCallback((mode: TimerMode) => {
    switch (mode) {
      case 'pomodoro':
        return workDuration;
      case 'shortBreak':
        return shortBreakDuration;
      case 'longBreak':
        return longBreakDuration;
      default:
        return workDuration; // Fallback
    }
  }, [workDuration, shortBreakDuration, longBreakDuration]);

  // --- Effect to update timer display when mode or settings change ---
  useEffect(() => {
    if (!isActive) {
      setMinutes(getDuration(currentMode));
      setSeconds(0);
    }
  }, [currentMode, isActive, getDuration]);

  // --- Settings Modal Controls ---
  const handleSaveSettings = useCallback(async (settings: Parameters<typeof SettingsModal>[0]['initialSettings']) => {
    setWorkDuration(settings.workDuration);
    setShortBreakDuration(settings.shortBreakDuration);
    setLongBreakDuration(settings.longBreakDuration);
    setLongBreakInterval(settings.longBreakInterval);
    setAutoStartWork(settings.autoStartWork);
    setAutoStartBreak(settings.autoStartBreak);
    setMuteNotifications(settings.muteNotifications);
    setDarkMode(settings.darkMode);

    // Save settings to Supabase
    if (user) {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          work_minutes: settings.workDuration,
          short_break_minutes: settings.shortBreakDuration,
          long_break_minutes: settings.longBreakDuration,
          long_break_interval: settings.longBreakInterval,
          auto_start_work: settings.autoStartWork,
          auto_start_break: settings.autoStartBreak,
          mute_notifications: settings.muteNotifications,
          dark_mode: settings.darkMode,
        });
      if (error) {
        console.error('Error saving user settings:', JSON.stringify(error, null, 2));
      }
    }
  }, [user]); // Added user to dependency array

  // --- Update settingsRef for GlobalSettingsModalWrapper ---
  useEffect(() => {
    settingsRef.current = {
      initialSettings: {
        workDuration,
        shortBreakDuration,
        longBreakDuration,
        longBreakInterval,
        autoStartWork,
        autoStartBreak,
        muteNotifications,
        darkMode,
      },
      onSave: handleSaveSettings,
    };
  }, [workDuration, shortBreakDuration, longBreakDuration, longBreakInterval, autoStartWork, autoStartBreak, muteNotifications, darkMode, handleSaveSettings, settingsRef]);

  // --- Fetch user, sessions, and settings on mount and auth state change ---
  useEffect(() => {
    const fetchUserAndData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Fetch sessions
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('pomodoro_sessions')
          .select('created_at, duration_minutes')
          .eq('user_id', user.id);

        if (sessionsError) {
          console.error('Error fetching sessions:', JSON.stringify(sessionsError, null, 2));
        } else {
          setAllSessions(sessionsData as PomodoroSession[]);
        }

        // Fetch settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('user_settings')
          .select('work_minutes, short_break_minutes, long_break_minutes, long_break_interval, auto_start_work, auto_start_break, mute_notifications, dark_mode')
          .eq('user_id', user.id)
          .single();

        if (settingsError && settingsError.code !== 'PGRST116') { // PGRST116 means no rows found
          console.error('Error fetching settings:', JSON.stringify(settingsError, null, 2));
        } else if (settingsData) {
          setWorkDuration(settingsData.work_minutes);
          setShortBreakDuration(settingsData.short_break_minutes);
          setLongBreakDuration(settingsData.long_break_minutes);
          setLongBreakInterval(settingsData.long_break_interval);
          setAutoStartWork(settingsData.auto_start_work);
          setAutoStartBreak(settingsData.auto_start_break);
          setMuteNotifications(settingsData.mute_notifications);
          setDarkMode(settingsData.dark_mode);
        }
      } else {
        setAllSessions([]); // Clear sessions if no user
        // Reset settings to default if no user
        setWorkDuration(25);
        setShortBreakDuration(5);
        setLongBreakDuration(15);
        setAutoStartWork(false);
        setAutoStartBreak(false);
        setMuteNotifications(false);
        setDarkMode(true);
      }
    };

    fetchUserAndData();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      fetchUserAndData(); // Re-fetch when auth state changes
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [getDuration]);

  // --- Calculate statistics whenever allSessions changes ---
  useEffect(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay())); // Sunday
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let dailyCount = 0;
    let dailyTime = 0;
    let weeklyCount = 0;
    let weeklyTime = 0;
    let monthlyCount = 0;
    let monthlyTime = 0;

    allSessions.forEach(session => {
      const sessionDate = new Date(session.created_at);

      // Daily
      if (sessionDate.toDateString() === now.toDateString()) {
        dailyCount++;
        dailyTime += session.duration_minutes;
      }

      // Weekly
      if (sessionDate >= startOfWeek) {
        weeklyCount++;
        weeklyTime += session.duration_minutes;
      }

      // Monthly
      if (sessionDate >= startOfMonth) {
        monthlyCount++;
        monthlyTime += session.duration_minutes;
      }
    });

    setDailyStats({ count: dailyCount, time: dailyTime });
    setWeeklyStats({ count: weeklyCount, time: weeklyTime });
    setMonthlyStats({ count: monthlyCount, time: monthlyTime });

  }, [allSessions]);

  // --- Core Timer Logic ---
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive) {
      interval = setInterval(() => {
        if (seconds > 0) {
          setSeconds((s) => s - 1);
        } else if (minutes > 0) {
          setMinutes((m) => m - 1);
          setSeconds(59);
        } else {
          // Session finished
          clearInterval(interval!); // Clear current interval
          setIsActive(false); // Stop timer

          if (!muteNotifications) {
            if (currentMode === 'pomodoro') {
              pomodoroEndAudioRef.current?.play();
            } else if (currentMode === 'shortBreak') {
              shortBreakEndAudioRef.current?.play();
            } else if (currentMode === 'longBreak') {
              longBreakEndAudioRef.current?.play();
            }
          }

          if (currentMode === 'pomodoro') {
            // Save session to Supabase
            if (user) {
              const saveSession = async () => {
                const { error } = await supabase
                  .from('pomodoro_sessions')
                  .insert({
                    user_id: user.id,
                    duration_minutes: workDuration,
                  });
                if (error) {
                  console.error('Error saving session:', JSON.stringify(error, null, 2));
                } else {
                  // Re-fetch sessions to update stats
                  const { data, error: fetchError } = await supabase
                    .from('pomodoro_sessions')
                    .select('created_at, duration_minutes')
                    .eq('user_id', user.id);
                  if (fetchError) {
                    console.error('Error re-fetching sessions:', JSON.stringify(fetchError, null, 2));
                  } else {
                    setAllSessions(data as PomodoroSession[]);
                  }
                }
              };
              saveSession();
            }

            setPomodoroCount((prevCount) => prevCount + 1);
            // Determine next break type
            const nextMode: TimerMode = (pomodoroCount + 1) % longBreakInterval === 0
              ? 'longBreak'
              : 'shortBreak';
            setCurrentMode(nextMode);
            if (autoStartBreak) {
              setIsActive(true);
            }
          } else { // It was a break (short or long)
            setCurrentMode('pomodoro');
            if (autoStartWork) {
              setIsActive(true);
            }
          }
        }
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isActive, seconds, minutes, currentMode, pomodoroCount, longBreakInterval, autoStartWork, autoStartBreak, user, workDuration, muteNotifications]);

  // --- Timer Controls ---
  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setMinutes(getDuration(currentMode));
    setSeconds(0);
  };

  const handleModeChange = (mode: TimerMode) => {
    setIsActive(false);
    setCurrentMode(mode);
  };

  // --- Render --- 
  return (
    <main className={`flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <div className="z-10 w-full max-w-lg items-center justify-between font-mono text-sm flex flex-col text-center">

        {/* Mode Switcher */}
        <div className="flex justify-center bg-gray-800 rounded-full p-1 mb-8 w-full max-w-xs">
          <button
            onClick={() => handleModeChange('pomodoro')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${currentMode === 'pomodoro' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          >
            ポモドーロ
          </button>
          <button
            onClick={() => handleModeChange('shortBreak')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${currentMode === 'shortBreak' ? 'bg-green-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          >
            短い休憩
          </button>
          <button
            onClick={() => handleModeChange('longBreak')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${currentMode === 'longBreak' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          >
            長い休憩
          </button>
        </div>

        {/* Timer Display */}
        <div className="text-9xl font-bold mb-8 tracking-wide">
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </div>

        {/* Controls */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={toggleTimer}
            className={`py-3 px-8 rounded-lg text-2xl font-bold uppercase transition-colors duration-200
              ${isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}
              text-white shadow-lg`}
          >
            {isActive ? "一時停止" : "開始"}
          </button>
          <button
            onClick={resetTimer}
            className="py-3 px-8 rounded-lg text-2xl font-bold uppercase bg-gray-600 hover:bg-gray-700 text-white shadow-lg"
          >
            リセット
          </button>
        </div>

        {/* Statistics Display */}
        {user && (
          <div className="mt-12 text-lg text-left w-full max-w-xs">
            <h2 className="text-xl font-bold mb-4">あなたのポモドーロ統計</h2>
            <div className="bg-gray-800 p-4 rounded-lg shadow-md">
              <p className="mb-2">今日: <span className="font-bold">{dailyStats.count}</span> ポモドーロ / <span className="font-bold">{dailyStats.time}</span> 分</p>
              <p className="mb-2">今週: <span className="font-bold">{weeklyStats.count}</span> ポモドーロ / <span className="font-bold">{weeklyStats.time}</span> 分</p>
              <p>今月: <span className="font-bold">{monthlyStats.count}</span> ポモドーロ / <span className="font-bold">{monthlyStats.time}</span> 分</p>
            </div>
          </div>
        )}

        {/* Audio Elements */}
        <audio ref={pomodoroEndAudioRef} src="/sounds/pomodoro_end.mp3" preload="auto" />
        <audio ref={shortBreakEndAudioRef} src="/sounds/short_break_end.mp3" preload="auto" />
        <audio ref={longBreakEndAudioRef} src="/sounds/long_break_end.mp3" preload="auto" />

      </div>
    </main>
  );
}
