// 👇 1) まず jest.mock を先に書く（import より前）
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(), // ← 工場内で直接 jest.fn()
    },
  },
}));

jest.mock('@/components/AuthForm', () => ({
  __esModule: true,
  default: jest.fn(({ isSignUp, onSubmit, loading, error }) => (
    <form
      data-testid="mock-auth-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit('test@example.com', 'password123');
      }}
    >
      <h2>{isSignUp ? '新規登録' : 'ログイン'}</h2>
      {error && <p>{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? '処理中...' : isSignUp ? '新規登録' : 'ログイン'}
      </button>
    </form>
  )),
}));

// 👇 2) ここから import（mock の後！）
import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import SignUpPage from '@/app/signup/page';
import { useRouter } from 'next/navigation';
import '@testing-library/jest-dom';
import { supabase } from '@/lib/supabaseClient';

describe('SignUpPage', () => {
  const pushMock = jest.fn();
  const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: pushMock });
  });

  it('should render the sign up page with AuthForm', async () => {
    await act(async () => {
      render(<SignUpPage />);
    });
    expect(screen.getByRole('heading', { name: '新規登録' })).toBeInTheDocument();
    expect(screen.getByTestId('mock-auth-form')).toBeInTheDocument();
  });

  it('should show alert and redirect to login page on successful sign up', async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValueOnce({
      data: { user: { id: 'test-user' } },
      error: null,
    });

    await act(async () => {
      render(<SignUpPage />);
    });

    const authForm = screen.getByTestId('mock-auth-form');
    await act(async () => {
      fireEvent.submit(authForm);
    });

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(
        '確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。'
      );
      expect(pushMock).toHaveBeenCalledWith('/login');
    });
  });

  it('should display error message on sign up error', async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValueOnce({
      data: { user: null },
      error: new Error('Sign Up Error'),
    });

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
