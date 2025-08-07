import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'; // ← fireEvent 追加
import LoginPage from '@/app/login/page';
import { useRouter } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import '@testing-library/jest-dom';
import { supabase } from '@/lib/supabaseClient';

jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
    },
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock AuthForm component
jest.mock('@/components/AuthForm', () => ({
  __esModule: true,
  default: jest.fn(({ isSignUp, onSubmit, loading, error }) => (
    <form data-testid="mock-auth-form" onSubmit={(e) => { e.preventDefault(); onSubmit('test@example.com', 'password123'); }}>
      <h2>{isSignUp ? '新規登録' : 'ログイン'}</h2>
      {error && <p>{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? '処理中...' : (isSignUp ? '新規登録' : 'ログイン')}
      </button>
    </form>
  )),
}));

const mockUseRouter = useRouter as jest.Mock;
describe('LoginPage', () => {
  const pushMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: pushMock });
  });

  it('should render the login page with AuthForm', async () => {
    await act(async () => {
      render(<LoginPage />);
    });
    expect(screen.getByRole('heading', { name: 'ログイン' })).toBeInTheDocument();
    expect(screen.getByTestId('mock-auth-form')).toBeInTheDocument();
  });

  it('should redirect to home page on successful login', async () => {
    (mockSupabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
      data: { user: {} },
      error: null,
    });

    await act(async () => {
      render(<LoginPage />);
    });

    const authForm = screen.getByTestId('mock-auth-form');
    await act(async () => {
      fireEvent.submit(authForm);
    });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/');
    });
  });

  it('should display error message on authentication error', async () => {
    (mockSupabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
      data: { user: null },
      error: new Error('Auth Error'),
    });

    await act(async () => {
      render(<LoginPage />);
    });

    const authForm = screen.getByTestId('mock-auth-form');
    await act(async () => {
      fireEvent.submit(authForm);
    });

    await waitFor(() => {
      expect(screen.getByText('Auth Error')).toBeInTheDocument();
    });
  });
});
