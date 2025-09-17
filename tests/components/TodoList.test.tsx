import { render, screen, fireEvent } from '@testing-library/react';
import TodoList from '@/components/TodoList';

const mockTodos = [
  { id: 1, description: 'Test Todo 1', is_completed: false, created_at: new Date().toISOString(), user_id: '1' },
  { id: 2, description: 'Test Todo 2', is_completed: true, created_at: new Date().toISOString(), user_id: '1' },
];

describe('TodoList', () => {
  let onUpdateTodo: jest.Mock;
  let onDeleteTodo: jest.Mock;

  beforeEach(() => {
    onUpdateTodo = jest.fn();
    onDeleteTodo = jest.fn();
  });

  it('should render a list of todos', () => {
    render(<TodoList todos={mockTodos} onUpdateTodo={onUpdateTodo} onDeleteTodo={onDeleteTodo} />);
    expect(screen.getByText('Test Todo 1')).toBeInTheDocument();
    expect(screen.getByText('Test Todo 2')).toBeInTheDocument();
  });

  it('should show a message when there are no todos', () => {
    render(<TodoList todos={[]} onUpdateTodo={onUpdateTodo} onDeleteTodo={onDeleteTodo} />);
    expect(screen.getByText('未完了のタスクはありません。')).toBeInTheDocument();
  });

  it('should call onUpdateTodo when a checkbox is clicked', () => {
    render(<TodoList todos={mockTodos} onUpdateTodo={onUpdateTodo} onDeleteTodo={onDeleteTodo} />);
    const checkbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(checkbox);
    expect(onUpdateTodo).toHaveBeenCalledWith(1, 'Test Todo 1', true);
  });

  it('should call onDeleteTodo when the delete button is clicked', () => {
    render(<TodoList todos={mockTodos} onUpdateTodo={onUpdateTodo} onDeleteTodo={onDeleteTodo} />);
    const deleteButton = screen.getAllByLabelText('Delete todo')[0];
    fireEvent.click(deleteButton);
    expect(onDeleteTodo).toHaveBeenCalledWith(1);
  });

  it('should switch to edit mode when the edit button is clicked', () => {
    render(<TodoList todos={mockTodos} onUpdateTodo={onUpdateTodo} onDeleteTodo={onDeleteTodo} />);
    const editButton = screen.getAllByLabelText('Edit todo')[0];
    fireEvent.click(editButton);
    expect(screen.getByDisplayValue('Test Todo 1')).toBeInTheDocument();
  });

  it('should call onUpdateTodo when saving an edit', () => {
    render(<TodoList todos={mockTodos} onUpdateTodo={onUpdateTodo} onDeleteTodo={onDeleteTodo} />);
    const editButton = screen.getAllByLabelText('Edit todo')[0];
    fireEvent.click(editButton);

    const input = screen.getByDisplayValue('Test Todo 1');
    fireEvent.change(input, { target: { value: 'Updated Todo' } });

    const saveButton = screen.getByLabelText('Save todo');
    fireEvent.click(saveButton);

    expect(onUpdateTodo).toHaveBeenCalledWith(1, 'Updated Todo', false);
  });
});
