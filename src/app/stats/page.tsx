"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';
import { useSettings } from '@/context/SettingsContext'; // Import useSettings

interface PomodoroSession {
  id: number;
  created_at: string;
  duration_minutes: number;
  user_id: string;
}

interface Stats {
  count: number;
  time: number;
}

export default function StatsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [allSessions, setAllSessions] = useState<PomodoroSession[]>([]);
  const [dailyStats, setDailyStats] = useState<Stats>({ count: 0, time: 0 });
  const [weeklyStats, setWeeklyStats] = useState<Stats>({ count: 0, time: 0 });
  const [monthlyStats, setMonthlyStats] = useState<Stats>({ count: 0, time: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { setShowSettingsModal } = useSettings(); // Get setShowSettingsModal from context

  // For manual session addition
  const [manualPomodoros, setManualPomodoros] = useState(1);
  const [manualDuration, setManualDuration] = useState(25);
  const [manualDate, setManualDate] = useState('');
  const [manualTime, setManualTime] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    const today = new Date();
    setManualDate(today.toISOString().split('T')[0]); // YYYY-MM-DD
    setManualTime(today.toTimeString().split(' ')[0].substring(0, 5)); // HH:MM
  }, []);

  const fetchUserAndSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    if (user) {
      const { data, error: fetchError } = await supabase
        .from('pomodoro_sessions')
        .select('id, created_at, duration_minutes')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('セッション取得エラー:', JSON.stringify(fetchError, null, 2));
        setError('セッションの読み込みに失敗しました。');
      } else {
        setAllSessions(data as PomodoroSession[]);
      }
    } else {
      setAllSessions([]);
      setError('統計情報を表示するにはログインしてください。');
    }
    setLoading(false);
  }, []); // Empty dependency array for useCallback

  useEffect(() => {
    fetchUserAndSessions();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      fetchUserAndSessions();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchUserAndSessions]);

  useEffect(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay())); // Sunday
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let dailyCount = 0;
    let dailyTime = 0;
    let weeklyCount = 0;
    let weeklyTime = 0;
    let monthlyCount = 0;
    let monthlyTime = 0;

    allSessions.forEach(session => {
      const sessionDate = new Date(session.created_at);

      // Daily
      if (sessionDate.toDateString() === now.toDateString()) {
        dailyCount++;
        dailyTime += session.duration_minutes;
      }

      // Weekly
      if (sessionDate >= startOfWeek) {
        weeklyCount++;
        weeklyTime += session.duration_minutes;
      }

      // Monthly
      if (sessionDate >= startOfMonth) {
        monthlyCount++;
        monthlyTime += session.duration_minutes;
      }
    });

    setDailyStats({ count: dailyCount, time: dailyTime });
    setWeeklyStats({ count: weeklyCount, time: weeklyTime });
    setMonthlyStats({ count: monthlyCount, time: monthlyTime });

  }, [allSessions]);

  const clearSessions = async (period: 'day' | 'week' | 'month') => {
    if (!user) {
      alert('セッションをクリアするにはログインしてください。');
      return;
    }

    if (!confirm(`この${period === 'day' ? '日' : period === 'week' ? '週' : '月'}のすべてのセッションをクリアしてもよろしいですか？この操作は元に戻せません。`)) {
      return;
    }

    setLoading(true);
    setError(null);

    const now = new Date();
    let startDate: Date;

    if (period === 'day') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'week') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startDate = new Date(today.setDate(today.getDate() - today.getDay()));
    } else { // month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const { error: deleteError } = await supabase
      .from('pomodoro_sessions')
      .delete()
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString());

    if (deleteError) {
      console.error(`${period}セッションのクリアエラー:`, JSON.stringify(deleteError, null, 2));
      setError(`${period === 'day' ? '日' : period === 'week' ? '週' : '月'}のセッションのクリアに失敗しました。`);
    } else {
      alert(`この${period === 'day' ? '日' : period === 'week' ? '週' : '月'}のすべてのセッションがクリアされました。`);
      fetchUserAndSessions(); // Re-fetch data to update stats
    }
    setLoading(false);
  };

  const deleteSession = async (sessionId: number) => {
    if (!user) {
      alert('セッションを削除するにはログインしてください。');
      return;
    }

    if (!confirm('このセッションを削除してもよろしいですか？この操作は元に戻せません。')) {
      return;
    }

    setLoading(true);
    setError(null);

    const { error: deleteError } = await supabase
      .from('pomodoro_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', user.id); // Ensure only the user's own session can be deleted

    if (deleteError) {
      console.error('セッション削除エラー:', JSON.stringify(deleteError, null, 2));
      setError('セッションの削除に失敗しました。');
    } else {
      alert('セッションが正常に削除されました。');
      fetchUserAndSessions(); // Re-fetch data to update stats and list
    }
    setLoading(false);
  };

  const handleAddManualSession = async () => {
    if (!user) {
      alert('セッションを追加するにはログインしてください。');
      return;
    }
    if (manualPomodoros <= 0 || manualDuration <= 0) {
      alert('ポモドーロ数と時間は正の数を入力してください。');
      return;
    }

    setAddLoading(true);
    setError(null);

    const sessionPromises = [];
    const sessionDateTime = new Date(`${manualDate}T${manualTime}:00`);

    for (let i = 0; i < manualPomodoros; i++) {
      sessionPromises.push(
        supabase.from('pomodoro_sessions').insert({
          user_id: user.id,
          duration_minutes: manualDuration,
          created_at: sessionDateTime.toISOString(),
        })
      );
    }

    const results = await Promise.all(sessionPromises);
    const hasError = results.some(result => result.error);

    if (hasError) {
      console.error('手動セッション追加エラー:', JSON.stringify(results, null, 2));
      setError('手動セッションの追加に失敗しました。');
    } else {
      alert(`${manualPomodoros}件のセッションが正常に追加されました。`);
      fetchUserAndSessions(); // Re-fetch data to update stats and list
      setManualPomodoros(1); // Reset form
      setManualDuration(25); // Reset form
      const today = new Date();
      setManualDate(today.toISOString().split('T')[0]);
      setManualTime(today.toTimeString().split(' ')[0].substring(0, 5));
    }
    setAddLoading(false);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-gray-900 text-white pt-20">
      <div className="z-10 w-full max-w-lg items-center justify-between font-mono text-sm flex flex-col text-center">
        <h1 className="text-3xl font-bold mb-8">あなたの学習統計</h1>

        {loading && <p className="text-gray-400">統計を読み込み中...</p>}
        {error && <p className="text-red-500 mb-4">{error}</p>}

        {!user && !loading && (
          <p className="text-gray-400">統計情報を表示するにはログインしてください。</p>
        )}

        {user && !loading && !error && (
          <div className="w-full">
            {/* Manual Session Addition */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-md mb-8">
              <h2 className="text-xl font-bold mb-4">手動でセッションを追加</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="manual-pomodoros" className="block text-sm font-medium text-gray-400">ポモドーロ数</label>
                  <input
                    type="number"
                    id="manual-pomodoros"
                    value={manualPomodoros}
                    onChange={(e) => setManualPomodoros(Number(e.target.value))}
                    min="1"
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="manual-duration" className="block text-sm font-medium text-gray-400">1セッションあたりの時間 (分)</label>
                  <input
                    type="number"
                    id="manual-duration"
                    value={manualDuration}
                    onChange={(e) => setManualDuration(Number(e.target.value))}
                    min="1"
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="manual-date" className="block text-sm font-medium text-gray-400">日付</label>
                  <input
                    type="date"
                    id="manual-date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="manual-time" className="block text-sm font-medium text-gray-400">時刻</label>
                  <input
                    type="time"
                    id="manual-time"
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              <button
                onClick={handleAddManualSession}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
                disabled={addLoading}
              >
                {addLoading ? '追加中...' : 'セッションを追加'}
              </button>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg shadow-md mb-8">
              <h2 className="text-xl font-bold mb-4">概要</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-700 p-4 rounded-md">
                  <h3 className="font-semibold text-lg mb-2">今日</h3>
                  <p>ポモドーロ: <span className="font-bold">{dailyStats.count}</span></p>
                  <p>時間: <span className="font-bold">{dailyStats.time}</span> 分</p>
                  <button
                    onClick={() => clearSessions('day')}
                    className="mt-4 bg-red-600 hover:bg-red-700 text-white text-sm py-1 px-3 rounded-md"
                    disabled={loading}
                  >
                    今日のセッションをクリア
                  </button>
                </div>
                <div className="bg-gray-700 p-4 rounded-md">
                  <h3 className="font-semibold text-lg mb-2">今週</h3>
                  <p>ポモドーロ: <span className="font-bold">{weeklyStats.count}</span></p>
                  <p>時間: <span className="font-bold">{weeklyStats.time}</span> 分</p>
                  <button
                    onClick={() => clearSessions('week')}
                    className="mt-4 bg-red-600 hover:bg-red-700 text-white text-sm py-1 px-3 rounded-md"
                    disabled={loading}
                  >
                    今週のセッションをクリア
                  </button>
                </div>
                <div className="bg-gray-700 p-4 rounded-md">
                  <h3 className="font-semibold text-lg mb-2">今月</h3>
                  <p>ポモドーロ: <span className="font-bold">{monthlyStats.count}</span></p>
                  <p>時間: <span className="font-bold">{monthlyStats.time}</span> 分</p>
                  <button
                    onClick={() => clearSessions('month')}
                    className="mt-4 bg-red-600 hover:bg-red-700 text-white text-sm py-1 px-3 rounded-md"
                    disabled={loading}
                  >
                    今月のセッションをクリア
                  </button>
                </div>
              </div>
            </div>

            <h2 className="text-xl font-bold mb-4">最近のセッション</h2>
            {allSessions.length === 0 ? (
              <p className="text-gray-400">まだセッションが記録されていません。</p>
            ) : (
              <div className="bg-gray-800 p-6 rounded-lg shadow-md max-h-64 overflow-y-auto">
                {allSessions.map((session) => (
                  <div key={session.id} className="flex justify-between items-center border-b border-gray-700 py-2 last:border-b-0">
                    <span>{new Date(session.created_at).toLocaleString()}</span>
                    <span>{session.duration_minutes} 分</span>
                    <button
                      onClick={() => deleteSession(session.id)}
                      className="bg-red-600 hover:bg-red-700 text-white text-sm py-1 px-2 rounded-md"
                      disabled={loading}
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}