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
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const settingsRef = useRef<SettingsRefContent | null>(null);
  const [theme, setThemeState] = useState('dark');
  const [darkMode, setDarkModeState] = useState(true);

  // Effect to load settings from localStorage on initial client-side render
  useEffect(() => {
    try {
      const savedSettingsJSON = localStorage.getItem('pomodoroSettings');
      if (savedSettingsJSON) {
        const savedSettings = JSON.parse(savedSettingsJSON);
        if (savedSettings) {
          setTheme(savedSettings.theme ?? 'dark');
          setDarkMode(savedSettings.darkMode ?? true);
        }
      }
    } catch (error) {
      console.error('Error loading settings from localStorage:', error);
    }
  }, []);

  // Function to update theme state and apply it to the document
  const setTheme = (newTheme: string) => {
    setThemeState(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Function to update dark mode state and apply it to the document
  const setDarkMode = (newDarkMode: boolean) => {
    setDarkModeState(newDarkMode);
    const root = document.documentElement;
    if (newDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  // This effect ensures the theme and dark mode are applied on first load and when they change.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
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