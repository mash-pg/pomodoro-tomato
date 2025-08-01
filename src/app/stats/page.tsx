"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';

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

interface Goals {
  daily_pomodoros: number;
  weekly_pomodoros: number;
  monthly_pomodoros: number;
}

export default function StatsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [paginatedSessions, setPaginatedSessions] = useState<PomodoroSession[]>([]);
  const [allSessionsForStats, setAllSessionsForStats] = useState<PomodoroSession[]>([]);
  const [dailyStats, setDailyStats] = useState<Stats>({ count: 0, time: 0 });
  const [weeklyStats, setWeeklyStats] = useState<Stats>({ count: 0, time: 0 });
  const [monthlyStats, setMonthlyStats] = useState<Stats>({ count: 0, time: 0 });
  const [goals, setGoals] = useState<Goals>({ daily_pomodoros: 8, weekly_pomodoros: 40, monthly_pomodoros: 160 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dailyActivityData, setDailyActivityData] = useState<{ hour: number; count: number }[]>([]);
  const [weeklyActivityData, setWeeklyActivityData] = useState<{ day: number; count: number }[]>([]);

  const [manualPomodoros, setManualPomodoros] = useState(1);
  const [manualDuration, setManualDuration] = useState(25);
  const [manualDate, setManualDate] = useState('');
  const [manualTime, setManualTime] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [sessionsPerPage] = useState(10);
  const [totalSessions, setTotalSessions] = useState(0);

  useEffect(() => {
    const today = new Date();
    setManualDate(today.toISOString().split('T')[0]);
    setManualTime(today.toTimeString().split(' ')[0].substring(0, 5));
  }, []);

  const fetchUserAndData = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    if (user) {
      const from = (page - 1) * sessionsPerPage;
      const to = from + sessionsPerPage - 1;

      // Fetch paginated sessions for display
      const { data: sessions, error: fetchError, count } = await supabase
        .from('pomodoro_sessions')
        .select('id, created_at, duration_minutes', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (fetchError) {
        setError('セッションの読み込みに失敗しました。');
      } else {
        setPaginatedSessions(sessions as PomodoroSession[]);
        setTotalSessions(count || 0);
      }

      // Fetch all sessions for stats calculation
      const { data: allSessionsData, error: allSessionsError } = await supabase
        .from('pomodoro_sessions')
        .select('created_at, duration_minutes')
        .eq('user_id', user.id);

      if (allSessionsError) {
        setError('統計データの読み込みに失敗しました。');
      } else {
        setAllSessionsForStats(allSessionsData as PomodoroSession[]);
      }

      const { data: goalsData, error: goalsError } = await supabase
        .from('user_goals')
        .select('daily_pomodoros, weekly_pomodoros, monthly_pomodoros')
        .eq('user_id', user.id)
        .single();

      if (goalsError && goalsError.code !== 'PGRST116') {
        setError('目標の読み込みに失敗しました。');
      } else if (goalsData) {
        setGoals(goalsData);
      }
    } else {
      setPaginatedSessions([]);
      setAllSessionsForStats([]);
      setTotalSessions(0);
      setError('統計情報を表示するにはログインしてください。');
    }
    setLoading(false);
  }, [sessionsPerPage]);

  useEffect(() => {
    fetchUserAndData(currentPage);
    const { data: authListener } = supabase.auth.onAuthStateChange(() => fetchUserAndData(currentPage));
    return () => authListener.subscription.unsubscribe();
  }, [fetchUserAndData, currentPage]);

  useEffect(() => {
    const now = new Date();
    const todayStr = now.toDateString();

    const startOfWeek = new Date(now);
    const dayOfWeek = startOfWeek.getDay();
    const diffToMonday = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    startOfWeek.setDate(diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    let dailyCount = 0, dailyTime = 0;
    let weeklyCount = 0, weeklyTime = 0;
    let monthlyCount = 0, monthlyTime = 0;

    const dailyActivity: { [hour: number]: number } = {};
    for (let i = 0; i < 24; i++) dailyActivity[i] = 0;

    const weeklyActivity: { [day: number]: number } = {};
    for (let i = 0; i < 7; i++) weeklyActivity[i] = 0;

    allSessionsForStats.forEach(session => {
      const sessionDate = new Date(session.created_at);

      if (sessionDate.toDateString() === todayStr) {
        dailyCount++;
        dailyTime += session.duration_minutes;
        dailyActivity[sessionDate.getHours()]++;
      }
      if (sessionDate >= startOfWeek && sessionDate <= endOfWeek) {
        weeklyCount++;
        weeklyTime += session.duration_minutes;
        weeklyActivity[sessionDate.getDay()]++;
      }
      if (sessionDate >= startOfMonth && sessionDate <= endOfMonth) {
        monthlyCount++;
        monthlyTime += session.duration_minutes;
      }
    });

    setDailyStats({ count: dailyCount, time: dailyTime });
    setWeeklyStats({ count: weeklyCount, time: weeklyTime });
    setMonthlyStats({ count: monthlyCount, time: monthlyTime });

    setDailyActivityData(Object.keys(dailyActivity).map(key => ({ hour: Number(key), count: dailyActivity[Number(key)] })));
    setWeeklyActivityData(Object.keys(weeklyActivity).map(key => ({ day: Number(key), count: weeklyActivity[Number(key)] })));

  }, [allSessionsForStats]);

  const handleSaveGoals = async () => {
    if (!user) return alert('目標を保存するにはログインしてください。');
    setLoading(true);
    const { error } = await supabase.from('user_goals').upsert({ ...goals, user_id: user.id });
    if (error) setError('目標の保存に失敗しました。');
    else alert('目標を保存しました。');
    setLoading(false);
  };

  const handleGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setGoals(prev => ({ ...prev, [name]: Number(value) >= 0 ? Number(value) : 0 }));
  };

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
    let endDate: Date;

    if (period === 'day') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === 'week') {
      startDate = new Date(now);
      const day = startDate.getDay();
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
      startDate.setDate(diff);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else { // month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const { error: deleteError } = await supabase
      .from('pomodoro_sessions')
      .delete()
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (deleteError) {
      console.error(`${period}セッションのクリアエラー:`, JSON.stringify(deleteError, null, 2));
      setError(`${period === 'day' ? '日' : period === 'week' ? '週' : '月'}のセッションのクリアに失敗しました。`);
    } else {
      alert(`この${period === 'day' ? '日' : period === 'week' ? '週' : '月'}のすべてのセッションがクリアされました。`);
      fetchUserAndData(currentPage);
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
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('セッション削除エラー:', JSON.stringify(deleteError, null, 2));
      setError('セッションの削除に失敗しました。');
    } else {
      alert('セッションが正常に削除されました。');
      fetchUserAndData(currentPage);
    }
    setLoading(false);
  };

  const handleAddManualSession = async () => {
    if (!user) return alert('セッションを追加するにはログインしてください。');
    if (manualPomodoros <= 0 || manualDuration <= 0) return alert('ポモドーロ数と時間は正の数を入力してください。');

    setAddLoading(true);
    const [year, month, day] = manualDate.split('-').map(Number);
    const [hours, minutes] = manualTime.split(':').map(Number);
    const sessionDateTime = new Date(year, month - 1, day, hours, minutes, 0);

    const sessionsToInsert = Array.from({ length: manualPomodoros }, () => ({
      user_id: user.id,
      duration_minutes: manualDuration,
      created_at: sessionDateTime.toISOString(),
    }));

    const { error } = await supabase.from('pomodoro_sessions').insert(sessionsToInsert);

    if (error) {
      setError('手動セッションの追加に失敗しました。');
    } else {
      alert(`${manualPomodoros}件のセッションが正常に追加されました。`);
      fetchUserAndData(currentPage);
    }
    setAddLoading(false);
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 bg-gray-900 text-white pt-20">
      <div className="z-10 w-full max-w-6xl items-center justify-between font-mono text-sm flex flex-col text-center">
        <h1 className="text-3xl font-bold mb-8">あなたの学習統計</h1>

        {loading && <p className="text-gray-400">統計を読み込み中...</p>}
        {error && <p className="text-red-500 mb-4">{error}</p>}

        {!user && !loading && !error && <p className="text-gray-400">統計情報を表示するにはログインしてください。</p>}

        {user && !loading && !error && (
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="flex flex-col gap-8">
              <div className="bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">目標設定 (ポモドーロ回数)</h2>
                <div className="grid grid-cols-1 gap-4 mb-4">
                  <div>
                    <label htmlFor="daily_pomodoros" className="block text-sm font-medium text-gray-400">今日</label>
                    <input type="number" id="daily_pomodoros" name="daily_pomodoros" value={goals.daily_pomodoros} onChange={handleGoalChange} min="0" className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm" />
                  </div>
                  <div>
                    <label htmlFor="weekly_pomodoros" className="block text-sm font-medium text-gray-400">今週</label>
                    <input type="number" id="weekly_pomodoros" name="weekly_pomodoros" value={goals.weekly_pomodoros} onChange={handleGoalChange} min="0" className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm" />
                  </div>
                  <div>
                    <label htmlFor="monthly_pomodoros" className="block text-sm font-medium text-gray-400">今月</label>
                    <input type="number" id="monthly_pomodoros" name="monthly_pomodoros" value={goals.monthly_pomodoros} onChange={handleGoalChange} min="0" className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm" />
                  </div>
                </div>
                <button onClick={handleSaveGoals} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md" disabled={loading}>{loading ? '保存中...' : '目標を保存'}</button>
              </div>

              <div className="bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">概要</h2>
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-gray-700 p-4 rounded-md">
                    <h3 className="font-semibold text-lg mb-2">今日</h3>
                    <p>ポモドーロ: <span className="font-bold">{dailyStats.count} / {goals.daily_pomodoros}</span></p>
                    <p>時間: <span className="font-bold">{(dailyStats.time / 60).toFixed(1)}</span> 時間</p>
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
                    <p>ポモドーロ: <span className="font-bold">{weeklyStats.count} / {goals.weekly_pomodoros}</span></p>
                    <p>時間: <span className="font-bold">{(weeklyStats.time / 60).toFixed(1)}</span> 時間</p>
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
                    <p>ポモドーロ: <span className="font-bold">{monthlyStats.count} / {goals.monthly_pomodoros}</span></p>
                    <p>時間: <span className="font-bold">{(monthlyStats.time / 60).toFixed(1)}</span> 時間</p>
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
            </div>

            {/* Middle Column */}
            <div className="flex flex-col gap-8">
              <div className="bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">手動でセッションを追加</h2>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label htmlFor="manual-pomodoros" className="block text-sm font-medium text-gray-400">ポモドーロ数</label>
                    <input type="number" id="manual-pomodoros" value={manualPomodoros} onChange={(e) => setManualPomodoros(Number(e.target.value))} min="1" className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm" />
                  </div>
                  <div>
                    <label htmlFor="manual-duration" className="block text-sm font-medium text-gray-400">時間 (分)</label>
                    <input type="number" id="manual-duration" value={manualDuration} onChange={(e) => setManualDuration(Number(e.target.value))} min="1" className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm" />
                  </div>
                  <div>
                    <label htmlFor="manual-date" className="block text-sm font-medium text-gray-400">日付</label>
                    <input type="date" id="manual-date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm" />
                  </div>
                  <div>
                    <label htmlFor="manual-time" className="block text-sm font-medium text-gray-400">時刻</label>
                    <input type="time" id="manual-time" value={manualTime} onChange={(e) => setManualTime(e.target.value)} className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm" />
                  </div>
                </div>
                <button onClick={handleAddManualSession} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md" disabled={addLoading}>{addLoading ? '追加中...' : 'セッションを追加'}</button>
              </div>

              <div className="bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">最近のセッション</h2>
                {paginatedSessions.length === 0 ? (
                  <p className="text-gray-400">まだセッションが記録されていません。</p>
                ) : (
                  <>
                    <div className="max-h-96 overflow-y-auto">
                      {paginatedSessions.map((session) => (
                        <div key={session.id} className="flex justify-between items-center border-b border-gray-700 py-2 last:border-b-0">
                          <span>{new Date(session.created_at).toLocaleString()}</span>
                          <div className="flex items-center space-x-2 mr-24">
                            <span>{session.duration_minutes} 分</span>
                            <button
                              onClick={() => deleteSession(session.id)}
                              className="bg-red-600 hover:bg-red-700 text-white text-sm py-1 px-2 rounded-md"
                              disabled={loading}
                            >
                              削除
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1 || loading}
                        className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50"
                      >
                        前へ
                      </button>
                      <span>ページ {currentPage} / {Math.ceil(totalSessions / sessionsPerPage)}</span>
                      <button
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        disabled={currentPage * sessionsPerPage >= totalSessions || loading}
                        className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50"
                      >
                        次へ
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right Column (Charts) */}
            <div className="flex flex-col gap-8">
              {/* Daily Activity Chart */}
              <div className="bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">時間帯別ポモドーロ数</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyActivityData}>
                    <XAxis dataKey="hour" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Legend />
                    <Bar dataKey="count" fill="#8884d8" name="ポモドーロ数" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Weekly Activity Chart */}
              <div className="bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">曜日別ポモドーロ数</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={weeklyActivityData}>
                    <XAxis dataKey="day" stroke="#9ca3af"
                      tickFormatter={(value) => {
                        const days = ['日', '月', '火', '水', '木', '金', '土'];
                        return days[value];
                      }}
                    />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Legend />
                    <Bar dataKey="count" fill="#82ca9d" name="ポモドーロ数" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
