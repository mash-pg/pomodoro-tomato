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

const textGoalsMock = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: { daily_goal: 'Initial daily goal', weekly_goal: 'Initial weekly goal' }, error: null }),
  upsert: jest.fn().mockResolvedValue({ error: null }),
};

(supabase.from as jest.Mock).mockImplementation((table: string) => {
  if (table === 'user_text_goals') return textGoalsMock;
  if (table === 'pomodoro_sessions') {
    const mock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      then: (callback: any) => callback({ data: [], error: null })
    };
    mock.select.mockReturnValue(mock);
    return mock;
  }
  if (table === 'user_goals') {
    return {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      upsert: jest.fn().mockResolvedValue({ error: null }),
    };
  }
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
  };
});


describe('StatsPage Text Goals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });
    global.confirm = jest.fn(() => true);
    global.alert = jest.fn();
  });

  it('should display text goals and allow updating them', async () => {
    await act(async () => {
      render(<StatsPage />);
    });

    // Change the goals
    fireEvent.change(screen.getByLabelText('今日の目標（テキスト）'), { target: { value: 'New daily goal' } });
    fireEvent.change(screen.getByLabelText('今週の目標（テキスト）'), { target: { value: 'New weekly goal' } });

    // Save the new goals
    fireEvent.click(screen.getByText('目標を保存'));

    // Check if upsert was called with the new values
    await waitFor(() => {
      expect(textGoalsMock.upsert).toHaveBeenCalledWith({
        user_id: mockUser.id,
        daily_goal: 'New daily goal',
        weekly_goal: 'New weekly goal',
      });
    });
  });
});