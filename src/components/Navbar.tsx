"use client";

import { useState } from 'react';
import Sidebar from './Sidebar';
import { useSettings } from '@/context/SettingsContext';

export default function Navbar() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { setShowSettingsModal } = useSettings();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <nav className="fixed top-0 left-0 w-full bg-gray-800 p-4 flex justify-between items-center z-40">
      <h1 className="text-white text-xl font-bold">ポモドーロタイマー</h1>
      <button onClick={toggleSidebar} className="text-white focus:outline-none">
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4 6h16M4 12h16M4 18h16"
          ></path>
        </svg>
      </button>
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} setShowSettingsModal={setShowSettingsModal} />
    </nav>
  );
}