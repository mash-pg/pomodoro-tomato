import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TasksPage from '@/app/tasks/page';
import { supabase } from '@/lib/supabaseClient';
import { useTasks } from '@/context/TaskContext';

jest.mock('@/context/TaskContext', () => ({
  __esModule: true,
  useTasks: jest.fn(),
}));

const mockUseTasks = useTasks as jest.Mock;

// Mock the supabase client
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(), // Add mock for getSession
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

// Mock the fetch API
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('TasksPage', () => {
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
      error: null,
    });
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });
    mockUseTasks.mockReturnValue({
      tasks: [],
      fetchTasks: jest.fn(),
      latestTask: null,
    });
  });

  it('should display loading state initially', () => {
    (supabase.auth.getUser as jest.Mock).mockReturnValueOnce(new Promise(() => {})); // Never resolve to keep loading
    render(<TasksPage />);
    expect(screen.getByText('タスクを読み込み中...')).toBeInTheDocument();
  });

  it('should prompt user to log in if not authenticated', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({ data: { user: null } });
    render(<TasksPage />);
    await waitFor(() => {
      expect(screen.getByText('タスクを表示するにはログインしてください。')).toBeInTheDocument();
    });
  });

  it('should display task sections when user is authenticated and no tasks', async () => {
    render(<TasksPage />);
    await waitFor(() => {
      expect(screen.getByText('あなたのタスク履歴')).toBeInTheDocument();
      expect(screen.getByText('今日のタスク')).toBeInTheDocument();
      expect(screen.getByText('週ごとのタスク')).toBeInTheDocument();
      expect(screen.getByText('今日完了したタスクはありません。')).toBeInTheDocument();
    });
  });

  it("should display today's tasks", async () => {
    const mockTasks = [
      { id: 1, user_id: mockUser.id, description: 'Test Task 1', created_at: new Date().toISOString() },
    ];
    mockUseTasks.mockReturnValue({
        tasks: mockTasks,
        fetchTasks: jest.fn(),
        latestTask: mockTasks[0],
    });

    render(<TasksPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Task 1')).toBeInTheDocument();
    });
  });

  it("should delete a task from today's tasks", async () => {
    const mockTasks = [
      { id: 1, user_id: mockUser.id, description: 'Task to delete', created_at: new Date().toISOString() },
    ];
    mockUseTasks.mockReturnValue({
        tasks: mockTasks,
        fetchTasks: jest.fn(),
        latestTask: mockTasks[0],
    });

    render(<TasksPage />);

    await waitFor(() => {
      expect(screen.getByText('Task to delete')).toBeInTheDocument();
    });

    const deleteButton = screen.getByLabelText('Delete task');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/delete-task',
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify({ task_id: 1 }),
        })
      );
    });
  });

  it("should allow editing a task from today's tasks", async () => {
    const mockTasks = [
      { id: 1, user_id: mockUser.id, description: 'Original Task', created_at: new Date().toISOString() },
    ];
    mockUseTasks.mockReturnValue({
        tasks: mockTasks,
        fetchTasks: jest.fn(),
        latestTask: mockTasks[0],
    });

    render(<TasksPage />);

    await waitFor(() => {
      expect(screen.getByText('Original Task')).toBeInTheDocument();
    });

    const editButton = screen.getByLabelText('Edit task');
    fireEvent.click(editButton);

    const inputField = screen.getByDisplayValue('Original Task');
    fireEvent.change(inputField, { target: { value: 'Updated Task' } });

    const saveButton = screen.getByLabelText('Save task');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/update-task',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ task_id: 1, description: 'Updated Task' }),
        })
      );
    });
  });

  it("should cancel editing a task from today's tasks", async () => {
    const mockTasks = [
      { id: 1, user_id: mockUser.id, description: 'Original Task', created_at: new Date().toISOString() },
    ];
    mockUseTasks.mockReturnValue({
        tasks: mockTasks,
        fetchTasks: jest.fn(),
        latestTask: mockTasks[0],
    });

    render(<TasksPage />);

    await waitFor(() => {
      expect(screen.getByText('Original Task')).toBeInTheDocument();
    });

    const editButton = screen.getByLabelText('Edit task');
    fireEvent.click(editButton);

    const inputField = screen.getByDisplayValue('Original Task');
    fireEvent.change(inputField, { target: { value: 'Updated Task' } });

    const cancelButton = screen.getByLabelText('Cancel edit');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(mockFetch).not.toHaveBeenCalled();
      expect(screen.getByText('Original Task')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('Updated Task')).not.toBeInTheDocument();
    });
  });

  it('should display error message if task fetching fails', async () => {
    const fetchTasks = jest.fn().mockRejectedValue(new Error('Fetch error'));
    mockUseTasks.mockReturnValue({
        tasks: [],
        fetchTasks: fetchTasks,
        latestTask: null,
    });

    render(<TasksPage />);

    await waitFor(() => {
        expect(screen.getByText('タスクの読み込みに失敗しました。')).toBeInTheDocument();
    });
  });

  it('should display error message if delete task API fails', async () => {
    const mockTasks = [
      { id: 1, user_id: mockUser.id, description: 'Task to delete', created_at: new Date().toISOString() },
    ];
    mockUseTasks.mockReturnValue({
        tasks: mockTasks,
        fetchTasks: jest.fn(),
        latestTask: mockTasks[0],
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ detail: 'Failed to delete' }),
    });

    render(<TasksPage />);

    await waitFor(() => {
      expect(screen.getByText('Task to delete')).toBeInTheDocument();
    });

    const deleteButton = screen.getByLabelText('Delete task');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('タスクの削除に失敗しました。')).toBeInTheDocument();
    });
  });

  it('should display error message if update task API fails', async () => {
    const mockTasks = [
      { id: 1, user_id: mockUser.id, description: 'Original Task', created_at: new Date().toISOString() },
    ];
    mockUseTasks.mockReturnValue({
        tasks: mockTasks,
        fetchTasks: jest.fn(),
        latestTask: mockTasks[0],
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ detail: 'Failed to update' }),
    });

    render(<TasksPage />);

    await waitFor(() => {
      expect(screen.getByText('Original Task')).toBeInTheDocument();
    });

    const editButton = screen.getByLabelText('Edit task');
    fireEvent.click(editButton);

    const inputField = screen.getByDisplayValue('Original Task');
    fireEvent.change(inputField, { target: { value: 'Updated Task' } });

    const saveButton = screen.getByLabelText('Save task');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('タスクの更新に失敗しました。')).toBeInTheDocument();
    });
  });
});

// Add a test case for adding a new task
it('should add a new task', async () => {
  render(<TasksPage />);

  await waitFor(() => {
    expect(screen.getByPlaceholderText('新しいタスクを追加')).toBeInTheDocument();
  });

  const input = screen.getByPlaceholderText('新しいタスクを追加');
  const addButton = screen.getByText('追加');

  fireEvent.change(input, { target: { value: 'New Task' } });
  fireEvent.click(addButton);

  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/add-task',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ description: 'New Task' }),
      })
    );
  });
});
