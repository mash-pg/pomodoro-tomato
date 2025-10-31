jest.mock('@supabase/auth-helpers-nextjs', () => ({
  __esModule: true,
  createPagesServerClient: jest.fn(() => ({
    auth: { getUser: jest.fn() },
    from: jest.fn(() => ({
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({ // for chaining user_id
            select: jest.fn(),
          })),
        })),
      })),
    })),
  })),
}));

import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import handler from '@/pages/api/update-todo';
import { NextApiRequest, NextApiResponse } from 'next';

const mockCreatePagesServerClient = createPagesServerClient as jest.Mock;

describe('PUT /api/update-todo', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let mockGetUser: jest.Mock;
  let mockFrom: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockEq: jest.Mock;
  let mockSelect: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetUser = jest.fn();
    mockSelect = jest.fn();
    // The chained `eq` calls need to be mocked correctly.
    const eqChain = { select: mockSelect };
    const userEqChain = { eq: jest.fn(() => eqChain) };
    mockEq = jest.fn(() => userEqChain);
    mockUpdate = jest.fn(() => ({ eq: mockEq }));
    mockFrom = jest.fn(() => ({ update: mockUpdate }));

    mockCreatePagesServerClient.mockReturnValue({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    });

    mockReq = {
      method: 'PUT',
      body: { todo_id: 1, description: 'Updated Todo', is_completed: true },
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

  it('should update a todo and return 200 on success', async () => {
    const mockUser = { id: 'test-user-id' };
    const updatedTodo = { id: 1, user_id: mockUser.id, description: 'Updated Todo', is_completed: true };
    mockGetUser.mockResolvedValueOnce({ data: { user: mockUser } });
    mockSelect.mockResolvedValueOnce({ data: [updatedTodo], error: null });

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockFrom).toHaveBeenCalledWith('todos');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Updated Todo', is_completed: true })
    );
    expect(mockEq).toHaveBeenCalledWith('id', 1);
    expect(mockEq().eq).toHaveBeenCalledWith('user_id', mockUser.id);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Todo updated successfully', todo: updatedTodo });
  });

  it('should return 404 if todo not found', async () => {
    const mockUser = { id: 'test-user-id' };
    mockGetUser.mockResolvedValueOnce({ data: { user: mockUser } });
    mockSelect.mockResolvedValueOnce({ data: [], error: null }); // Simulate not found

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Todo not found or not owned by user' });
  });
});
