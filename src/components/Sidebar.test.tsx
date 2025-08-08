import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Sidebar from './Sidebar';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { SettingsProvider } from '@/context/SettingsContext';

// Mock the useRouter hook
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock the supabase client
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { email: 'test@example.com' } } }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
  },
}));

describe('Sidebar', () => {
  let push: jest.Mock;

  beforeEach(() => {
    push = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push });
  });

  it('should handle logout', async () => {
    const toggleSidebar = jest.fn();

    render(
      <SettingsProvider>
        <Sidebar isOpen={true} toggleSidebar={toggleSidebar} />
      </SettingsProvider>
    );

    // Wait for user to be loaded
    await screen.findByText('ログイン中: test@example.com');

    const logoutButton = screen.getByRole('button', { name: /ログアウト/i });
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/login');
    });

    expect(toggleSidebar).toHaveBeenCalled();
  });
});
