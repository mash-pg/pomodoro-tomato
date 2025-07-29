"use client";

import { useState, useEffect } from 'react';
import { PomodoroSettings } from '@/context/SettingsContext'; // Import the shared type

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSettings: PomodoroSettings;
  onSave: (settings: PomodoroSettings) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  initialSettings,
  onSave,
}: SettingsModalProps) {
  const [workDuration, setWorkDuration] = useState<number | ''>(initialSettings.workDuration);
  const [shortBreakDuration, setShortBreakDuration] = useState<number | ''>(initialSettings.shortBreakDuration);
  const [longBreakDuration, setLongBreakDuration] = useState<number | ''>(initialSettings.longBreakDuration);
  const [longBreakInterval, setLongBreakInterval] = useState<number | ''>(initialSettings.longBreakInterval);
  const [autoStartWork, setAutoStartWork] = useState(initialSettings.autoStartWork);
  const [autoStartBreak, setAutoStartBreak] = useState(initialSettings.autoStartBreak);
  const [muteNotifications, setMuteNotifications] = useState(initialSettings.muteNotifications);
  const [darkMode, setDarkMode] = useState(initialSettings.darkMode);
  const [theme, setTheme] = useState(initialSettings.theme);

  // Update local state when initialSettings prop changes
  useEffect(() => {
    setWorkDuration(initialSettings.workDuration);
    setShortBreakDuration(initialSettings.shortBreakDuration);
    setLongBreakDuration(initialSettings.longBreakDuration);
    setLongBreakInterval(initialSettings.longBreakInterval);
    setAutoStartWork(initialSettings.autoStartWork);
    setAutoStartBreak(initialSettings.autoStartBreak);
    setMuteNotifications(initialSettings.muteNotifications);
    setDarkMode(initialSettings.darkMode);
    setTheme(initialSettings.theme);
  }, [initialSettings]);

  const handleSave = () => {
    // On save, ensure values are at least 1.
    onSave({
      workDuration: Number(workDuration) >= 1 ? Number(workDuration) : 1,
      shortBreakDuration: Number(shortBreakDuration) >= 1 ? Number(shortBreakDuration) : 1,
      longBreakDuration: Number(longBreakDuration) >= 1 ? Number(longBreakDuration) : 1,
      longBreakInterval: Number(longBreakInterval) >= 1 ? Number(longBreakInterval) : 1,
      autoStartWork,
      autoStartBreak,
      muteNotifications,
      darkMode,
      theme,
    });
    onClose();
  };

  const handleNumberChange = (setter: React.Dispatch<React.SetStateAction<number | ''>>, value: string) => {
    if (value === '') {
      setter('');
      return;
    }
    const num = Number(value);
    // Allow only non-negative integers.
    if (Number.isInteger(num) && num >= 0) {
      setter(num);
    }
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
                min="1"
                value={workDuration}
                onChange={(e) => handleNumberChange(setWorkDuration, e.target.value)}
                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="short-break-time" className="block text-sm font-medium text-gray-400">短い休憩</label>
              <input
                id="short-break-time"
                type="number"
                min="1"
                value={shortBreakDuration}
                onChange={(e) => handleNumberChange(setShortBreakDuration, e.target.value)}
                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="long-break-time" className="block text-sm font-medium text-gray-400">長い休憩</label>
              <input
                id="long-break-time"
                type="number"
                min="1"
                value={longBreakDuration}
                onChange={(e) => handleNumberChange(setLongBreakDuration, e.target.value)}
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
            min="1"
            value={longBreakInterval}
            onChange={(e) => handleNumberChange(setLongBreakInterval, e.target.value)}
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        {/* Theme Selector */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">テーマ</h3>
          <select
            id="theme-selector"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="dark">ダーク</option>
            <option value="forest">フォレスト</option>
            <option value="aqua">アクア</option>
          </select>
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
