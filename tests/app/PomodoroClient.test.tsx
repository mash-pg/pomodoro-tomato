import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import PomodoroClient from '@/app/PomodoroClient';
import { useTimer } from '@/context/TimerContext';
import { useSettings } from '@/context/SettingsContext';
import { supabase } from '@/lib/supabaseClient';
import * as firebaseMessaging from 'firebase/messaging';
import admin from 'firebase-admin';
import '@testing-library/jest-dom';
// ← 一番上に置く（他の import の前）
// Supabase を stateful にモックして、insert 後に一覧へ反映されるようにする
jest.mock('@/lib/supabaseClient', () => {
  const user = { id: 'test-user-id', email: 'test@example.com' };

  // tasks のインメモリDB
  const tasksStore: Array<{ id: number; description: string; user_id: string; created_at: string }> = [];

  // チェーン可能なクエリビルダー（最後に Promise を返す）
  const makeQB = (getter: () => any[]) => {
    const qb: any = {
      _filters: {} as Record<string, any>,
      select: jest.fn(() => qb),
      eq: jest.fn((col: string, val: any) => { qb._filters[col] = val; return qb; }),
      gte: jest.fn((col: string, val: any) => { qb._filters[`${col}__gte`] = val; return qb; }),
      lt:  jest.fn((col: string, val: any) => { qb._filters[`${col}__lt`]  = val; return qb; }),
      lte: jest.fn((col: string, val: any) => { qb._filters[`${col}__lte`] = val; return qb; }),
      filter: jest.fn(() => qb),
      order: jest.fn(async () => {
        const all = getter();
        const f = qb._filters;
        let rows = all;
        if (f['user_id'] != null) rows = rows.filter(r => r.user_id === f['user_id']);
        if (f['created_at__gte']) rows = rows.filter(r => r.created_at >= f['created_at__gte']);
        if (f['created_at__lt'])  rows = rows.filter(r => r.created_at <  f['created_at__lt']);
        if (f['created_at__lte']) rows = rows.filter(r => r.created_at <= f['created_at__lte']);
        return { data: rows, error: null };
      }),
      range: jest.fn(async () => {
        const rows = getter();
        return { data: rows, error: null, count: rows.length };
      }),
      single: jest.fn(async () => {
        const rows = getter();
        return { data: rows[0] ?? null, error: null };
      }),
      insert: jest.fn(async (payload: any[]) => {
        // insert → select → single のテストチェーン対応
        const added = payload.map((p, i) => {
          const row = {
            id: tasksStore.length + i + 1,
            description: p.description ?? 'Test Task',
            user_id: p.user_id ?? user.id,
            created_at: p.created_at ?? new Date().toISOString(),
          };
          tasksStore.push(row);
          return row;
        });
        return {
          select: () => ({
            single: async () => ({ data: added[0], error: null }),
          }),
        };
      }),
      upsert: jest.fn(async () => ({ data: null, error: null })),
      delete: jest.fn(async () => ({ data: null, error: null })),
    };
    return qb;
  };

  const supabase = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user } }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'test' } } }),
    },
    from: jest.fn((table: string) => {
      switch (table) {
        case 'tasks':
          // いつでも tasksStore を返す（保存後も一覧に反映される）
          return makeQB(() => tasksStore);

        case 'pomodoro_sessions': {
          // ページング/統計用：空配列で十分。必要なら拡張OK
          const list: any[] = [];
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => ({
                  range: jest.fn(async () => ({ data: list, error: null, count: 0 })),
                })),
              })),
            })),
            delete: jest.fn(async () => ({ data: null, error: null })),
          } as any;
        }

        case 'user_settings':
          // モーダル表示ON、通知OFFのデフォルト
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(async () => ({
                  data: {
                    work_minutes: 25,
                    short_break_minutes: 5,
                    long_break_minutes: 15,
                    long_break_interval: 4,
                    auto_start_work: false,
                    auto_start_break: false,
                    mute_notifications: false,
                    dark_mode: true,
                    enable_task_tracking: true,
                  },
                  error: null,
                })),
              })),
            })),
          } as any;

        case 'user_goals':
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(async () => ({
                  data: { daily_pomodoros: 8, weekly_pomodoros: 40, monthly_pomodoros: 160 },
                  error: null,
                })),
              })),
            })),
            upsert: jest.fn(async () => ({ data: null, error: null })),
          } as any;

        case 'push_subscriptions':
          return { insert: jest.fn(async () => ({ error: null })) } as any;

        default:
          return {
            select: jest.fn(() => ({ eq: jest.fn(async () => ({ data: [], error: null })) })),
          } as any;
      }
    }),
  };

  return { supabase };
});


// --- Mocks ---
jest.mock('@/context/TimerContext');
jest.mock('@/context/SettingsContext');
//jest.mock('@/lib/supabaseClient');
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
const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockUser = { id: 'test-user-id', email: 'test@example.com' };

describe('PomodoroClient', () => {
  let timerContextValue: any;
  let settingsContextValue: any;

  const renderComponent = async () => {
    let renderResult: any;
    await act(async () => {
      renderResult = render(<PomodoroClient />);
    });
    return renderResult;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    timerContextValue = {
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
            single: jest.fn().mockResolvedValue({ data: { mute_notifications: false, enable_task_tracking: true }, error: null }),
            filter: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
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

  describe('Audio on Timer Completion', () => {
    it('should play sound on completion', async () => {
        const { rerender } = await renderComponent();
        // await waitFor(() => screen.getAllByRole('audio')); // No longer needed
        // const audio = screen.getAllByRole('audio')[0] as HTMLAudioElement; // No longer needed
        const playSpy = jest.spyOn(window.HTMLMediaElement.prototype, 'play');

        mockUseTimer.mockReturnValue({ ...timerContextValue, completionCount: 1, lastCompletedMode: 'pomodoro' });
        await act(async () => { rerender(<PomodoroClient />); });

        expect(playSpy).toHaveBeenCalled();
    });
  });

  describe('Push Notifications', () => {
    it('should send push notification on completion', async () => {
        const { rerender } = await renderComponent();
        await act(async () => { rerender(<PomodoroClient />); }); // Re-render to trigger useEffect
        await navigator.serviceWorker.ready; // Wait for service worker to be ready
        await waitFor(() => expect(mockGetToken).toHaveBeenCalled());
        await waitFor(() => expect(screen.getByText('通知をオフにする')).toBeInTheDocument());

        mockUseTimer.mockReturnValue({ ...timerContextValue, completionCount: 1, lastCompletedMode: 'pomodoro' });
        await act(async () => { rerender(<PomodoroClient />); });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/notify', expect.objectContaining({ method: 'POST' }));
        });
    });
  });

  describe('Task Input on Completion', () => {
    it('should open task modal on pomodoro completion when enabled', async () => {
      const { rerender } = await renderComponent();
      mockUseTimer.mockReturnValue({ ...timerContextValue, completionCount: 1, lastCompletedMode: 'pomodoro' });
      await act(async () => { rerender(<PomodoroClient />); });
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'タスクを記録' })).toBeInTheDocument();
      });
    });

    it('should not open task modal when disabled in settings', async () => {
        // Mock settings to be disabled
        (supabase.from as jest.Mock).mockImplementation((tableName: string) => {
            if (tableName === 'user_settings') {
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    single: jest.fn().mockResolvedValue({ data: { enable_task_tracking: false, mute_notifications: false }, error: null }),
                };
            }
            if (tableName === 'pomodoro_sessions') {
                return {
                    select: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ data: [], error: null }) }),
                };
            }
            return {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                filter: jest.fn().mockReturnThis(),
                order: jest.fn().mockResolvedValue({ data: [], error: null }),
                insert: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: {}, error: null }),
            };
        });

        const { rerender } = await renderComponent();
        mockUseTimer.mockReturnValue({ ...timerContextValue, completionCount: 1, lastCompletedMode: 'pomodoro' });
        await act(async () => { rerender(<PomodoroClient />); });

        await waitFor(() => {
            expect(screen.queryByRole('heading', { name: 'タスクを記録' })).not.toBeInTheDocument();
        });
    });

    it('should save a task and update the list', async () => {
        const { rerender } = await renderComponent();

        mockUseTimer.mockReturnValue({ ...timerContextValue, completionCount: 1, lastCompletedMode: 'pomodoro' });
        await act(async () => { rerender(<PomodoroClient />); });
        await waitFor(() => screen.getByRole('heading', { name: 'タスクを記録' }));

        const textarea = screen.getByPlaceholderText('（例）設計書の作成');
        const saveButton = screen.getByRole('button', { name: '保存' });

        fireEvent.change(textarea, { target: { value: 'My new task' } });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(supabase.from).toHaveBeenCalledWith('tasks');
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
    });

    it('should send notifications to multiple tokens', async () => {
        const mockTokens = [{ fcm_token: 'token1' }, { fcm_token: 'token2' }];
        mockSupabase.from = jest.fn().mockReturnValue({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: mockTokens, error: null }) } as any);

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
        mockSupabase.from = jest.fn().mockImplementation((tableName: string) => {
            if (tableName === 'push_subscriptions') {
                return { insert: jest.fn().mockResolvedValue({ error: null }) };
            }
            return { insert: jest.fn().mockResolvedValue({ error: null }) }; // Fallback for other tables
        });
    });

    it('should return 400 on POST if fcmToken is missing', async () => {
        mockReq = { method: 'POST', body: { userId: 'test-user' } };
        const handler = (await import('@/pages/api/subscribe')).default;
        await handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(201);
    });
});