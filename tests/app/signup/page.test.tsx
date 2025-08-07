
import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import SignUpPage from '@/app/signup/page';
import { useRouter } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import '@testing-library/jest-dom';
import { supabase } from '@/lib/supabaseClient';

// Mock supabase
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
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

describe('SignUpPage', () => {
  const pushMock = jest.fn();
  const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: pushMock });
    alertMock.mockClear();
  });

  it('should render the sign up page with AuthForm', async () => {
    await act(async () => {
      render(<SignUpPage />);
    });
    expect(screen.getByRole('heading', { name: '新規登録' })).toBeInTheDocument();
    expect(screen.getByTestId('mock-auth-form')).toBeInTheDocument();
  });

  it('should show alert and redirect to login page on successful sign up', async () => {
    mockSupabase.auth.signUp.mockResolvedValueOnce({ data: { user: { id: 'test-user' } }, error: null });

    await act(async () => {
      render(<SignUpPage />);
    });

    const authForm = screen.getByTestId('mock-auth-form');
    await act(async () => {
      fireEvent.submit(authForm);
    });

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith('Check your email for the verification link!');
      expect(pushMock).toHaveBeenCalledWith('/login');
    });
  });

  it('should display error message on sign up error', async () => {
    mockSupabase.auth.signUp.mockResolvedValueOnce({ data: { user: null }, error: new Error('Sign Up Error') });

    await act(async () => {
      render(<SignUpPage />);
    });

    const authForm = screen.getByTestId('mock-auth-form');
    await act(async () => {
      fireEvent.submit(authForm);
    });

    await waitFor(() => {
      expect(screen.getByText('Sign Up Error')).toBeInTheDocument();
    });
  });
});
