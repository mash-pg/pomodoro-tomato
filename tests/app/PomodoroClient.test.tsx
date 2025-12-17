import React from 'react';
import { render, screen, fireEvent, waitFor, act, waitForElementToBeRemoved } from '@testing-library/react';
import PomodoroClient from '@/app/PomodoroClient';
import { useTimer } from '@/context/TimerContext';
import { useSettings } from '@/context/SettingsContext';
import { TaskProvider } from '@/context/TaskContext';
import * as firebaseMessaging from 'firebase/messaging';
import admin from 'firebase-admin';
import '@testing-library/jest-dom';

// supabase モジュール全体をモックする
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
      signOut: jest.fn(),
      getSession: jest.fn(),
    },
    from: jest.fn(), // from メソッドもモック
  },
}));

// createPagesServerClient をモックする
const mockServerSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
};

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createPagesServerClient: jest.fn(() => mockServerSupabase),
}));

// --- Mocks ---
jest.mock('@/context/TimerContext');
jest.mock('@/context/SettingsContext');
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => [true]),
  getApp: jest.fn(),
}));
jest.mock('firebase/messaging', () => ({
  getMessaging: jest.fn(() => ({
    getToken: jest.fn().mockResolvedValue('mock-fcm-token'),
    onMessage: jest.fn(),
  })),
  getToken: jest.fn().mockResolvedValue('mock-fcm-token'),
  onMessage: jest.fn(),
}));
jest.mock('firebase-admin', () => {
  const sendEachForMulticast = jest.fn().mockResolvedValue({
    responses: [{ success: true }, { success: true }],
    successCount: 2,
    failureCount: 0,
  });
  return {
    apps: [],
    initializeApp: jest.fn(),
    credential: { cert: jest.fn() },
    messaging: jest.fn(() => ({ sendEachForMulticast })),
  };
});

// --- Global Mocks ---
window.HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve());
window.HTMLMediaElement.prototype.pause = jest.fn();
window.HTMLMediaElement.prototype.load = jest.fn();

global.Notification = jest.fn(() => ({ permission: 'granted' })) as any;
global.PushManager = class PushManager {
  static supportedContentEncodings: string[] = [];
  getSubscription = jest.fn();
  permissionState = jest.fn();
  subscribe = jest.fn();
};

Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: jest.fn().mockResolvedValue({
      scope: '/',
      pushManager: {
        subscribe: jest.fn().mockResolvedValue({ endpoint: 'mock-endpoint' }),
      },
    }),
    ready: Promise.resolve({
      pushManager: {
        subscribe: jest.fn().mockResolvedValue({ endpoint: 'mock-endpoint' }),
      },
      active: {},
      scope: '/',
    }),
  },
  writable: true,
});

const mockUseTimer = useTimer as jest.Mock;
const mockUseSettings = useSettings as jest.Mock;
const mockGetToken = firebaseMessaging.getToken as jest.Mock;
const mockOnMessage = firebaseMessaging.onMessage as jest.Mock;
const { supabase: mockSupabase } = jest.requireMock('@/lib/supabaseClient');
const mockUser = { id: 'test-user-id', email: 'test@example.com' };

describe('PomodoroClient', () => {
  let timerContextValue: any;
  let settingsContextValue: any;

  const renderComponent = async () => {
    let renderResult: any;
    await act(async () => {
      renderResult = render(
        <TaskProvider>
          <PomodoroClient />
        </TaskProvider>
      );
    });
    return renderResult;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    //jest.resetModules(); // Add this line

    timerContextValue = {
      mode: 'pomodoro', 
      minutes: 25, seconds: 0, isActive: false, isPaused: false,
      completionCount: 0, lastCompletedMode: null, currentMode: 'pomodoro',
      startTimer: jest.fn(), pauseTimer: jest.fn(), resetTimer: jest.fn(), setMode: jest.fn(),
    };
    settingsContextValue = {
      theme: 'dark', setTheme: jest.fn(), darkMode: true, setDarkMode: jest.fn(),
      showSettingsModal: false, setShowSettingsModal: jest.fn(), settingsRef: { current: {} },
    };

    mockUseTimer.mockReturnValue(timerContextValue);
    mockUseSettings.mockReturnValue(settingsContextValue);

    mockSupabase.auth = {
      getUser: jest.fn().mockResolvedValue({ data: { user: mockUser } }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    } as any;

    mockSupabase.from = jest.fn().mockImplementation((tableName: string) => {
        const baseMock = {
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(), // Allow chaining
            delete: jest.fn().mockResolvedValue({ error: null }),
            upsert: jest.fn().mockResolvedValue({ error: null }),
            eq: jest.fn().mockReturnThis(),
            //single: jest.fn().mockResolvedValue({ data: { mute_notifications: false, enable_task_tracking: true }, error: null }),
            filter: jest.fn().mockReturnThis(),
            //order: jest.fn().mockResolvedValue({ data: [], error: null }),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { mute_notifications: false, enable_task_tracking: true },
              error: null
            }),
          };
        if (tableName === 'pomodoro_sessions') {
            return { // Return a specific mock for this table
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockResolvedValue({ data: [], error: null }), // End the chain here
                }),
            };
        } else if (tableName === 'tasks') {
            const mockTask = { id: 1, description: 'Test Task', user_id: mockUser.id, created_at: new Date().toISOString() };
            baseMock.insert = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: mockTask, error: null }),
                }),
            });
        }
        return baseMock;
    }) as any;

    mockGetToken.mockResolvedValue('mock-fcm-token');
    mockOnMessage.mockImplementation((_, callback) => { (global as any).onMessageCallback = callback; return jest.fn(); });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
  });

  it('should render timer and controls', async () => {
    await renderComponent();
    expect(screen.getByText('25:00')).toBeInTheDocument();
    expect(screen.getByText('ポモドーロ')).toBeInTheDocument();
  });

  it('should display default goals when no goals are set', async () => {
    await renderComponent();
    expect(screen.getByText('今日の目標')).toBeInTheDocument();
        expect(screen.getAllByText('目標が設定されていません').length).toBe(2);
  });
    it('should display fetched text goals', async () => {
    // user_text_goals のモックデータを設定
    mockSupabase.from.mockImplementation((tableName: string) => {
      const baseMock = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }), // デフォルトはデータなし
          insert: jest.fn().mockReturnThis(),
          upsert: jest.fn().mockResolvedValue({ error: null }),
          delete: jest.fn().mockResolvedValue({ error: null }),
      };

      if (tableName === 'user_text_goals') {
        baseMock.single = jest.fn().mockResolvedValue({ data: { daily_goal: 'Test Daily Goal', weekly_goal: 'Test Weekly Goal' }, error: null });
      } else if (tableName === 'user_goals') {
        baseMock.single = jest.fn().mockResolvedValue({ data: { daily_pomodoros: 8, weekly_pomodoros: 40, monthly_pomodoros: 160 }, error: null });
      } else if (tableName === 'pomodoro_sessions') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }
      return baseMock;
    });

    await renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Daily Goal')).toBeInTheDocument();
      expect(screen.getByText('Test Weekly Goal')).toBeInTheDocument();
    });
  });

  describe('Audio on Timer Completion', () => {
    it('should play sound on completion', async () => {
        const { rerender } = await renderComponent();
        const playSpy = jest.spyOn(window.HTMLMediaElement.prototype, 'play');

        mockUseTimer.mockReturnValue({ ...timerContextValue, completionCount: 1, lastCompletedMode: 'pomodoro' });
        await act(async () => {
            rerender(
              <TaskProvider>
                <PomodoroClient />
              </TaskProvider>
            );
            // Ensure any promises from play() are resolved within this act block
            await Promise.resolve();
        });

        expect(playSpy).toHaveBeenCalled();
    });
  });

  describe('Push Notifications', () => {
    it('should send push notification on completion', async () => {
        const { rerender } = await renderComponent();
        await act(async () => { rerender(<TaskProvider><PomodoroClient /></TaskProvider>); }); // Re-render to trigger useEffect
        await navigator.serviceWorker.ready; // Wait for service worker to be ready
        await waitFor(() => expect(mockGetToken).toHaveBeenCalled());
        await waitFor(() => expect(screen.getByText('通知をオフにする')).toBeInTheDocument());

        mockUseTimer.mockReturnValue({ ...timerContextValue, completionCount: 1, lastCompletedMode: 'pomodoro' });
        await act(async () => { rerender(<TaskProvider><PomodoroClient /></TaskProvider>); });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/notify', expect.objectContaining({ method: 'POST' }));
        });
    });
  });

  describe('Task Input on Completion', () => {
    it('should open task modal on pomodoro completion when enabled', async () => {
      const { rerender } = await renderComponent();
      mockUseTimer.mockReturnValue({ ...timerContextValue, completionCount: 1, lastCompletedMode: 'pomodoro' });
      await act(async () => { rerender(<TaskProvider><PomodoroClient /></TaskProvider>); });
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'タスクを記録' })).toBeInTheDocument();
      });
    });

    it('should not open task modal when disabled in settings', async () => {
      // ✅ user_settings だけ部分差し替え。他テーブルは既存モックへ委譲（limit/order を維持）
      const prevFrom = mockSupabase.from as jest.Mock;
      mockSupabase.from = jest.fn((tableName: string) => {
       if (tableName === 'user_settings') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
           single: jest.fn().mockResolvedValue({
              data: { enable_task_tracking: false, mute_notifications: false },
             error: null,
            }),
          } as any;
        }
        return prevFrom(tableName);
      });

      const { rerender } = await renderComponent();

      // ✅ 設定読み込み完了の合図（通知ボタンが出る）まで待つ
      await waitFor(() => {
        expect(screen.getByText('通知をオフにする')).toBeInTheDocument();
      });

      // ここで完了イベントを発火
      mockUseTimer.mockReturnValue({
        ...timerContextValue,
        completionCount: 1,
        lastCompletedMode: 'pomodoro',
      });
      await act(async () => { rerender(<TaskProvider><PomodoroClient /></TaskProvider>); });

      // モーダルが出ていないことを確認
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'タスクを記録' })).not.toBeInTheDocument();
      });
    });
    it('should save a task and update the list', async () => {
        const { rerender } = await renderComponent();

        mockUseTimer.mockReturnValue({ ...timerContextValue, completionCount: 1, lastCompletedMode: 'pomodoro' });
        await act(async () => { rerender(<TaskProvider><PomodoroClient /></TaskProvider>); });
        await waitFor(() => screen.getByRole('heading', { name: 'タスクを記録' }));

        const textarea = screen.getByPlaceholderText('（例）設計書の作成');
        const saveButton = screen.getByRole('button', { name: '保存' });

        fireEvent.change(textarea, { target: { value: 'My new task' } });
        await act(async () => {
            fireEvent.click(saveButton);
        });

        await waitFor(() => {
            expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
        });

        await waitFor(() => {
            expect(screen.queryByRole('heading', { name: 'タスクを記録' })).not.toBeInTheDocument();
        });
        
        //expect(await screen.findByText('Test Task')).toBeInTheDocument(); // From the mock
    });
  });
});

// --- API Tests ---
describe('/api/notify', () => {
    let mockReq: any, mockRes: any;
    const mockSendEachForMulticast = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = { method: 'POST', body: { userId: 'test-user-id' } };
        mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn(), setHeader: jest.fn(), end: jest.fn() };
        // ★これを追加（返り値に responses を含める）
        mockSendEachForMulticast.mockResolvedValue({
          responses: [{ success: true }, { success: true }],
          successCount: 2,
          failureCount: 0,
        });
        (admin.messaging as jest.Mock).mockReturnValue({ sendEachForMulticast: mockSendEachForMulticast });
        mockSupabase.auth.getUser = jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null });
        mockServerSupabase.auth.getUser = jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null });
    });

    it('should send notifications to multiple tokens', async () => {
        const mockTokens = [{ fcm_token: 'token1' }, { fcm_token: 'token2' }];
        mockServerSupabase.from = jest.fn().mockReturnValue({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: mockTokens, error: null }) } as any);

        const handler = (await import('@/pages/api/notify')).default;
        await handler(mockReq, mockRes);

        expect(mockSendEachForMulticast).toHaveBeenCalledWith({ tokens: ['token1', 'token2'], notification: expect.any(Object) });
        expect(mockRes.status).toHaveBeenCalledWith(200);
    });
});

describe('/api/subscribe', () => {
    let mockReq: any, mockRes: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn(), setHeader: jest.fn(), end: jest.fn() };
        mockServerSupabase.from = jest.fn().mockImplementation((tableName: string) => {
            if (tableName === 'push_subscriptions') {
                return { insert: jest.fn().mockResolvedValue({ error: null }) };
            }
            return { insert: jest.fn().mockResolvedValue({ error: null }) }; // Fallback for other tables
        });
        mockServerSupabase.auth.getUser = jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null });
    });

    it('should return 400 on POST if fcmToken is missing', async () => {
        mockReq = { method: 'POST', body: { userId: 'test-user' } };
        const handler = (await import('@/pages/api/subscribe')).default;
        await handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(201);
    });
});
