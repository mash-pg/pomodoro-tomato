"use client";

import { createContext, useContext, useState, ReactNode } from 'react';

interface SettingsContextType {
  showSettingsModal: boolean;
  setShowSettingsModal: (show: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  return (
    <SettingsContext.Provider value={{ showSettingsModal, setShowSettingsModal }}>
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
