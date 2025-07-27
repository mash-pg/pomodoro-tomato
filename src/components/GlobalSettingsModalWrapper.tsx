"use client";

import SettingsModal from './SettingsModal';
import { useSettings } from '@/context/SettingsContext';

export default function GlobalSettingsModalWrapper() {
  const { showSettingsModal, setShowSettingsModal, initialSettings, onSaveSettings } = useSettings();

  // Only render SettingsModal if it should be open AND initialSettings/onSaveSettings are available
  if (!showSettingsModal || !initialSettings || !onSaveSettings) {
    return null;
  }

  return (
    <SettingsModal
      isOpen={showSettingsModal}
      onClose={() => setShowSettingsModal(false)}
      initialSettings={initialSettings}
      onSave={onSaveSettings}
    />
  );
}