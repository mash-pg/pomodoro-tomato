
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import WeeklyTimeCalendarPage from '@/app/weekly-time-calendar/page';
import { supabase } from '@/lib/supabaseClient';
import '@testing-library/jest-dom';

// Mock external components
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: jest.fn((loader) => {
    const Component = jest.fn(() => null); // Default mock component
    loader().then((mod: any) => {
      if (mod.default) {
        Component.mockImplementation(mod.default);
      }
    });
    return Component;
  }),
}));

jest.mock('@/components/WeeklyTimeCalendar', () => {
  const MockWeeklyTimeCalendar = ({ user, sessions }: any) => (
    <div data-testid="mock-weekly-time-calendar">
      Weekly Time Calendar for {user?.id} with {sessions.length} sessions
    </div>
  );
  return { __esModule: true, default: MockWeeklyTimeCalendar };
});

// Mock Supabase
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: {
          subscription: {
            unsubscribe: jest.fn(),
          },
        },
      })),
    },
    from: jest.fn(() => {
      const mockPostgrestFilterBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        neq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        like: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
      };
      return mockPostgrestFilterBuilder;
    }),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('WeeklyTimeCalendarPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display loading state initially', async () => {
    (mockSupabase.auth.getUser as jest.Mock).mockReturnValueOnce(new Promise(() => {}));
    await act(async () => {
      render(<WeeklyTimeCalendarPage />);
    });
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('should display login message if no user is logged in', async () => {
    (mockSupabase.auth.getUser as jest.Mock).mockResolvedValueOnce({ data: { user: null }, error: null });
    await act(async () => {
      render(<WeeklyTimeCalendarPage />);
    });
    await waitFor(() => {
      expect(screen.getByText('ログインしてください。')).toBeInTheDocument();
    });
  });

  it('should display error message if fetching sessions fails', async () => {
    const mockUser = { id: 'test-user-id', email: 'test@example.com' };
    (mockSupabase.auth.getUser as jest.Mock).mockResolvedValueOnce({ data: { user: mockUser }, error: null });
    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: new Error('Failed to fetch sessions') }),
    });

    await act(async () => {
      render(<WeeklyTimeCalendarPage />);
    });
    await waitFor(() => {
      expect(screen.getByText(/エラー: Failed to fetch sessions/)).toBeInTheDocument();
    });
  });

  it('should render weekly time calendar for logged in user', async () => {
    const mockUser = { id: 'test-user-id', email: 'test@example.com' };
    const mockSessions = [
      { id: 1, created_at: new Date().toISOString(), duration_minutes: 25, user_id: 'test-user-id' },
    ];
    (mockSupabase.auth.getUser as jest.Mock).mockResolvedValueOnce({ data: { user: mockUser }, error: null });
    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: mockSessions, error: null }),
    });

    await act(async () => {
      render(<WeeklyTimeCalendarPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('週ごとのポモドーロ (時間)')).toBeInTheDocument();
      expect(screen.getByTestId('mock-weekly-time-calendar')).toBeInTheDocument();
      expect(screen.getByText(/Weekly Time Calendar for test-user-id with 1 sessions/)).toBeInTheDocument();
    });
  });
});
