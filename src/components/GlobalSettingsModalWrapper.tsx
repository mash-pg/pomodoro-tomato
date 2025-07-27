"use client";

import SettingsModal from './SettingsModal';
import { useSettings } from '@/context/SettingsContext';

export default function GlobalSettingsModalWrapper() {
  const { showSettingsModal, setShowSettingsModal, settingsRef } = useSettings();

  // Only render SettingsModal if it should be open AND settingsRef.current is available
  if (!showSettingsModal || !settingsRef.current) {
    return null;
  }

  return (
    <SettingsModal
      isOpen={showSettingsModal}
      onClose={() => setShowSettingsModal(false)}
      initialSettings={settingsRef.current.initialSettings}
      onSave={settingsRef.current.onSave}
    />
  );
}
