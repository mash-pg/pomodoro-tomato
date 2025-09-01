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

const deleteChainable = {
  eq: jest.fn().mockReturnThis(),
  then: jest.fn().mockResolvedValue({ error: null }),
};

const sessionsMock = {
  select: jest.fn().mockImplementation(() => ({
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    data: [
      { id: 1, created_at: new Date().toISOString(), duration_minutes: 25 },
      { id: 2, created_at: new Date().toISOString(), duration_minutes: 25 },
    ],
    error: null,
    count: 2,
  })),
  insert: jest.fn().mockResolvedValue({ error: null }),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  range: jest.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
  delete: jest.fn(() => deleteChainable),
};

const goalsMock = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: { daily_pomodoros: 8, weekly_pomodoros: 40, monthly_pomodoros: 160 }, error: null }),
  upsert: jest.fn().mockResolvedValue({ error: null }),
};

const textGoalsMock = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: { daily_goal: '', weekly_goal: '' }, error: null }),
  upsert: jest.fn().mockResolvedValue({ error: null }),
};

(supabase.from as jest.Mock).mockImplementation((table: string) => {
  if (table === 'pomodoro_sessions') return sessionsMock;
  if (table === 'user_goals') return goalsMock;
  if (table === 'user_text_goals') return textGoalsMock;
  return { select: jest.fn().mockReturnThis(), eq: jest.fn(), single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }) };
});

describe('StatsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });
    sessionsMock.range.mockResolvedValue({ data: [], error: null, count: 0 });
    global.confirm = jest.fn(() => true);
    global.alert = jest.fn();
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
      expect(screen.getByText('今日')).toBeInTheDocument();
      expect(screen.getByText('今週')).toBeInTheDocument();
      expect(screen.getByText('今月')).toBeInTheDocument();
    });
  });

  it('should allow saving new pomodoro goals', async () => {
    await act(async () => { render(<StatsPage />); });
    await waitFor(() => expect(screen.getByText('目標を保存')).toBeInTheDocument());

    const dailyPomodoroInput = screen.getByLabelText('今日の目標（ポモドーロ回数）');
    fireEvent.change(dailyPomodoroInput, { target: { value: '10' } });
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
      expect(sessionsMock.insert).toHaveBeenCalled();
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
