import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StatsPage from '@/app/stats/page';
import { supabase } from '@/lib/supabaseClient';
import '@testing-library/jest-dom';

// Mock the entire supabase client module
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(),
  },
}));

// Convenience reference to the mocked from function
const from = supabase.from as jest.Mock;

const mockUser = { id: 'test-user-id', email: 'test@example.com' };
const mockSessions = [
  { id: 1, created_at: new Date().toISOString(), duration_minutes: 25, user_id: mockUser.id },
  { id: 2, created_at: new Date(Date.now() - 86400000).toISOString(), duration_minutes: 25, user_id: mockUser.id },
];
const mockGoals = { daily_pomodoros: 8, weekly_pomodoros: 40, monthly_pomodoros: 160 };

// A more robust mock for chained Supabase calls
const createSupabaseMock = (data: any = {}, error: any = null) => {
    const mock = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
        // Make it thenable to support awaiting directly on a query
        then: jest.fn(function(onFulfilled) {
            onFulfilled({ data, error });
        })
    };
    // Set default resolutions for terminal methods
    (mock.range as jest.Mock).mockResolvedValue({ data, error, count: Array.isArray(data) ? data.length : 0 });
    (mock.single as jest.Mock).mockResolvedValue({ data, error });
    (mock.insert as jest.Mock).mockResolvedValue({ data, error });
    (mock.upsert as jest.Mock).mockResolvedValue({ data, error });

    return mock;
};

describe('StatsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
    window.alert = jest.fn(); // Mock window.alert
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
    });
  });

  it('should show login message when user is not authenticated', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null } });
    render(<StatsPage />);
    expect(await screen.findByText('統計情報を表示するにはログインしてください。')).toBeInTheDocument();
  });

  it('should display stats and sessions when user is authenticated', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });

    from.mockImplementation((tableName: string) => {
      if (tableName === 'pomodoro_sessions') {
        return createSupabaseMock(mockSessions);
      }
      if (tableName === 'user_goals') {
        return createSupabaseMock(mockGoals);
      }
      return createSupabaseMock();
    });

    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByText('あなたの学習統計')).toBeInTheDocument();
      expect(screen.getByText('目標設定 (ポモドーロ回数)')).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockGoals.daily_pomodoros)).toBeInTheDocument();
      expect(screen.getByText('最近のセッション')).toBeInTheDocument();
      expect(screen.getAllByText(/分/)[0]).toBeInTheDocument();
    });
  });

  it('should allow saving new goals', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });
    const goalsMock = createSupabaseMock(mockGoals);
    const sessionsMock = createSupabaseMock([]);
    from.mockImplementation((tableName: string) => {
        return tableName === 'user_goals' ? goalsMock : sessionsMock;
    });

    render(<StatsPage />);
    
    await waitFor(() => expect(screen.getByText('目標を保存')).toBeInTheDocument());

    const dailyGoalInput = screen.getByLabelText('今日');
    fireEvent.change(dailyGoalInput, { target: { value: '10' } });
    fireEvent.click(screen.getByText('目標を保存'));

    await waitFor(() => {
      expect(goalsMock.upsert).toHaveBeenCalledWith(expect.objectContaining({
        daily_pomodoros: 10,
      }));
    });
  });

  it('should allow adding a manual session', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });
    const sessionsMock = createSupabaseMock([]);
    const goalsMock = createSupabaseMock(mockGoals);
    from.mockImplementation((tableName: string) => {
        return tableName === 'pomodoro_sessions' ? sessionsMock : goalsMock;
    });

    render(<StatsPage />);

    await waitFor(() => expect(screen.getByText('セッションを追加')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('ポモドーロ数'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('時間 (分)'), { target: { value: '30' } });
    fireEvent.click(screen.getByText('セッションを追加'));

    await waitFor(() => {
      expect(sessionsMock.insert).toHaveBeenCalled();
      const insertedData = (sessionsMock.insert as jest.Mock).mock.calls[0][0];
      expect(insertedData.length).toBe(2);
      expect(insertedData[0]).toEqual(expect.objectContaining({
        user_id: mockUser.id,
        duration_minutes: 30,
      }));
    });
  });

  it('should allow deleting a session', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });
    const sessionsMock = createSupabaseMock(mockSessions);
    const goalsMock = createSupabaseMock(mockGoals);
     from.mockImplementation((tableName: string) => {
        return tableName === 'pomodoro_sessions' ? sessionsMock : goalsMock;
    });

    render(<StatsPage />);

    await waitFor(() => {
        const deleteButtons = screen.getAllByText('削除');
        expect(deleteButtons.length).toBeGreaterThan(0);
        fireEvent.click(deleteButtons[0]);
    });
    
    await waitFor(() => {
        expect(sessionsMock.delete).toHaveBeenCalled();
        expect(sessionsMock.eq).toHaveBeenCalledWith('id', mockSessions[0].id);
    });
  });
  
  it('should display an error message if fetching sessions fails', async () => {
    const errorMessage = 'セッションの読み込みに失敗しました。';
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });

    from.mockImplementation((tableName: string) => {
      if (tableName === 'pomodoro_sessions') {
        return {
          select: jest.fn((columns: string) => {
            // Paginated query has 'id'
            if (columns && columns.includes('id')) {
              return {
                eq: jest.fn().mockReturnThis(),
                order: jest.fn().mockReturnThis(),
                range: jest.fn().mockResolvedValue({ data: null, error: { message: 'Fetch failed' } }),
              };
            }
            // All sessions for stats query
            return {
              eq: jest.fn().mockResolvedValue({ data: [], error: null }),
            };
          }),
        };
      }
      if (tableName === 'user_goals') {
        return createSupabaseMock(mockGoals);
      }
      return createSupabaseMock();
    });

    render(<StatsPage />);

    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
  });
});