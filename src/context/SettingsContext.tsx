"use client";

import { createContext, useContext, useState, ReactNode } from 'react';
import SettingsModal from '@/components/SettingsModal';

interface SettingsContextType {
  showSettingsModal: boolean;
  setShowSettingsModal: (show: boolean) => void;
  // These will be set by PomodoroClient
  initialSettings: Parameters<typeof SettingsModal>[0]['initialSettings'] | null;
  onSaveSettings: ((settings: Parameters<typeof SettingsModal>[0]['initialSettings']) => void) | null;
  setInitialSettings: (settings: SettingsContextType['initialSettings']) => void;
  setOnSaveSettings: (onSave: SettingsContextType['onSaveSettings']) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [initialSettings, setInitialSettings] = useState<SettingsContextType['initialSettings'] | null>(null);
  const [onSaveSettings, setOnSaveSettings] = useState<SettingsContextType['onSaveSettings'] | null>(null);

  return (
    <SettingsContext.Provider value={{
      showSettingsModal,
      setShowSettingsModal,
      initialSettings,
      onSaveSettings,
      setInitialSettings, // Added
      setOnSaveSettings, // Added
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