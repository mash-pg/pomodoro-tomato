"use client";

import { useState, useEffect, useRef, useCallback } from "react";

import { useSettings } from "@/context/SettingsContext";
import { useTimer } from "@/context/TimerContext"; // Import useTimer
import { useTasks } from "@/context/TaskContext"; // Import useTasks
import { supabase } from "@/lib/supabaseClient";
import { User, AuthChangeEvent, Session } from "@supabase/supabase-js";
import { SettingsModalProps } from "@/components/SettingsModal";

// Firebase Imports
import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Define types for clarity
type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak';

interface PomodoroSession {
  id: number;
  created_at: string;
  duration_minutes: number;
  user_id: string;
}

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const messaging = typeof window !== 'undefined' && getMessaging(app);

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
  // --- Timer Settings -- -
  const [workDuration, setWorkDuration] = useState(25); // minutes
  const [shortBreakDuration, setShortBreakDuration] = useState(5); // minutes
  const [longBreakDuration, setLongBreakDuration] = useState(15); // minutes
  const [longBreakInterval, setLongBreakInterval] = useState(4); // pomodoros
  const [autoStartWork, setAutoStartWork] = useState(false);
  const [autoStartBreak, setAutoStartBreak] = useState(false);
  const [muteNotifications, setMuteNotifications] = useState(false);
  const [enableTaskTracking, setEnableTaskTracking] = useState(true); // Add this
  const [isClient, setIsClient] = useState(false); // Add this state

  // --- Task Management State ---
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskDescription, setTaskDescription] = useState('');
  const { latestTask, fetchTasks } = useTasks(); // Use tasks from context

  const { theme, setTheme, darkMode, setDarkMode } = useSettings();
  const [daysInThisMonth, setDaysInThisMonth] = useState(30);
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
  const [weeklyStats, setWeeklyStats] = useState({ count: 0, time: 0, activeDays: 0 });
  const [monthlyStats, setMonthlyStats] = useState({ count: 0, time: 0 });
  const [streak, setStreak] = useState(0);
  //const [daysInThisWeek, setDaysInThisWeek] = useState(1);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(true);
  const [subscriptionStatusMessage, setSubscriptionStatusMessage] = useState('');

  // --- Refs for audio ---
  const pomodoroEndAudioRef = useRef<HTMLAudioElement | null>(null);
  const shortBreakEndAudioRef = useRef<HTMLAudioElement | null>(null);
  const longBreakEndAudioRef = useRef<HTMLAudioElement | null>(null);
  const clickOnAudioRef = useRef<HTMLAudioElement | null>(null);

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
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && messaging) {
      // Register the Firebase Messaging Service Worker
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then(() => {
          // Wait for the service worker to become active
          return navigator.serviceWorker.ready;
        })
        .then(registration => {
          getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, serviceWorkerRegistration: registration })
            .then((currentToken) => {
              if (currentToken) {
                setFcmToken(currentToken);
                // Send token to your backend if it's new or changed
                // This part will be handled by handleSubscription
              } else {
                console.log('No registration token available. Request permission to generate one.');
                setFcmToken(null);
              }
              setIsSubscriptionLoading(false);
            })
            .catch((err) => {
              console.error('An error occurred while retrieving token. ', err);
              setFcmToken(null);
              setIsSubscriptionLoading(false);
            });
        })
        .catch((err) => {
          console.error('Service Worker registration failed: ', err);
          setIsSubscriptionLoading(false);
        });

      // Handle incoming messages while the app is in focus
      onMessage(messaging, (payload) => {
        console.log('Message received. ', payload);
        // Display a notification when the app is in focus
        if (payload.notification) {
          new Notification(payload.notification.title || 'Pomodoro Timer', {
            body: payload.notification.body || 'Time for a break!',
            icon: payload.notification.icon || '/icon-192x192.png', // Use your app icon
            tag: 'pomodoro-notification'
          });
        }
      });
    } else {
      setIsSubscriptionLoading(false);
    }
  }, []);

  const handleSubscription = async () => {
    if (!messaging || !user) {
      setSubscriptionStatusMessage('通知機能はログインしてからでないと利用できません。');
      return;
    }

    setIsSubscriptionLoading(true);
    if (fcmToken) {
      // Unsubscribe
      try {
        const response = await fetch('/api/subscribe', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fcmToken, userId: user.id }),
        });
        if (response.ok) {
          setFcmToken(null); // Clear token after successful unsubscribe
          setSubscriptionStatusMessage('通知をオフにしました。');
        } else {
          setSubscriptionStatusMessage('通知の解除に失敗しました。(サーバーエラー)');
        }
      } catch (error) {
        console.error('Failed to unsubscribe:', error);
        setSubscriptionStatusMessage('通知の解除に失敗しました。(ネットワークエラー)');
      } finally {
        setIsSubscriptionLoading(false);
      }
    } else {
      // Subscribe
      try {
        const currentToken = await getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY });
        if (currentToken) {
          // Get PushSubscription object
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
          });

          const response = await fetch('/api/subscribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fcmToken: currentToken, userId: user.id, subscription: subscription }),
          });
          if (response.ok) {
            setFcmToken(currentToken);
            setSubscriptionStatusMessage('通知をオンにしました。');
          } else {
            setSubscriptionStatusMessage('通知の登録に失敗しました。(サーバーエラー)');
          }
        } else {
          setSubscriptionStatusMessage('通知の許可が必要です。');
        }
      } catch (error) {
        console.error('Failed to subscribe:', error);
        setSubscriptionStatusMessage('通知の登録に失敗しました。(ネットワークエラー)');
      } finally {
        setIsSubscriptionLoading(false);
      }
    }
  };

  // --- Task Management ---
  const handleSaveTask = async () => {
    if (!user) return;

    // If the input is empty, save it as a specific string
    const descriptionToSave = taskDescription.trim() === '' ? '（記録なし）' : taskDescription;

    const { data, error } = await supabase
      .from('tasks')
      .insert([{ user_id: user.id, description: descriptionToSave }])
      .select()
      .single();

    if (error) {
      console.error('Error saving task:', error);
    } else if (data) {
      // Task saved successfully, now we refetch the tasks
      fetchTasks();
    }

    // Reset description and close modal
    setTaskDescription('');
    setIsTaskModalOpen(false);
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
    setEnableTaskTracking(settings.enable_task_tracking);

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
          enable_task_tracking: settings.enable_task_tracking,
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
        enable_task_tracking: enableTaskTracking,
      },
      onSave: handleSaveSettings,
    };
  }, [workDuration, shortBreakDuration, longBreakDuration, longBreakInterval, autoStartWork, autoStartBreak, muteNotifications, darkMode, theme, handleSaveSettings, settingsRef, enableTaskTracking]);

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

        // Fetch tasks using the context function
        fetchTasks();

        // Fetch settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('user_settings')
          .select('work_minutes, short_break_minutes, long_break_minutes, long_break_interval, auto_start_work, auto_start_break, mute_notifications, dark_mode, enable_task_tracking') // Add enable_task_tracking
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
          setEnableTaskTracking(settingsData.enable_task_tracking); // Add this
        }

        // Fetch streak
        const fetchStreak = async () => {
          try {
            const response = await fetch('/api/streak');
            if (response.ok) {
              const data = await response.json();
              setStreak(data.streak);
            }
          } catch (error) {
            console.error('Failed to fetch streak:', error);
          }
        };
        fetchStreak();

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
        setEnableTaskTracking(true); // Reset on logout
        setStreak(0);
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
  }, [getDuration, setDarkMode, completionCount, fetchTasks]);

  // --- Calculate statistics whenever allSessions changes ---
  useEffect(() => {
    const now = new Date();

    // Daily
    const todayStr = now.toDateString();

    // Weekly (Sunday as start)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(now); // up to now
    endOfWeek.setHours(23, 59, 59, 999);

    // Monthly
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    const calculatedDaysInMonth = now.getDate();
    setDaysInThisMonth(calculatedDaysInMonth);

    let dailyCount = 0;
    let dailyTime = 0;
    let weeklyCount = 0;
    let weeklyTime = 0;
    const weeklyActiveDays = new Set();
    let monthlyCount = 0;
    let monthlyTime = 0;

    allSessions.forEach(session => {
      const sessionDate = new Date(session.created_at);

      if (sessionDate.toDateString() === todayStr) {
        dailyCount++;
        dailyTime += session.duration_minutes;
      }

      if (sessionDate >= startOfWeek && sessionDate <= endOfWeek) {
        weeklyCount++;
        weeklyTime += session.duration_minutes;
        weeklyActiveDays.add(sessionDate.toDateString());
      }

      if (sessionDate >= startOfMonth && sessionDate <= endOfMonth) {
        monthlyCount++;
        monthlyTime += session.duration_minutes;
      }
    });

    setDailyStats({ count: dailyCount, time: dailyTime });
    setWeeklyStats({ count: weeklyCount, time: weeklyTime, activeDays: weeklyActiveDays.size });
    setMonthlyStats({ count: monthlyCount, time: monthlyTime });

  }, [allSessions]);

  // --- Play sound on timer completion ---
  const prevCompletionCountRef = useRef(completionCount); // completionCountで初期化

  useEffect(() => {
    

    // Only play sound if completionCount has increased
    if (completionCount > prevCompletionCountRef.current) {
      // Open task modal only after a pomodoro session and if tracking is enabled
      if (lastCompletedMode === 'pomodoro' && enableTaskTracking) {
        setIsTaskModalOpen(true);
      }
      
      if (!muteNotifications) {
        // Stop all sounds before playing the new one
        if (pomodoroEndAudioRef.current) {
            pomodoroEndAudioRef.current.pause();
            pomodoroEndAudioRef.current.currentTime = 0;
        }
        if (shortBreakEndAudioRef.current) {
            shortBreakEndAudioRef.current.pause();
            shortBreakEndAudioRef.current.currentTime = 0;
        }
        if (longBreakEndAudioRef.current) {
            longBreakEndAudioRef.current.pause();
            longBreakEndAudioRef.current.currentTime = 0;
        }

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
      if (fcmToken && user) {
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
  }, [completionCount, lastCompletedMode, muteNotifications, fcmToken, user, enableTaskTracking]);

  const handleModeChange = (mode: TimerMode) => {
    setCurrentMode(mode);
  };

  // --- Function to unlock audio context ---
    const unlockAudioContext = useCallback(() => {
    const audioRefs = [pomodoroEndAudioRef, shortBreakEndAudioRef, longBreakEndAudioRef];
    audioRefs.forEach(ref => {
      if (ref.current) {
        ref.current.play().then(() => {
          ref.current?.pause();
          if (ref.current) {
            ref.current.currentTime = 0; // Reset to start
          }
        }).catch(error => {
          console.warn("Failed to unlock audio context for", ref.current?.src, ":", error);
        });
      }
    });
  }, []);

  // --- Render --- 
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
      {/* Debugging: Display environment variables */}
      {streak > 0 && (
        <h2 className="mb-2 text-xl font-bold text-orange-500">
          🔥 {streak}日連続！
        </h2>
      )}
      

      <div className="text-xs text-gray-500 mb-4">
      </div>
      <div className="z-10 w-full max-w-lg items-center justify-between font-mono text-sm flex flex-col text-center">

        {/* Mode Switcher */}
        <div className={`flex justify-center rounded-full p-1 mb-8 w-full max-w-xs ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
          <button
            onClick={() => {
              unlockAudioContext();
              handleModeChange('pomodoro');
            }}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${currentMode === 'pomodoro' ? 'bg-blue-600 text-white' : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-300'}`}
          >
            ポモドーロ
          </button>
          <button
            onClick={() => {
              unlockAudioContext();
              handleModeChange('shortBreak');
            }}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${currentMode === 'shortBreak' ? 'bg-green-600 text-white' : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-300'}`}
          >
            短い休憩
          </button>
          <button
            onClick={() => {
              unlockAudioContext();
              handleModeChange('longBreak');
            }}
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
                if (clickOnAudioRef.current) {
                  clickOnAudioRef.current.currentTime = 0;
                  clickOnAudioRef.current.play();
                }
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
              onClick={() => {
                if (clickOnAudioRef.current) {
                  clickOnAudioRef.current.currentTime = 0;
                  clickOnAudioRef.current.play();
                }
                pauseTimer();
              }}
              className={`py-3 px-8 rounded-lg text-2xl font-bold uppercase transition-colors duration-200
                bg-red-500 hover:bg-red-600
                text-white shadow-lg`}
            >
              一時停止
            </button>
          )}

          {isActive && isPaused && (
            <button
              onClick={() => {
                if (clickOnAudioRef.current) {
                  clickOnAudioRef.current.currentTime = 0;
                  clickOnAudioRef.current.play();
                }
                startTimer();
              }}
              className={`py-3 px-8 rounded-lg text-2xl font-bold uppercase transition-colors duration-200
                bg-green-500 hover:bg-green-600
                text-white shadow-lg`}
            >
              再開
            </button>
          )}

          <button
            onClick={() => {
              if (clickOnAudioRef.current) {
                clickOnAudioRef.current.currentTime = 0;
                clickOnAudioRef.current.play();
              }
              resetTimer();
            }}
            className="py-3 px-8 rounded-lg text-2xl font-bold uppercase bg-gray-600 hover:bg-gray-700 text-white shadow-lg"
          >
            リセット
          </button>
        </div>
        <br />
        <h1 className="mb-2 text-xl font-bold text-gray-500">
          前回のタスク: <span className="font-semibold" >{latestTask?.description || 'N/A'}</span>
        </h1>
        {/* Statistics Display */}
        {user && (
          <div className="mt-12 text-lg text-left w-full max-w-xs">
            <div className="p-4 rounded-lg shadow-md">

              <p className="mb-2">今日: 
              <span className="font-bold">
                {dailyStats.count}
              </span> ポモドーロ / 
              <span className="font-bold">
                {(dailyStats.time / 60).toFixed(1)}
              </span>時間</p>
              
              <p className="mb-2">
                今週: <span className="font-bold">
                {weeklyStats.count}
              </span> ポモドーロ / 
              <span className="font-bold">
                {(weeklyStats.time / 60).toFixed(1)}
              </span>時間</p>
              <p className="mb-2">
                <span>
                  今週の平均：{
                    weeklyStats.activeDays > 0
                      ? (weeklyStats.time / 60 / weeklyStats.activeDays).toFixed(1)
                      : '0.0'
                  }時間
                </span>
              </p>
              <p className="mb-2">今月: 
              <span className="font-bold">
                {monthlyStats.count}
              </span> ポモドーロ / 
              <span className="font-bold">
                {(monthlyStats.time / 60).toFixed(1)}
              </span>時間</p>
              <p className="mb-2">
                <span>
                  今月の平均：{(monthlyStats.time / 60 / daysInThisMonth).toFixed(1)}時間
                </span>
              </p>
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
            {fcmToken ? '通知をオフにする' : '通知をオンにする'}
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
            <audio ref={clickOnAudioRef} src="/sounds/clickon.mp3" preload="auto" />
          </>
        )}
        {/* Task Input Modal */}
        {isTaskModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">タスクを記録</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">完了したタスクを入力してください。空のままでも記録できます。</p>
              {latestTask && (
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">
                  前回のタスク: <span className="font-semibold">{latestTask.description}</span>
                </p>
              )}
              <textarea
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg mb-4 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="（例）設計書の作成"
                rows={4}
              />
              <div className="flex justify-end gap-4">
                <button 
                  onClick={() => {
                    setTaskDescription(''); // Clear description on cancel
                    setIsTaskModalOpen(false);
                  }} 
                  className="py-2 px-5 rounded-lg font-semibold bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                >
                  あとで
                </button>
                <button 
                  onClick={handleSaveTask} 
                  className="py-2 px-5 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}