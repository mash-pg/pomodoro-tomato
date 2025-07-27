"use client";

import { useState, useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSettings: {
    workDuration: number;
    shortBreakDuration: number;
    longBreakDuration: number;
    longBreakInterval: number;
    autoStartWork: boolean;
    autoStartBreak: boolean;
    muteNotifications: boolean;
    darkMode: boolean;
  };
  onSave: (settings: SettingsModalProps['initialSettings']) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  initialSettings,
  onSave,
}: SettingsModalProps) {
  const [workDuration, setWorkDuration] = useState(initialSettings.workDuration);
  const [shortBreakDuration, setShortBreakDuration] = useState(initialSettings.shortBreakDuration);
  const [longBreakDuration, setLongBreakDuration] = useState(initialSettings.longBreakDuration);
  const [longBreakInterval, setLongBreakInterval] = useState(initialSettings.longBreakInterval);
  const [autoStartWork, setAutoStartWork] = useState(initialSettings.autoStartWork);
  const [autoStartBreak, setAutoStartBreak] = useState(initialSettings.autoStartBreak);
  const [muteNotifications, setMuteNotifications] = useState(initialSettings.muteNotifications);
  const [darkMode, setDarkMode] = useState(initialSettings.darkMode);

  // Update local state when initialSettings prop changes (e.g., after fetching from Supabase)
  useEffect(() => {
    setWorkDuration(initialSettings.workDuration);
    setShortBreakDuration(initialSettings.shortBreakDuration);
    setLongBreakDuration(initialSettings.longBreakDuration);
    setLongBreakInterval(initialSettings.longBreakInterval);
    setAutoStartWork(initialSettings.autoStartWork);
    setAutoStartBreak(initialSettings.autoStartBreak);
    setMuteNotifications(initialSettings.muteNotifications);
    setDarkMode(initialSettings.darkMode);
  }, [initialSettings]);

  const handleSave = () => {
    onSave({
      workDuration,
      shortBreakDuration,
      longBreakDuration,
      longBreakInterval,
      autoStartWork,
      autoStartBreak,
      muteNotifications,
      darkMode,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">設定</h2>

        {/* Time Settings */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">時間 (分)</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="work-time" className="block text-sm font-medium text-gray-400">ポモドーロ</label>
              <input
                id="work-time"
                type="number"
                value={workDuration}
                onChange={(e) => setWorkDuration(Number(e.target.value))}
                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="short-break-time" className="block text-sm font-medium text-gray-400">短い休憩</label>
              <input
                id="short-break-time"
                type="number"
                value={shortBreakDuration}
                onChange={(e) => setShortBreakDuration(Number(e.target.value))}
                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="long-break-time" className="block text-sm font-medium text-gray-400">長い休憩</label>
              <input
                id="long-break-time"
                type="number"
                value={longBreakDuration}
                onChange={(e) => setLongBreakDuration(Number(e.target.value))}
                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Long Break Interval */}
        <div className="mb-6">
          <label htmlFor="long-break-interval" className="block text-sm font-medium text-gray-400">長い休憩の頻度</label>
          <input
            id="long-break-interval"
            type="number"
            value={longBreakInterval}
            onChange={(e) => setLongBreakInterval(Number(e.target.value))}
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        {/* General Options */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">一般オプション</h3>
          <div className="flex items-center justify-between mb-3">
            <label htmlFor="auto-start-work" className="text-sm font-medium text-gray-400">次の作業を自動スタート</label>
            <input
              id="auto-start-work"
              type="checkbox"
              checked={autoStartWork}
              onChange={(e) => setAutoStartWork(e.target.checked)}
              className="h-5 w-5 text-blue-600 rounded border-gray-600 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center justify-between mb-3">
            <label htmlFor="auto-start-break" className="text-sm font-medium text-gray-400">次の休憩を自動スタート</label>
            <input
              id="auto-start-break"
              type="checkbox"
              checked={autoStartBreak}
              onChange={(e) => setAutoStartBreak(e.target.checked)}
              className="h-5 w-5 text-blue-600 rounded border-gray-600 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center justify-between mb-3">
            <label htmlFor="mute-notifications" className="text-sm font-medium text-gray-400">通知音をミュート</label>
            <input
              id="mute-notifications"
              type="checkbox"
              checked={muteNotifications}
              onChange={(e) => setMuteNotifications(e.target.checked)}
              className="h-5 w-5 text-blue-600 rounded border-gray-600 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <label htmlFor="dark-mode" className="text-sm font-medium text-gray-400">ダークモードを有効化</label>
            <input
              id="dark-mode"
              type="checkbox"
              checked={darkMode}
              onChange={(e) => setDarkMode(e.target.checked)}
              className="h-5 w-5 text-blue-600 rounded border-gray-600 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Save/Close Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md"
          >
            保存
          </button>
          <button
            onClick={onClose}
            className="ml-2 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
