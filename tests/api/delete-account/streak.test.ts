// ① Supabase Auth Helpers を“thenableチェーン”でモック
jest.mock('@supabase/auth-helpers-nextjs', () => {
  const state = {
    rows: [] as Array<Record<string, any>>,
    session: true,               // ★ 追加: 認証あり/なし
    error: null as Error | null, // ★ 追加: DBエラー注入
  };

  const makeChain = () => {
    const thenable = { then: (resolve: any) => resolve({ data: state.rows, error: state.error }) };
    const proxy = new Proxy(thenable as any, {
      get(_t, prop: string) {
        if (prop === 'then') return thenable.then;
        if (['select','order','eq','gte','lte','in','limit','range','or','neq','contains','throwOnError','returns'].includes(prop as string)) return () => proxy;
        if (prop === 'single' || prop === 'maybeSingle')
          return () => ({ then: (resolve: any) => resolve({ data: state.rows[0] ?? null, error: state.error }) });
        return (thenable as any)[prop];
      },
    });
    return proxy;
  };

  const createPagesServerClient = jest.fn(() => ({
    auth: {
      getSession: jest.fn(async () =>
        state.session
          ? ({ data: { session: { user: { id: 'u1' } } }, error: null })
          : ({ data: { session: null }, error: null })
      ),
    },
    from: jest.fn(() => makeChain()),
  }));

  const __setRows = (rows: Array<Record<string, any>>) => { state.rows = rows; };
  const __setSession = (on: boolean) => { state.session = on; };
  const __setError = (err: Error | null) => { state.error = err; };

  return { createPagesServerClient, __setRows, __setSession, __setError };
});

// ② 本体 import（モック定義の後）
import handler from '@/pages/api/streak';

// ③ ヘルパ
const setRowsYmd = (ymds: string[]) => {
  const rows = ymds.map(d => ({ created_at: `${d}T12:00:00.000Z` })); // 本体は created_at を使用
  (jest.requireMock('@supabase/auth-helpers-nextjs') as any).__setRows(rows);
};
const mod = () => jest.requireMock('@supabase/auth-helpers-nextjs') as any;
const setSession = (on: boolean) => mod().__setSession(on);
const setDbError = (on: boolean) => mod().__setError(on ? new Error('boom') : null);

// 最低限の NextApiRequest もどき
const mockReq = (overrides: Partial<any> = {}) =>
  ({
    method: 'GET',
    headers: { cookie: '' }, // ← これ重要
    cookies: {},
    query: {},
    body: undefined,
    ...overrides,
  } as any);

// 最低限の NextApiResponse もどき（ヘッダ操作をサポート）
const mockRes = () => {
  const headers: Record<string, any> = {};
  const res: any = {
    statusCode: 200,
    setHeader: (name: string, value: any) => { headers[name.toLowerCase()] = value; },
    getHeader: (name: string) => headers[name.toLowerCase()],
    getHeaders: () => headers,
    removeHeader: (name: string) => { delete headers[name.toLowerCase()]; },
    status: jest.fn().mockImplementation((code: number) => { res.statusCode = code; return res; }),
    json:   jest.fn().mockImplementation((payload: any) => { res.body = payload; return res; }),
    end:    jest.fn(),
  };
  
  return res;
};

// ④ 今日を固定（必要なら）
beforeAll(() => {
  jest.useFakeTimers().setSystemTime(new Date('2025-08-11T00:00:00+09:00'));
});
afterAll(() => jest.useRealTimers());

// ⑤ テスト
it('今日・昨日・一昨日の3連続なら 200 / streak=3', async () => {
  setRowsYmd(['2025-08-09', '2025-08-10', '2025-08-11']);
  const req = mockReq(); const res = mockRes();
  await handler(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.body).toEqual({ streak: 3 });
});

it('当日未実施・前日だけ実施なら 200 / streak=1', async () => {
  setRowsYmd(['2025-08-01', '2025-08-02', '2025-08-10']); // 8/11なし
  const req = mockReq(); const res = mockRes();
  await handler(req, res);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.body).toEqual({ streak: 1 });
});

it('空データなら 200 / streak=0', async () => {
  setRowsYmd([]);
  const req = mockReq(); const res = mockRes();
  await handler(req, res);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.body).toEqual({ streak: 0 });
});
// 認証なし → 401
it('未認証なら 401', async () => {
  setSession(false);
  setRowsYmd(['2025-08-11']);
  const req = mockReq(); const res = mockRes();
  await handler(req, res);
  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.body).toEqual({ error: 'Not authorized' });
  setSession(true); // 後続に影響しないよう戻す
});

// 非GET → 405
it('POST は 405', async () => {
  const req = mockReq({ method: 'POST' }); const res = mockRes();
  await handler(req, res);
  expect(res.status).toHaveBeenCalledWith(405);
  expect(res.body).toEqual({ error: 'Method Not Allowed' });
});

// DBエラー → 500
it('DB エラーなら 500', async () => {
  setDbError(true);
  const req = mockReq(); const res = mockRes();
  await handler(req, res);
  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.body).toEqual({ error: 'boom' });
  setDbError(false);
});

// 同一日の重複は 1日扱い
it('同一日の重複レコードは 1日としてカウント', async () => {
  setRowsYmd(['2025-08-11','2025-08-11','2025-08-10']); // 8/11 が複数あっても OK
  const req = mockReq(); const res = mockRes();
  await handler(req, res);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.body).toEqual({ streak: 2 }); // 今日+昨日で2
});

// 今日だけ → 1
it('今日だけの実施なら streak=1', async () => {
  setRowsYmd(['2025-08-11']); // 昨日無し
  const req = mockReq(); const res = mockRes();
  await handler(req, res);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.body).toEqual({ streak: 1 });
});

// 月末/年跨ぎも連続と判定
it('月跨ぎ（7/31→8/1）も連続', async () => {
  jest.setSystemTime(new Date('2025-08-01T00:00:00+09:00'));
  setRowsYmd(['2025-07-31','2025-08-01']);
  const req = mockReq(); const res = mockRes();
  await handler(req, res);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.body).toEqual({ streak: 2 });
  jest.setSystemTime(new Date('2025-08-11T00:00:00+09:00')); // 元に戻す
});

it('年跨ぎ（12/31→1/1）も連続', async () => {
  jest.setSystemTime(new Date('2026-01-01T00:00:00+09:00'));
  setRowsYmd(['2025-12-31','2026-01-01']);
  const req = mockReq(); const res = mockRes();
  await handler(req, res);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.body).toEqual({ streak: 2 });
  jest.setSystemTime(new Date('2025-08-11T00:00:00+09:00'));
});
