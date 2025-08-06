import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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

  it('should handle pagination correctly', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });
    const sessionsPage1 = Array.from({ length: 10 }, (_, i) => ({ id: i, created_at: new Date().toISOString(), duration_minutes: 25 }));
    const sessionsPage2 = Array.from({ length: 5 }, (_, i) => ({ id: i + 10, created_at: new Date().toISOString(), duration_minutes: 25 }));
    const sessionsMock = createSupabaseMock(sessionsPage1);
    (sessionsMock.range as jest.Mock).mockResolvedValueOnce({ data: sessionsPage1, error: null, count: 15 });

    from.mockImplementation((tableName: string) => {
        return tableName === 'pomodoro_sessions' ? sessionsMock : createSupabaseMock(mockGoals);
    });

    render(<StatsPage />);

    await waitFor(() => expect(screen.getByText('次へ')).toBeInTheDocument());
    
    // Navigate to the next page
    (sessionsMock.range as jest.Mock).mockResolvedValueOnce({ data: sessionsPage2, error: null, count: 15 });
    fireEvent.click(screen.getByText('次へ'));

    await waitFor(() => {
        expect(sessionsMock.range).toHaveBeenCalledWith(10, 19);
        expect(screen.getByText('ページ 2 / 2')).toBeInTheDocument();
    });

    // Navigate back to the previous page
    (sessionsMock.range as jest.Mock).mockResolvedValueOnce({ data: sessionsPage1, error: null, count: 15 });
    fireEvent.click(screen.getByText('前へ'));

    await waitFor(() => {
        expect(sessionsMock.range).toHaveBeenCalledWith(0, 9);
        expect(screen.getByText('ページ 1 / 2')).toBeInTheDocument();
    });
  });

  it('should clear daily sessions when the clear button is clicked', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });
    const sessionsMock = createSupabaseMock(mockSessions);
    from.mockImplementation((tableName: string) => {
        return tableName === 'pomodoro_sessions' ? sessionsMock : createSupabaseMock(mockGoals);
    });

    render(<StatsPage />);

    await waitFor(() => expect(screen.getByText('今日のセッションをクリア')).toBeInTheDocument());
    fireEvent.click(screen.getByText('今日のセッションをクリア'));

    await waitFor(() => {
        expect(sessionsMock.delete).toHaveBeenCalled();
        expect(sessionsMock.gte).toHaveBeenCalled();
        expect(sessionsMock.lte).toHaveBeenCalled();
    });
  });

  it('should show an alert for invalid manual session input', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });
    from.mockImplementation((tableName: string) => createSupabaseMock(tableName === 'user_goals' ? mockGoals : []));

    render(<StatsPage />);

    // Wait for the component to be ready
    await screen.findByText('セッションを追加');

    // Perform actions
    fireEvent.change(screen.getByLabelText('ポモドーロ数'), { target: { value: '' } });
    fireEvent.click(screen.getByText('セッションを追加'));

    // Assert that alert was called
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('ポモドーロ数と時間は正の数を入力してください。');
    });
  });

  it('should show loading state when saving goals', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });
    const goalsMock = createSupabaseMock(mockGoals);
    let resolveUpsert: any;
    const upsertPromise = new Promise(resolve => { resolveUpsert = resolve; });
    (goalsMock.upsert as jest.Mock).mockReturnValue(upsertPromise);

    from.mockImplementation((tableName: string) => {
        return tableName === 'user_goals' ? goalsMock : createSupabaseMock([]);
    });

    render(<StatsPage />);

    // Wait for the button to be ready and click it
    const saveButton = await screen.findByText('目標を保存');
    fireEvent.click(saveButton);

    // Wait for the loading indicator to appear
    await screen.findByText('保存中...');

    // Resolve the promise to allow the test to finish cleanly
    await act(async () => {
        resolveUpsert({ error: null });
    });
  });
});