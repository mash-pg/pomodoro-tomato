jest.mock('@supabase/auth-helpers-nextjs', () => ({
  __esModule: true,
  createPagesServerClient: jest.fn(() => ({
    auth: { getUser: jest.fn() },
    from: jest.fn(() => ({
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(), // for chaining user_id
        })),
      })),
    })),
  })),
}));

import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import handler from '@/pages/api/delete-todo';
import { NextApiRequest, NextApiResponse } from 'next';

const mockCreatePagesServerClient = createPagesServerClient as jest.Mock;

describe('DELETE /api/delete-todo', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let mockGetUser: jest.Mock;
  let mockFrom: jest.Mock;
  let mockDelete: jest.Mock;
  let mockEq: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetUser = jest.fn();
    const userEqChain = { eq: jest.fn(() => ({ error: null })) };
    mockEq = jest.fn(() => userEqChain);
    mockDelete = jest.fn(() => ({ eq: mockEq }));
    mockFrom = jest.fn(() => ({ delete: mockDelete }));

    mockCreatePagesServerClient.mockReturnValue({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    });

    mockReq = {
      method: 'DELETE',
      body: { todo_id: 1 },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
    };
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
    expect(mockRes.status).toHaveBeenCalledWith(401);
  });

  it('should delete a todo and return 200 on success', async () => {
    const mockUser = { id: 'test-user-id' };
    mockGetUser.mockResolvedValueOnce({ data: { user: mockUser } });

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockFrom).toHaveBeenCalledWith('todos');
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', 1);
    expect(mockEq().eq).toHaveBeenCalledWith('user_id', mockUser.id);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Todo deleted successfully' });
  });

  it('should return 400 if todo_id is missing', async () => {
    const mockUser = { id: 'test-user-id' };
    mockGetUser.mockResolvedValueOnce({ data: { user: mockUser } });
    mockReq.body = {};
    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Todo ID is required' });
  });
});
