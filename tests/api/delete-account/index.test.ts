// ✅ import より前に mock を定義（外側変数を参照しない）
jest.mock('@supabase/supabase-js', () => {
  const mockDeleteUser = jest.fn();
  const createClient = jest.fn(() => ({
    auth: { admin: { deleteUser: mockDeleteUser } },
  }));
  return { __esModule: true, createClient, __mock: { mockDeleteUser } };
});

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  __esModule: true,
  createPagesServerClient: jest.fn(() => ({
    auth: { getUser: jest.fn(), signOut: jest.fn() },
  })),
}));

// ✅ ここから import
import * as SupabaseJs from '@supabase/supabase-js';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import handler from '@/pages/api/delete-account';
import { NextApiRequest, NextApiResponse } from 'next';

// ← ここでだけ参照を作る（上の冒頭の重複宣言はナシ！）
const mockDeleteUser = (SupabaseJs as any).__mock.mockDeleteUser as jest.Mock;
const mockCreatePagesServerClient = createPagesServerClient as jest.Mock;

describe('DELETE /api/delete-account', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let mockGetUser: jest.Mock;
  let mockSignOut: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteUser.mockReset();

    mockGetUser = jest.fn();
    mockSignOut = jest.fn();

    mockCreatePagesServerClient.mockReturnValue({
      auth: { getUser: mockGetUser, signOut: mockSignOut },
    });

    mockReq = { method: 'POST' };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
    };
  });

  it('should return 405 if method is not POST', async () => {
    mockReq.method = 'GET';
    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
    expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
    expect(mockRes.status).toHaveBeenCalledWith(405);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Method Not Allowed',
      detail: 'Use POST, got GET',
    });
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  it('should delete user and return 200 on success', async () => {
    const mockUser = { id: 'test-user-id' };
    mockGetUser.mockResolvedValueOnce({ data: { user: mockUser }, error: null });
    mockDeleteUser.mockResolvedValueOnce({ error: null });
    mockSignOut.mockResolvedValueOnce({ error: null });

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockDeleteUser).toHaveBeenCalledWith(mockUser.id);
    expect(mockSignOut).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Account deleted successfully' });
  });

  it('should return 500 if user deletion fails', async () => {
    const mockUser = { id: 'test-user-id' };
    mockGetUser.mockResolvedValueOnce({ data: { user: mockUser }, error: null });
    mockDeleteUser.mockResolvedValueOnce({ error: new Error('Deletion failed') });

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockDeleteUser).toHaveBeenCalledWith(mockUser.id);
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to delete user', detail: 'Deletion failed' });
  });
});
