"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from "@/lib/supabaseClient";
import { User, AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useSettings } from '@/context/SettingsContext'; // Import useSettings

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

export default function Sidebar({ isOpen, toggleSidebar }: SidebarProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { setShowSettingsModal } = useSettings(); // Get setShowSettingsModal from context

  useEffect(() => {
    const getSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('ログアウトエラー:', error.message);
    } else {
      router.push('/login');
      toggleSidebar(); // Close sidebar after logout
    }
    setLoading(false);
  };

  const handleLinkClick = (path: string) => {
    router.push(path);
    toggleSidebar(); // Close sidebar on link click
  };

  const handleOpenSettings = () => {
    setShowSettingsModal(true);
    toggleSidebar(); // Close sidebar when opening settings
  };

  return (
    <div
      className={`fixed top-0 right-0 h-full w-64 bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out z-50
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
    >
      <div className="p-4 flex justify-end">
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
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>
      </div>
      <nav className="flex flex-col p-4">
        {user ? (
          <>
            <span className="text-gray-300 text-sm mb-4">ログイン中: {user.email}</span>
            <button
              onClick={() => handleLinkClick('/')}
              className="block text-white hover:bg-gray-700 py-2 px-4 rounded transition-colors duration-200 mb-2 text-left"
            >
              タイマー
            </button>
            <button
              onClick={() => handleLinkClick('/stats')}
              className="block text-white hover:bg-gray-700 py-2 px-4 rounded transition-colors duration-200 mb-2 text-left"
            >
              統計
            </button>
            <button
              onClick={() => handleLinkClick('/calendar')}
              className="block text-white hover:bg-gray-700 py-2 px-4 rounded transition-colors duration-200 mb-2 text-left"
            >
              カレンダー
            </button>
            <button
              onClick={() => handleLinkClick('/weekly-time-calendar')}
              className="block text-white hover:bg-gray-700 py-2 px-4 rounded transition-colors duration-200 mb-2 text-left"
            >
              週時間カレンダー
            </button>
            <button
              onClick={handleLogout}
              className="block text-white bg-red-600 hover:bg-red-700 py-2 px-4 rounded transition-colors duration-200 text-left"
              disabled={loading}
            >
              ログアウト
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => handleLinkClick('/login')}
              className="block text-white hover:bg-gray-700 py-2 px-4 rounded transition-colors duration-200 mb-2 text-left"
            >
              ログイン
            </button>
            <button
              onClick={() => handleLinkClick('/signup')}
              className="block text-white hover:bg-gray-700 py-2 px-4 rounded transition-colors duration-200 mb-2 text-left"
            >
              新規登録
            </button>
          </>
        )}
        <button
          onClick={handleOpenSettings}
          className="block text-white hover:bg-gray-700 py-2 px-4 rounded transition-colors duration-200 mt-4 text-left"
        >
          設定
        </button>
      </nav>
    </div>
  );
}