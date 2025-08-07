"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { useSettings } from './SettingsContext';

type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak';

interface TimerContextProps {
  mode: TimerMode;
  minutes: number;
  seconds: number;
  isActive: boolean;
  isPaused: boolean;
  pomodoroCount: number;
  lastCompletedMode: TimerMode | null; // To track which timer finished
  completionCount: number; // To trigger sound effect
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  setMode: (mode: TimerMode) => void;
  setPomodoroCount: (count: number) => void;
}

const TimerContext = createContext<TimerContextProps | undefined>(undefined);

export const TimerProvider = ({ children }: { children: ReactNode }) => {
  const {
    workDuration,
    shortBreakDuration,
    longBreakDuration,
    longBreakInterval,
    autoStartWork,
    autoStartBreak,
  } = useSettings();

  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [minutes, setMinutes] = useState(workDuration);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [lastCompletedMode, setLastCompletedMode] = useState<TimerMode | null>(null);
  const [completionCount, setCompletionCount] = useState(0);


  // Restore state from localStorage on initial mount
  useEffect(() => {
    if (typeof window !== 'undefined') { // Check if window is defined
      try {
        const savedStateJSON = localStorage.getItem('pomodoroTimerState');
        if (savedStateJSON) {
          const savedState = JSON.parse(savedStateJSON);
          if (savedState) {
            setMode(savedState.mode ?? 'pomodoro');
            setIsActive(savedState.isActive ?? false);
            setIsPaused(savedState.isPaused ?? false);
            setPomodoroCount(savedState.pomodoroCount ?? 0);

            // Only restore the exact time if the timer was running or paused.
            // Otherwise, the other useEffect will set the correct duration from settings.
            if (savedState.isActive || savedState.isPaused) {
              setMinutes(savedState.minutes);
              setSeconds(savedState.seconds);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load timer state from localStorage", error);
      }
    }
    setIsInitialLoad(false); // Mark initial load as complete
  }, []); // This effect runs only once on mount

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') { // Check if window is defined
      try {
        const stateToSave = {
          mode,
          minutes,
          seconds,
          isActive,
          isPaused,
          pomodoroCount,
        };
        localStorage.setItem('pomodoroTimerState', JSON.stringify(stateToSave));
      } catch (error) {
        console.error("Failed to save timer state to localStorage", error);
      }
    }
  }, [mode, minutes, seconds, isActive, isPaused, pomodoroCount]);

  // Get user data
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }
    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user || null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);
  const startTimer = useCallback(() => {
    setIsActive(true);
    setIsPaused(false);
  }, []);

  const pauseTimer = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resetTimer = useCallback(() => {
    setIsActive(false);
    setIsPaused(false);
    switch (mode) {
      case 'pomodoro': setMinutes(workDuration); break;
      case 'shortBreak': setMinutes(shortBreakDuration); break;
      case 'longBreak': setMinutes(longBreakDuration); break;
    }
    setSeconds(0);
  }, [mode, workDuration, shortBreakDuration, longBreakDuration]);
// Core timer logic (依存配列も完璧なバージョン)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && !isPaused) {
      interval = setInterval(() => {
        if (seconds > 0) {
          setSeconds((s) => s - 1);
        } else if (minutes > 0) {
          setMinutes((m) => m - 1);
          setSeconds(59);
        } else {
          // --- Timer Completion ---
          setLastCompletedMode(mode);
          setCompletionCount(c => c + 1);
          setIsActive(false);
          setIsPaused(false);

          if (mode === 'pomodoro') {
            if (user) {
              const saveSession = async () => {
                const { error } = await supabase
                  .from('pomodoro_sessions')
                  .insert({ user_id: user.id, duration_minutes: workDuration });
                if (error) console.error('Error saving session:', error);
              };
              saveSession();
            }

            const newPomodoroCount = pomodoroCount + 1;
            setPomodoroCount(newPomodoroCount);
            const nextMode: TimerMode = newPomodoroCount % longBreakInterval === 0 ? 'longBreak' : 'shortBreak';
            const nextMinutes: number = nextMode === 'longBreak' ? longBreakDuration : shortBreakDuration;

            setMode(nextMode);
            setMinutes(nextMinutes);
            setSeconds(0);

            if (autoStartBreak) {
              startTimer();
            }

          } else {
            const nextMode: TimerMode = 'pomodoro';
            const nextMinutes: number = workDuration;

            setMode(nextMode);
            setMinutes(nextMinutes);
            setSeconds(0);

            if (autoStartWork) {
              startTimer();
            }
          }
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [
    isActive,
    isPaused,
    seconds,
    minutes,
    mode,
    user,
    workDuration,
    pomodoroCount,
    longBreakInterval,
    autoStartBreak,
    autoStartWork,
    startTimer,
    shortBreakDuration,
    longBreakDuration,
  ]);

  // Update timer display when settings/mode change, but only for a stopped timer.
  useEffect(() => {
    if (isInitialLoad) return; // Don't run on initial load
    if (!isActive && !isPaused) {
      switch (mode) {
        case 'pomodoro': setMinutes(workDuration); break;
        case 'shortBreak': setMinutes(shortBreakDuration); break;
        case 'longBreak': setMinutes(longBreakDuration); break;
      }
      setSeconds(0);
    }
  }, [mode, workDuration, shortBreakDuration, longBreakDuration, isActive, isPaused, isInitialLoad]);

  const value = {
    mode,
    minutes,
    seconds,
    isActive,
    isPaused,
    pomodoroCount,
    lastCompletedMode,
    completionCount,
    startTimer,
    pauseTimer,
    resetTimer,
    setMode,
    setPomodoroCount,
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
};

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimer must be used within a SettingsProvider');
  }
  return context;
};