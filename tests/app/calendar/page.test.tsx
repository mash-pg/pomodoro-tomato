
import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import CalendarPage from '@/app/calendar/page';
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

jest.mock('react-calendar', () => {
  const MockCalendar = ({ onChange, value, tileContent }: any) => (
    <div data-testid="mock-calendar">
      <input
        type="date"
        data-testid="calendar-date-input"
        value={value.toISOString().split('T')[0]}
        onChange={(e) => onChange(new Date(e.target.value))}
      />
      {tileContent && tileContent({ date: value, view: 'month' })}
    </div>
  );
  return { __esModule: true, default: MockCalendar };
});

jest.mock('@/components/WeeklyCalendar', () => {
  const MockWeeklyCalendar = ({ user, sessions }: any) => (
    <div data-testid="mock-weekly-calendar">
      Weekly Calendar for {user?.id} with {sessions.length} sessions
    </div>
  );
  return { __esModule: true, default: MockWeeklyCalendar };
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
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
    })),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('CalendarPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display loading state initially', async () => {
    (mockSupabase.auth.getUser as jest.Mock).mockReturnValueOnce(new Promise(() => {})); // Never resolve to keep loading state
    await act(async () => {
      render(<CalendarPage />);
    });
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('should display login message if no user is logged in', async () => {
    (mockSupabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    await act(async () => {
      render(<CalendarPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('ログインしてください。')).toBeInTheDocument();
    });
  });


  it('should display error message if fetching sessions fails', async () => {
    const mockUser = { id: 'test-user-id', email: 'test@example.com' };
    (mockSupabase.auth.getUser as jest.Mock).mockResolvedValueOnce({ data: { user: mockUser }, error: null });
    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            data: null,
            error: new Error('Failed to fetch sessions'),
          })),
        })),
      })),
    } as any);

    await act(async () => {
      render(<CalendarPage />);
    });
    await waitFor(() => {
      expect(screen.getByText(/エラー: Failed to fetch sessions/)).toBeInTheDocument();
    });
  });

  it('should render calendar and weekly calendar for logged in user', async () => {
    const mockUser = { id: 'test-user-id', email: 'test@example.com' };
    const mockSessions = [
      { id: 1, created_at: new Date().toISOString(), duration_minutes: 25, user_id: 'test-user-id' },
    ];
    (mockSupabase.auth.getUser as jest.Mock).mockResolvedValueOnce({ data: { user: mockUser }, error: null });
    (mockSupabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            data: mockSessions,
            error: null,
          })),
        })),
      })),
    } as any);

    await act(async () => {
      render(<CalendarPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('ポモドーロカレンダー')).toBeInTheDocument();
      expect(screen.getByTestId('mock-calendar')).toBeInTheDocument();
      expect(screen.getByTestId('mock-weekly-calendar')).toBeInTheDocument();
      expect(screen.getByText(/のポモドーロ: 1 回/)).toBeInTheDocument(); // Assuming one session for today
    });
  });

  it('should update daily pomodoros when date changes', async () => {
    const mockUser = { id: 'test-user-id', email: 'test@example.com' };
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const mockSessions = [
      { id: 1, created_at: today.toISOString(), duration_minutes: 25, user_id: 'test-user-id' },
      { id: 2, created_at: yesterday.toISOString(), duration_minutes: 25, user_id: 'test-user-id' },
    ];

    (mockSupabase.auth.getUser as jest.Mock).mockResolvedValueOnce({ data: { user: mockUser }, error: null });
    (mockSupabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            data: mockSessions,
            error: null,
          })),
        })),
      })),
    } as any);

    await act(async () => {
      render(<CalendarPage />);
    });

    await waitFor(() => {
      expect(screen.getByText(/のポモドーロ: 1 回/)).toBeInTheDocument(); // Today has 1 session
    });

    // Simulate changing date to yesterday
    const dateInput = screen.getByTestId('calendar-date-input') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(dateInput, { target: { value: yesterday.toISOString().split('T')[0] } });
    });

    await waitFor(() => {
      expect(screen.getByText(/のポモドーロ: 1 回/)).toBeInTheDocument(); // Yesterday has 1 session
    });
  });
});
