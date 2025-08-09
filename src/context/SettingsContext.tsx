"use client";

import { createContext, useContext, useState, ReactNode, useRef, useEffect } from 'react';

// Define a specific type for the settings to be shared
export interface PomodoroSettings {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  longBreakInterval: number;
  autoStartWork: boolean;
  autoStartBreak: boolean;
  muteNotifications: boolean;
  darkMode: boolean;
  theme: string;
  enable_task_tracking: boolean;
}

interface SettingsRefContent {
  initialSettings: PomodoroSettings;
  onSave: (settings: PomodoroSettings) => void;
}

interface SettingsContextType {
  showSettingsModal: boolean;
  setShowSettingsModal: (show: boolean) => void;
  settingsRef: React.MutableRefObject<SettingsRefContent | null>;
  theme: string;
  setTheme: (theme: string) => void;
  darkMode: boolean;
  setDarkMode: (darkMode: boolean) => void;
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  longBreakInterval: number;
  autoStartWork: boolean;
  autoStartBreak: boolean;
  setWorkDuration: (duration: number) => void;
  setShortBreakDuration: (duration: number) => void;
  setLongBreakDuration: (duration: number) => void;
  setLongBreakInterval: (interval: number) => void;
  setAutoStartWork: (autoStart: boolean) => void;
  setAutoStartBreak: (autoStart: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const settingsRef = useRef<SettingsRefContent | null>(null);
  const [theme, setThemeState] = useState('dark');
  const [darkMode, setDarkModeState] = useState(true);
  const [workDuration, setWorkDuration] = useState(25);
  const [shortBreakDuration, setShortBreakDuration] = useState(5);
  const [longBreakDuration, setLongBreakDuration] = useState(15);
  const [longBreakInterval, setLongBreakInterval] = useState(4);
  const [autoStartWork, setAutoStartWork] = useState(false);
  const [autoStartBreak, setAutoStartBreak] = useState(false);

  // Effect to load settings from localStorage on initial client-side render
  useEffect(() => {
    if (typeof window !== 'undefined') { // Check if window is defined
      try {
        const savedSettingsJSON = localStorage.getItem('pomodoroSettings');
        if (savedSettingsJSON) {
          const savedSettings = JSON.parse(savedSettingsJSON);
          if (savedSettings) {
            setTheme(savedSettings.theme ?? 'dark');
            setDarkMode(savedSettings.darkMode ?? true);
            setWorkDuration(savedSettings.workDuration ?? 25);
            setShortBreakDuration(savedSettings.shortBreakDuration ?? 5);
            setLongBreakDuration(savedSettings.longBreakDuration ?? 15);
            setLongBreakInterval(savedSettings.longBreakInterval ?? 4);
            setAutoStartWork(savedSettings.autoStartWork ?? false);
            setAutoStartBreak(savedSettings.autoStartBreak ?? false);
          }
        }
      } catch (error) {
        console.error('Error loading settings from localStorage:', error);
      }
    }
  }, []);

  // Function to update theme state and apply it to the document
  const setTheme = (newTheme: string) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') { // Check if window is defined
      document.documentElement.setAttribute('data-theme', newTheme);
    }
  };

  // Function to update dark mode state and apply it to the document
  const setDarkMode = (newDarkMode: boolean) => {
    setDarkModeState(newDarkMode);
    if (typeof window !== 'undefined') { // Check if window is defined
      const root = document.documentElement;
      if (newDarkMode) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  // This effect ensures the theme and dark mode are applied on first load and when they change.
  useEffect(() => {
    if (typeof window !== 'undefined') { // Check if window is defined
      document.documentElement.setAttribute('data-theme', theme);
      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [theme, darkMode]);

  return (
    <SettingsContext.Provider value={{
      showSettingsModal,
      setShowSettingsModal,
      settingsRef,
      theme,
      setTheme,
      darkMode,
      setDarkMode,
      workDuration,
      shortBreakDuration,
      longBreakDuration,
      longBreakInterval,
      autoStartWork,
      autoStartBreak,
      setWorkDuration,
      setShortBreakDuration,
      setLongBreakDuration,
      setLongBreakInterval,
      setAutoStartWork,
      setAutoStartBreak,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}