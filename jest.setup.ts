import '@testing-library/jest-dom';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Mock ResizeObserver for Recharts
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// ---- ここから追記：Supabase Auth Helpers を丸ごとモック ----
jest.mock('@supabase/auth-helpers-nextjs', () => {
  // 返すダミークライアントを1カ所で組み立て
  const makeClient = (rows = []) => {
    const api: any = {
      select: jest.fn().mockResolvedValue({ data: rows, error: null }),
      order: jest.fn(() => api),
      eq: jest.fn(() => api),
      gte: jest.fn(() => api),
      lte: jest.fn(() => api),
    };
    return {
      auth: {
        // ★ 重要：getSession を実装（ログイン済み想定）
        getSession: jest.fn().mockResolvedValue({
          data: { session: { user: { id: 'u1' } } },
          error: null,
        }),
      },
      from: jest.fn(() => api),
    };
  };

  const createPagesServerClient = jest.fn(() => makeClient());

  // テスト側から rows を差し替えたい時のために export しておく（任意）
  (createPagesServerClient as any)._makeClient = makeClient;

  return { createPagesServerClient };
});
// 任意：テスト時の console.error を黙らせる
const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
afterAll(() => errorSpy.mockRestore());

// 任意：fetch をデフォ成功に（Tasksページなどが叩く API を吸収）
type MockResp = { ok: boolean; status: number; json: () => Promise<any> };
const ok = (body: any, status = 200): MockResp => ({ ok: true, status, json: async () => body });

(global as any).fetch = jest.fn(async (url: string, init?: RequestInit) => {
  if (url.startsWith('/api/tasks') && url.includes('period=today')) return ok({ tasks: [] });
  if (url.startsWith('/api/tasks') && url.includes('period=week'))  return ok({ tasks: [] });
  if (url.startsWith('/api/tasks/') && init?.method === 'DELETE')   return ok({ detail: 'deleted' });
  if (url.startsWith('/api/tasks/') && init?.method === 'PUT')      return ok({ detail: 'updated' });
  return ok({});
}) as jest.Mock;
