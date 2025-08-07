
import React from 'react';
import { render, act, waitFor, cleanup } from '@testing-library/react';
import { TimerProvider, useTimer } from '@/context/TimerContext';
import { SettingsProvider, useSettings } from '@/context/SettingsContext';
import { supabase } from '@/lib/supabaseClient';

// --- Mocks ---
const mockInsert = jest.fn().mockResolvedValue({ error: null });

jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    from: jest.fn((table: string) => ({
      insert: mockInsert,
    })),
  },
}));

jest.mock('@/context/SettingsContext', () => ({
  ...jest.requireActual('@/context/SettingsContext'),
  useSettings: jest.fn(),
}));

const mockUseSettings = useSettings as jest.Mock;

// --- Test Component & Hook Accessor ---
let timerHookValue: any;
const TestComponent = () => {
  timerHookValue = useTimer();
  return <div data-testid="timer-values">{JSON.stringify(timerHookValue, (key, value) => typeof value === 'function' ? undefined : value)}</div>;
};

// --- Test Suite ---
describe('TimerContext', () => {
  let settings: any;

  const renderWithProviders = async () => {
    let renderResult: any;
    await act(async () => {
      renderResult = render(
        <SettingsProvider>
          <TimerProvider>
            <TestComponent />
          </TimerProvider>
        </SettingsProvider>
      );
    });
    return renderResult;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    jest.clearAllMocks();
    mockInsert.mockClear();

    settings = {
      workDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      longBreakInterval: 4,
      autoStartWork: false,
      autoStartBreak: false,
    };
    mockUseSettings.mockReturnValue(settings);
  });

  afterEach(() => {
    jest.useRealTimers();
    cleanup();
  });

  it('should initialize with default pomodoro values', async () => {
    const { getByTestId } = await renderWithProviders();
    const timerValues = JSON.parse(getByTestId('timer-values').textContent || '{}');
    expect(timerValues.mode).toBe('pomodoro');
    expect(timerValues.minutes).toBe(25);
    expect(timerValues.seconds).toBe(0);
    expect(timerValues.isActive).toBe(false);
  });

  it('should start and pause the timer', async () => {
    const { getByTestId } = await renderWithProviders();

    act(() => {
      timerHookValue.startTimer();
    });
    let timerValues = JSON.parse(getByTestId('timer-values').textContent || '{}');
    expect(timerValues.isActive).toBe(true);
    expect(timerValues.isPaused).toBe(false);

    act(() => {
      timerHookValue.pauseTimer();
    });
    timerValues = JSON.parse(getByTestId('timer-values').textContent || '{}');
    expect(timerValues.isActive).toBe(true);
    expect(timerValues.isPaused).toBe(true);
  });

  it('should reset the timer', async () => {
    const { getByTestId } = await renderWithProviders();

    act(() => {
      timerHookValue.startTimer();
      jest.advanceTimersByTime(5000);
    });

    act(() => {
      timerHookValue.resetTimer();
    });

    const timerValues = JSON.parse(getByTestId('timer-values').textContent || '{}');
    expect(timerValues.isActive).toBe(false);
    expect(timerValues.minutes).toBe(25);
    expect(timerValues.seconds).toBe(0);
  });

  it('should transition from pomodoro to short break and save session', async () => {
    settings.workDuration = 0;
    mockUseSettings.mockReturnValue(settings);
    const { getByTestId } = await renderWithProviders();

    act(() => {
      timerHookValue.startTimer();
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      const newTimerValues = JSON.parse(getByTestId('timer-values').textContent || '{}');
      expect(newTimerValues.mode).toBe('shortBreak');
      expect(newTimerValues.pomodoroCount).toBe(1);
      expect(mockInsert).toHaveBeenCalledWith({ user_id: 'test-user', duration_minutes: 0 });
    });
  });

  it('should transition from short break to pomodoro', async () => {
    settings.shortBreakDuration = 0;
    mockUseSettings.mockReturnValue(settings);
    const { getByTestId } = await renderWithProviders();

    act(() => {
      timerHookValue.setMode('shortBreak');
    });
    
    act(() => {
        timerHookValue.startTimer();
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      const newTimerValues = JSON.parse(getByTestId('timer-values').textContent || '{}');
      expect(newTimerValues.mode).toBe('pomodoro');
      expect(newTimerValues.minutes).toBe(25);
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  it('should transition to long break after N pomodoros', async () => {
    settings.workDuration = 0;
    settings.longBreakInterval = 2;
    mockUseSettings.mockReturnValue(settings);
    const { getByTestId } = await renderWithProviders();

    act(() => {
      timerHookValue.setPomodoroCount(1);
    });

    act(() => {
      timerHookValue.startTimer();
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      const newTimerValues = JSON.parse(getByTestId('timer-values').textContent || '{}');
      expect(newTimerValues.mode).toBe('longBreak');
      expect(newTimerValues.pomodoroCount).toBe(2);
      expect(mockInsert).toHaveBeenCalledTimes(1);
    });
  });

  it('should auto-start break if enabled', async () => {
    settings.workDuration = 0;
    settings.autoStartBreak = true;
    mockUseSettings.mockReturnValue(settings);
    const { getByTestId } = await renderWithProviders();

    act(() => {
        timerHookValue.startTimer();
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      const newTimerValues = JSON.parse(getByTestId('timer-values').textContent || '{}');
      expect(newTimerValues.mode).toBe('shortBreak');
      expect(newTimerValues.isActive).toBe(true);
    });
  });

  it('should auto-start work if enabled', async () => {
    settings.shortBreakDuration = 0;
    settings.autoStartWork = true;
    mockUseSettings.mockReturnValue(settings);
    const { getByTestId } = await renderWithProviders();

    act(() => {
      timerHookValue.setMode('shortBreak');
    });

    act(() => {
      timerHookValue.startTimer();
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      const newTimerValues = JSON.parse(getByTestId('timer-values').textContent || '{}');
      expect(newTimerValues.mode).toBe('pomodoro');
      expect(newTimerValues.isActive).toBe(true);
    });
  });

  it('should save and restore state from localStorage', async () => {
    const stateToSave = {
      mode: 'shortBreak',
      minutes: 4,
      seconds: 30,
      isActive: true,
      isPaused: true,
      pomodoroCount: 3,
    };
    localStorage.setItem('pomodoroTimerState', JSON.stringify(stateToSave));

    const { getByTestId } = await renderWithProviders();
    
    const timerValues = JSON.parse(getByTestId('timer-values').textContent || '{}');
    expect(timerValues.mode).toBe('shortBreak');
    expect(timerValues.minutes).toBe(4);
    expect(timerValues.seconds).toBe(30);
    expect(timerValues.isActive).toBe(true);
    expect(timerValues.isPaused).toBe(true);
    expect(timerValues.pomodoroCount).toBe(3);
  });
});
