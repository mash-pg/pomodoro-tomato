import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Sidebar from '../../src/components/Sidebar';
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
  let toggleSidebar: jest.Mock;

  beforeEach(() => {
    push = jest.fn();
    toggleSidebar = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push });
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  const renderComponent = () => {
    render(
      <SettingsProvider>
        <Sidebar isOpen={true} toggleSidebar={toggleSidebar} />
      </SettingsProvider>
    );
  };

  describe('Account Deletion', () => {
    it('should successfully delete account when confirmed', async () => {
      window.confirm = jest.fn().mockReturnValue(true);
      global.fetch = jest.fn().mockResolvedValue({ ok: true });

      renderComponent();
      await screen.findByText('ログイン中: test@example.com');

      const deleteButton = screen.getByRole('button', { name: /退会する/i });
      fireEvent.click(deleteButton);

      expect(window.confirm).toHaveBeenCalledWith('本当に退会しますか？この操作は元に戻せません。');
      expect(deleteButton).toBeDisabled();

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/delete-account', expect.anything());
      });

      await waitFor(() => {
        expect(push).toHaveBeenCalledWith('/signup');
      });

      expect(toggleSidebar).toHaveBeenCalled();
    });

    it('should not delete account when canceled', async () => {
      window.confirm = jest.fn().mockReturnValue(false);
      global.fetch = jest.fn();

      renderComponent();
      await screen.findByText('ログイン中: test@example.com');

      const deleteButton = screen.getByRole('button', { name: /退会する/i });
      fireEvent.click(deleteButton);

      expect(window.confirm).toHaveBeenCalledWith('本当に退会しますか？この操作は元に戻せません。');
      expect(global.fetch).not.toHaveBeenCalled();
      expect(push).not.toHaveBeenCalled();
      expect(toggleSidebar).not.toHaveBeenCalled();
      expect(deleteButton).not.toBeDisabled();
    });

    it('should show an error message if API call fails', async () => {
      window.confirm = jest.fn().mockReturnValue(true);
      global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'API Error' }) });
      console.error = jest.fn(); // Mock console.error

      renderComponent();
      await screen.findByText('ログイン中: test@example.com');

      const deleteButton = screen.getByRole('button', { name: /退会する/i });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/delete-account', expect.anything());
      });

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Failed to delete account:', { error: 'API Error' });
      });

      expect(push).not.toHaveBeenCalled();
      expect(toggleSidebar).not.toHaveBeenCalled();
      expect(deleteButton).not.toBeDisabled();
    });
  });
});
