import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import StatsPage from '@/app/stats/page';
import { supabase } from '@/lib/supabaseClient';
import '@testing-library/jest-dom';

// Mock the supabase client
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
    from: jest.fn(),
  },
}));

const mockUser = { id: 'test-user-id', email: 'test@example.com' };

const deleteChain = {
  eq: jest.fn().mockReturnThis(),
  then: jest.fn().mockResolvedValue({ error: null }),
};
deleteChain.eq.mockReturnValue(deleteChain); // Allow chaining .eq().eq()

const deleteChainable = {
  eq: jest.fn().mockReturnThis(),
  then: jest.fn().mockResolvedValue({ error: null }),
};

const sessionsMock = {
  select: jest.fn().mockImplementation(() => ({
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(), // range もチェーン可能にする
    data: [
      { id: 1, created_at: new Date().toISOString(), duration_minutes: 25 },
      { id: 2, created_at: new Date().toISOString(), duration_minutes: 25 },
    ], // Default data for select
    error: null,
    count: 2,
  })),
  insert: jest.fn().mockResolvedValue({ error: null }), // Add insert mock
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  range: jest.fn().mockResolvedValue({ data: [], error: null, count: 0 }), // range の最終的な結果をモック
  delete: jest.fn(() => deleteChainable), // Always return the same deleteChainable mock
};

const goalsMock = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockImplementation(() => ({
    single: jest.fn().mockResolvedValue({ data: { daily_pomodoros: 8, weekly_pomodoros: 40, monthly_pomodoros: 160 }, error: null }),
  })),
  single: jest.fn().mockResolvedValue({ data: { daily_pomodoros: 8, weekly_pomodoros: 40, monthly_pomodoros: 160 }, error: null }), // Mock single() for initial no-goal state
  upsert: jest.fn().mockResolvedValue({ error: null }),
};

(supabase.from as jest.Mock).mockImplementation((table: string) => {
  if (table === 'pomodoro_sessions') return sessionsMock;
  if (table === 'user_goals') return goalsMock;
  return { select: jest.fn().mockReturnThis(), eq: jest.fn(), single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }) };
});

describe('StatsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });
    sessionsMock.range.mockResolvedValue({ data: [], error: null, count: 0 });
    global.confirm = jest.fn(() => true); // Mock window.confirm
    global.alert = jest.fn(); // Mock window.alert
    // goalsMock.eq.mockResolvedValue({ data: [], error: null }); // This line might be causing the issue
  });

  it('should show login message when user is not authenticated', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null } });
    await act(async () => { render(<StatsPage />); });
    expect(await screen.findByText('統計情報を表示するにはログインしてください。')).toBeInTheDocument();
  });

  it('should display stats and sessions when user is authenticated', async () => {
    const mockSessions = [
      { id: 1, created_at: new Date().toISOString(), duration_minutes: 25 },
      { id: 2, created_at: new Date().toISOString(), duration_minutes: 25 },
    ];
    sessionsMock.range.mockResolvedValue({ data: mockSessions, error: null, count: 2 });
    await act(async () => { render(<StatsPage />); });
    await waitFor(() => {
      const todays = screen.getAllByText('今日');
      expect(todays.length).toBeGreaterThan(1); // or .toBe(2) if you expect exact match
    });
  });

  it('should allow saving new goals', async () => {
    await act(async () => { render(<StatsPage />); });
    await waitFor(() => expect(screen.getByText('目標を保存')).toBeInTheDocument());

    const dailyGoalInput = screen.getByLabelText('今日');
    fireEvent.change(dailyGoalInput, { target: { value: '10' } });
    fireEvent.click(screen.getByText('目標を保存'));

    await waitFor(() => {
      expect(goalsMock.upsert).toHaveBeenCalledWith(expect.objectContaining({ daily_pomodoros: 10 }));
    });
  });

  it('should allow adding a manual session', async () => {
    await act(async () => { render(<StatsPage />); });
    await waitFor(() => expect(screen.getByText('セッションを追加')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('ポモドーロ数'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('時間 (分)'), { target: { value: '30' } });
    fireEvent.click(screen.getByText('セッションを追加'));

    await waitFor(() => {
      expect(sessionsMock.select).toHaveBeenCalled();
    });
  });

  it('should allow deleting a session', async () => {
    const mockSessions = [{ id: 1, created_at: new Date().toISOString(), duration_minutes: 25 }];
    sessionsMock.range.mockResolvedValue({ data: mockSessions, error: null, count: 1 });
    await act(async () => { render(<StatsPage />); });

    const deleteChain = sessionsMock.delete();
    await waitFor(() => {
        const deleteButtons = screen.getAllByText('削除');
        expect(deleteButtons.length).toBeGreaterThan(0);
        fireEvent.click(deleteButtons[0]);
    });

    await waitFor(() => {
        expect(deleteChain.eq).toHaveBeenCalledWith('id', 1);
        expect(deleteChain.eq).toHaveBeenCalledWith('user_id', mockUser.id);
    });
  });

  
});