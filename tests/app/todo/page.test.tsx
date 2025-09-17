import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TodoPage from '@/app/todo/page';
import { supabase } from '@/lib/supabaseClient';
import { useTodos } from '@/context/TodoContext';
import { TodoProvider } from '@/context/TodoContext';

jest.mock('@/context/TodoContext', () => ({
  __esModule: true,
  ...jest.requireActual('@/context/TodoContext'),
  useTodos: jest.fn(),
}));

const mockUseTodos = useTodos as jest.Mock;

// Mock the supabase client
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

// Mock the fetch API
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

describe('TodoPage', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: mockUser, access_token: 'mock-token' } },
    });
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });
    mockUseTodos.mockReturnValue({
      todos: [],
      fetchTodos: jest.fn(),
    });
  });

  const renderWithProvider = (ui: React.ReactElement) => {
    return render(<TodoProvider>{ui}</TodoProvider>);
  }

  it('should prompt user to log in if not authenticated', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({ data: { user: null } });
    mockUseTodos.mockReturnValue({ todos: [], fetchTodos: jest.fn() });
    renderWithProvider(<TodoPage />);
    await waitFor(() => {
      expect(screen.getByText('ToDoリストを表示するにはログインしてください。')).toBeInTheDocument();
    });
  });

  it('should add a new todo', async () => {
    const fetchTodos = jest.fn();
    mockUseTodos.mockReturnValue({ todos: [], fetchTodos });

    renderWithProvider(<TodoPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('新しいToDoを追加')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('新しいToDoを追加');
    const addButton = screen.getByText('追加');

    fireEvent.change(input, { target: { value: 'New Todo' } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/add-todo',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ description: 'New Todo' }),
        })
      );
      expect(fetchTodos).toHaveBeenCalled();
    });
  });

  it('should update a todo', async () => {
    const mockInitialTodos = [
      { id: 1, description: 'Initial todo', is_completed: false },
    ];
    const fetchTodos = jest.fn();
    mockUseTodos.mockReturnValue({ todos: mockInitialTodos, fetchTodos });

    renderWithProvider(<TodoPage />);

    await waitFor(() => {
      expect(screen.getByText('Initial todo')).toBeInTheDocument();
    });

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/update-todo',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ todo_id: 1, description: 'Initial todo', is_completed: true }),
        })
      );
      expect(fetchTodos).toHaveBeenCalled();
    });
  });

  it('should delete a todo', async () => {
    const mockInitialTodos = [
      { id: 1, description: 'Todo to delete', is_completed: false },
    ];
    const fetchTodos = jest.fn();
    mockUseTodos.mockReturnValue({ todos: mockInitialTodos, fetchTodos });

    renderWithProvider(<TodoPage />);

    await waitFor(() => {
      expect(screen.getByText('Todo to delete')).toBeInTheDocument();
    });

    const deleteButton = screen.getByLabelText('Delete todo');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/delete-todo',
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify({ todo_id: 1 }),
        })
      );
      expect(fetchTodos).toHaveBeenCalled();
    });
  });
});
