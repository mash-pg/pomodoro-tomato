jest.mock('@supabase/auth-helpers-nextjs', () => ({
  __esModule: true,
  createPagesServerClient: jest.fn(() => ({
    auth: { getUser: jest.fn() },
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(),
      })),
    })),
  })),
}));

import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import handler from '@/pages/api/add-todo';
import { NextApiRequest, NextApiResponse } from 'next';

const mockCreatePagesServerClient = createPagesServerClient as jest.Mock;

describe('POST /api/add-todo', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let mockGetUser: jest.Mock;
  let mockFrom: jest.Mock;
  let mockInsert: jest.Mock;
  let mockSelect: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetUser = jest.fn();
    mockSelect = jest.fn();
    mockInsert = jest.fn(() => ({ select: mockSelect }));
    mockFrom = jest.fn(() => ({ insert: mockInsert }));

    mockCreatePagesServerClient.mockReturnValue({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    });

    mockReq = { 
      method: 'POST',
      body: { description: 'Test Todo' },
    };
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
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' });
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  it('should return 400 if description is missing', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'test-user' } } });
    mockReq.body = {};
    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Description is required' });
  });

  it('should add a todo and return 201 on success', async () => {
    const mockUser = { id: 'test-user-id' };
    const newTodo = { id: 1, user_id: mockUser.id, description: 'Test Todo', is_completed: false };
    mockGetUser.mockResolvedValueOnce({ data: { user: mockUser } });
    mockSelect.mockResolvedValueOnce({ data: [newTodo], error: null });

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockFrom).toHaveBeenCalledWith('todos');
    expect(mockInsert).toHaveBeenCalledWith({ user_id: mockUser.id, description: 'Test Todo', is_completed: false });
    expect(mockSelect).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Todo added successfully', todo: newTodo });
  });

  it('should return 500 if there is a database error', async () => {
    const mockUser = { id: 'test-user-id' };
    mockGetUser.mockResolvedValueOnce({ data: { user: mockUser } });
    mockSelect.mockResolvedValueOnce({ data: null, error: new Error('DB Error') });

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'DB Error' });
  });
});
