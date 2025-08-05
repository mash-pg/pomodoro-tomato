"use client";

import { useState, useEffect, useRef, useCallback } from "react";

import { useSettings } from "@/context/SettingsContext";
import { useTimer } from "@/context/TimerContext"; // Import useTimer
import { supabase } from "@/lib/supabaseClient";
import { User, AuthChangeEvent, Session } from "@supabase/supabase-js";
import { SettingsModalProps } from "@/components/SettingsModal";

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
  const [isClient, setIsClient] = useState(false); // Add this state
  
  const { theme, setTheme, darkMode, setDarkMode } = useSettings();

  // --- Timer State (from Context) ---
  const {
    mode: currentMode,
    minutes,
    seconds,
    isActive,
    isPaused,
    lastCompletedMode, // Get the last completed mode
    completionCount, // Get the completion counter
    startTimer,
    pauseTimer,
    resetTimer,
    setMode: setCurrentMode,
  } = useTimer();


  // --- User and Session Data ---
  const [user, setUser] = useState<User | null>(null);
  const [allSessions, setAllSessions] = useState<PomodoroSession[]>([]);
  const [dailyStats, setDailyStats] = useState({ count: 0, time: 0 });
  const [weeklyStats, setWeeklyStats] = useState({ count: 0, time: 0 });
  const [monthlyStats, setMonthlyStats] = useState({ count: 0, time: 0 });

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(true);
  const [subscriptionStatusMessage, setSubscriptionStatusMessage] = useState('');

  // --- Refs for audio ---
  const pomodoroEndAudioRef = useRef<HTMLAudioElement | null>(null);
  const shortBreakEndAudioRef = useRef<HTMLAudioElement | null>(null);
  const longBreakEndAudioRef = useRef<HTMLAudioElement | null>(null);

  // --- UI State (from Context) ---
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { showSettingsModal, setShowSettingsModal, settingsRef } = useSettings(); // Get settingsRef from context

  useEffect(() => {
    const audioRefs = [pomodoroEndAudioRef, shortBreakEndAudioRef, longBreakEndAudioRef];
    let canPlayThroughCount = 0;

    const handleCanPlay = () => {
      canPlayThroughCount++;
      if (canPlayThroughCount === audioRefs.length) {
        // All audio files can be played
      }
    };

    audioRefs.forEach(ref => {
      if (ref.current) {
        ref.current.addEventListener('canplaythrough', handleCanPlay);
        ref.current.load(); 
      }
    });

    return () => {
      audioRefs.forEach(ref => {
        if (ref.current) {
          ref.current.removeEventListener('canplaythrough', handleCanPlay);
        }
      });
    };
  }, []);

  useEffect(() => {
    
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const swUrl = process.env.NODE_ENV === 'development' ? '/dev-sw.js' : '/sw.js';
      navigator.serviceWorker.register(swUrl)
        .then(registration => {
          
          // Get existing subscription
          registration.pushManager.getSubscription().then(subscription => {
            if (subscription) {
              setIsSubscribed(true);
              
            } else {
              
            }
            setIsSubscriptionLoading(false);
            
          }).catch(() => {
            
            setIsSubscriptionLoading(false);
          });
        })
        .catch(() => {
          
          setIsSubscriptionLoading(false);
        });
    } else {
      setIsSubscriptionLoading(false);
    }
  }, []);

  const handleSubscription = async () => {
    

    // if (process.env.NODE_ENV !== 'production') {
    //   alert('プッシュ通知は本番ビルドでのみテストできます。`npm run build` と `npm run start` を実行してください。');
    //   return;
    // }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push notifications are not supported in this browser.');
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const existingSubscription = await registration.pushManager.getSubscription();

    if (existingSubscription) {
      // Unsubscribe
      
      try {
        const response = await fetch('/api/subscribe', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ subscription: existingSubscription }),
        });
        if (response.ok) {
          await existingSubscription.unsubscribe();
          setIsSubscribed(false);
          setSubscriptionStatusMessage('通知をオフにしました。');
          
        } else {
          
          setSubscriptionStatusMessage('通知の解除に失敗しました。(サーバーエラー)');
        }
      } catch (error) {
        console.error('Failed to unsubscribe:', error);
        setSubscriptionStatusMessage('通知の解除に失敗しました。(ネットワークエラー)');
      }
    } else {
      // Subscribe
      
      try {
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        });
        const response = await fetch('/api/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ subscription, userId: user?.id }),
        });
        if (response.ok) {
          setIsSubscribed(true);
          setSubscriptionStatusMessage('通知をオンにしました。');
          
        } else {
          
          setSubscriptionStatusMessage('通知の登録に失敗しました。(サーバーエラー)');
        }
      } catch (error) {
        console.error('Failed to subscribe:', error);
        setSubscriptionStatusMessage('通知の登録に失敗しました。(ネットワークエラー)');
      }
    }
  };

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

  // --- Settings Modal Controls ---
  const handleSaveSettings = useCallback(async (settings: SettingsModalProps['initialSettings']) => {
    setWorkDuration(settings.workDuration);
    setShortBreakDuration(settings.shortBreakDuration);
    setLongBreakDuration(settings.longBreakDuration);
    setLongBreakInterval(settings.longBreakInterval);
    setAutoStartWork(settings.autoStartWork);
    setAutoStartBreak(settings.autoStartBreak);
    setMuteNotifications(settings.muteNotifications);
    setDarkMode(settings.darkMode);
    setTheme(settings.theme);

    // Save settings to localStorage for persistence across reloads
    try {
      localStorage.setItem('pomodoroSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error);
    }

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
        
      }
    }
  }, [user, setTheme, setDarkMode]); // Added user to dependency array

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
        theme,
      },
      onSave: handleSaveSettings,
    };
  }, [workDuration, shortBreakDuration, longBreakDuration, longBreakInterval, autoStartWork, autoStartBreak, muteNotifications, darkMode, theme, handleSaveSettings, settingsRef]);

  // --- Load Initial Settings from LocalStorage ---
  useEffect(() => {
    setIsClient(true); // Set isClient to true when component mounts on client side
    try {
      const savedSettingsJSON = localStorage.getItem('pomodoroSettings');
      if (savedSettingsJSON) {
        const savedSettings = JSON.parse(savedSettingsJSON);
        if (savedSettings) {
          setWorkDuration(savedSettings.workDuration);
          setShortBreakDuration(savedSettings.shortBreakDuration);
          setLongBreakDuration(savedSettings.longBreakDuration);
          setLongBreakInterval(savedSettings.longBreakInterval);
          setAutoStartWork(savedSettings.autoStartWork);
          setAutoStartBreak(savedSettings.autoStartBreak);
          setMuteNotifications(savedSettings.muteNotifications);
          // Ensure darkMode has a fallback to prevent errors
          setDarkMode(savedSettings.darkMode ?? true);
          setTheme(savedSettings.theme ?? 'dark');
        }
      }
    } catch (error) {
      console.error('Failed to load settings from localStorage:', error);
    }
  }, [setDarkMode, setTheme]); // Empty dependency array ensures this runs only once on mount

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

    const { data: authListener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user || null);
      fetchUserAndData(); // Re-fetch when auth state changes
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [getDuration, setDarkMode, completionCount]);

  // --- Calculate statistics whenever allSessions changes ---
  useEffect(() => {
    const now = new Date(); // Current date and time in local timezone

    // --- Daily Calculation ---
    const todayStr = now.toDateString();

    // --- Weekly Calculation (Local Timezone) ---
    const startOfWeek = new Date(now);
    const dayOfWeek = startOfWeek.getDay(); // 0 (Sun) to 6 (Sat)
    const diffToMonday = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    startOfWeek.setDate(diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // --- Monthly Calculation (Local Timezone) ---
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    let dailyCount = 0;
    let dailyTime = 0;
    let weeklyCount = 0;
    let weeklyTime = 0;
    let monthlyCount = 0;
    let monthlyTime = 0;

    allSessions.forEach(session => {
      const sessionDate = new Date(session.created_at); // Converts timestamp to local Date object

      // Daily check
      if (sessionDate.toDateString() === todayStr) {
        dailyCount++;
        dailyTime += session.duration_minutes;
      }

      // Weekly check
      if (sessionDate >= startOfWeek && sessionDate <= endOfWeek) {
        weeklyCount++;
        weeklyTime += session.duration_minutes;
      }

      // Monthly check
      if (sessionDate >= startOfMonth && sessionDate <= endOfMonth) {
        monthlyCount++;
        monthlyTime += session.duration_minutes;
      }
    });

    setDailyStats({ count: dailyCount, time: dailyTime });
    setWeeklyStats({ count: weeklyCount, time: weeklyTime });
    setMonthlyStats({ count: monthlyCount, time: monthlyTime });

  }, [allSessions]);

  // --- Play sound on timer completion ---
  const prevCompletionCountRef = useRef(completionCount); // completionCountで初期化

  useEffect(() => {
    

    // Only play sound if completionCount has increased
    if (completionCount > prevCompletionCountRef.current) {
      
      if (!muteNotifications) {
        let audioPlayer: HTMLAudioElement | null = null;

        switch (lastCompletedMode) {
          case 'pomodoro':
            audioPlayer = pomodoroEndAudioRef.current;
            
            break;
          case 'shortBreak':
            audioPlayer = shortBreakEndAudioRef.current;
            
            break;
          case 'longBreak':
            audioPlayer = longBreakEndAudioRef.current;
            
            break;
          default:
            
            break;
        }

        if (audioPlayer) {
          audioPlayer.play();
        } else {
          // console.log("Audio player not found for mode:", lastCompletedMode);
        }
      } else {
        
      }

      // Send push notification
      if (isSubscribed && user) {
        fetch('/api/notify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: user.id }),
        });
      }
    }

    // Update the ref with the current completionCount for the next render
    prevCompletionCountRef.current = completionCount;
  }, [completionCount, lastCompletedMode, muteNotifications, isSubscribed, user]);

  const handleModeChange = (mode: TimerMode) => {
    setCurrentMode(mode);
  };

  // --- Function to unlock audio context ---
  const unlockAudioContext = useCallback(() => {
    if (pomodoroEndAudioRef.current) {
      pomodoroEndAudioRef.current.play().then(() => {
        pomodoroEndAudioRef.current?.pause();
        if (pomodoroEndAudioRef.current) {
          pomodoroEndAudioRef.current.currentTime = 0; // Reset to start
        }
      }).catch(error => {
        console.warn("Failed to unlock audio context:", error);
      });
    }
  }, []);

  // --- Render --- 
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
      {/* Debugging: Display environment variables */}
      <div className="text-xs text-gray-500 mb-4">
        <p>SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
        <p>SUPABASE_ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not Set'}</p>
      </div>
      <div className="z-10 w-full max-w-lg items-center justify-between font-mono text-sm flex flex-col text-center">

        {/* Mode Switcher */}
        <div className={`flex justify-center rounded-full p-1 mb-8 w-full max-w-xs ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
          <button
            onClick={() => handleModeChange('pomodoro')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${currentMode === 'pomodoro' ? 'bg-blue-600 text-white' : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-300'}`}
          >
            ポモドーロ
          </button>
          <button
            onClick={() => handleModeChange('shortBreak')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${currentMode === 'shortBreak' ? 'bg-green-600 text-white' : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-300'}`}
          >
            短い休憩
          </button>
          <button
            onClick={() => handleModeChange('longBreak')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${currentMode === 'longBreak' ? 'bg-purple-600 text-white' : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-300'}`}
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
          {!isActive && (
            <button
              onClick={() => {
                unlockAudioContext();
                startTimer();
              }}
              className={`py-3 px-8 rounded-lg text-2xl font-bold uppercase transition-colors duration-200
                bg-blue-500 hover:bg-blue-600
                text-white shadow-lg`}>
              開始
            </button>
          )}

          {isActive && !isPaused && (
            <button
              onClick={pauseTimer}
              className={`py-3 px-8 rounded-lg text-2xl font-bold uppercase transition-colors duration-200
                bg-red-500 hover:bg-red-600
                text-white shadow-lg`}
            >
              一時停止
            </button>
          )}

          {isActive && isPaused && (
            <button
              onClick={startTimer}
              className={`py-3 px-8 rounded-lg text-2xl font-bold uppercase transition-colors duration-200
                bg-green-500 hover:bg-green-600
                text-white shadow-lg`}
            >
              再開
            </button>
          )}

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
            <div className="p-4 rounded-lg shadow-md">
              <p className="mb-2">今日: <span className="font-bold">{dailyStats.count}</span> ポモドーロ / <span className="font-bold">{dailyStats.time}</span> 分</p>
              <p className="mb-2">今週: <span className="font-bold">{weeklyStats.count}</span> ポモドーロ / <span className="font-bold">{weeklyStats.time}</span> 分</p>
              <p>今月: <span className="font-bold">{monthlyStats.count}</span> ポモドーロ / <span className="font-bold">{monthlyStats.time}</span> 分</p>
            </div>
          </div>
        )}

        {/* Push Notification Button */}
        <div className="mt-8">
          <button
            onClick={handleSubscription}
            disabled={isSubscriptionLoading}
            className="py-2 px-4 rounded-lg bg-gray-500 hover:bg-gray-600 text-white shadow-lg disabled:opacity-50"
          >
            {isSubscribed ? '通知をオフにする' : '通知をオンにする'}
          </button>
          {subscriptionStatusMessage && (
            <p className="mt-2 text-sm text-gray-500">{subscriptionStatusMessage}</p>
          )}
        </div>

        {/* Audio Elements */}
        {isClient && (
          <>
            <audio ref={pomodoroEndAudioRef} src="/sounds/pomodoro_end.mp3" preload="auto" />
            <audio ref={shortBreakEndAudioRef} src="/sounds/short_break_end.mp3" preload="auto" />
            <audio ref={longBreakEndAudioRef} src="/sounds/long_break_end.mp3" preload="auto" />
          </>
        )}

      </div>
    </main>
  );
}
