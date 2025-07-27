"use client";

import { createContext, useContext, useState, ReactNode, useRef } from 'react';
import SettingsModal from '@/components/SettingsModal';

// Define the type for the settings data and save handler that will be stored in the ref
interface SettingsRefContent {
  initialSettings: Parameters<typeof SettingsModal>[0]['initialSettings'];
  onSave: Parameters<typeof SettingsModal>[0]['onSave'];
}

interface SettingsContextType {
  showSettingsModal: boolean;
  setShowSettingsModal: (show: boolean) => void;
  // Ref to store the current settings and save handler from PomodoroClient
  settingsRef: React.MutableRefObject<SettingsRefContent | null>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  // Create a ref to hold the settings data and save handler
  const settingsRef = useRef<SettingsRefContent | null>(null);

  return (
    <SettingsContext.Provider value={{
      showSettingsModal,
      setShowSettingsModal,
      settingsRef,
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