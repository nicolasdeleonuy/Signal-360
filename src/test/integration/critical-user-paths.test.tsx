import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../../App';
import { AuthProvider } from '../../contexts/auth-context';
import { supabase } from '../../lib/supabaseClient';
import { mockAnalysisService } from '../mocks/analysisServiceMock';

// Test wrapper component that provides all necessary context
const TestWrapper = ({ children, initialEntries = ['/'] }: { children: React.ReactNode; initialEntries?: string[] }) => (
  <MemoryRouter initialEntries={initialEntries}>
    <AuthProvider>
      {children}
    </AuthProvider>
  </MemoryRouter>
);

describe('Critical User Paths - Test Shield', () => {
  let mockNavigate: ReturnType<typeof vi.fn>;
  let authStateCallback: ((event: string, session: any) => void) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset analysis service mocks
    mockAnalysisService.getInvestmentAnalysis.mockClear();
    mockAnalysisService.findOpportunities.mockClear();
    
    // Setup navigation mock
    mockNavigate = vi.fn();
    vi.mocked(vi.importActual('react-router-dom')).useNavigate = () => mockNavigate;
    
    // Setup auth state callback capture
    const mockOnAuthStateChange = vi.fn().mockImplementation((callback) => {
      authStateCallback = callback;
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      };
    });
    
    // Configure Supabase mocks
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation(mockOnAuthStateChange);
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });
  });

  describe('User Onboarding Flow', () => {
    it('should handle user sign up successfully', async () => {
      const user = userEvent.setup();
      
      // Mock successful sign up
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: {
          user: {
            id: '123',
            email: 'newuser@example.com',
            created_at: '2023-01-01T00:00:00Z',
          },
          session: null,
        },
        error: null,
      });

      render(
        <TestWrapper initialEntries={['/sign-up']}>
          <App />
        </TestWrapper>
      );

      // Fill out sign up form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const signUpButton = screen.getByRole('button', { name: /sign up/i });

      await user.type(emailInput, 'newuser@example.com');
      await user.type(passwordInput, 'securepassword123');
      await user.click(signUpButton);

      // Assert success message is displayed
      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });

      // Verify Supabase was called correctly
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'securepassword123',
      });
    });

    it('should display error message on sign up failure', async () => {
      const user = userEvent.setup();
      
      // Mock sign up failure
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email already registered' } as any,
      });

      render(
        <TestWrapper initialEntries={['/sign-up']}>
          <App />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const signUpButton = screen.getByRole('button', { name: /sign up/i });

      await user.type(emailInput, 'existing@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(signUpButton);

      // Assert error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/email already registered/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Authentication Flow', () => {
    it('should handle user login and logout successfully', async () => {
      const user = userEvent.setup();
      
      // Mock successful login
      const mockSession = {
        user: {
          id: '123',
          email: 'user@example.com',
          created_at: '2023-01-01T00:00:00Z',
        },
        access_token: 'token',
      };

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: mockSession.user, session: mockSession },
        error: null,
      });

      render(
        <TestWrapper initialEntries={['/login']}>
          <App />
        </TestWrapper>
      );

      // Perform login
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'user@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(loginButton);

      // Simulate auth state change
      if (authStateCallback) {
        authStateCallback('SIGNED_IN', mockSession);
      }

      // Should navigate to dashboard
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });

      // Mock logout
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

      // Find and click logout button (assuming it exists in the UI)
      const logoutButton = screen.getByRole('button', { name: /sign out/i });
      await user.click(logoutButton);

      // Simulate auth state change for logout
      if (authStateCallback) {
        authStateCallback('SIGNED_OUT', null);
      }

      // Should navigate to login
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('Analysis Credit Consumption', () => {
    it('should consume credits and navigate to analysis page when user searches for ticker', async () => {
      const user = userEvent.setup();
      
      // Mock authenticated user with credits
      const mockSession = {
        user: {
          id: '123',
          email: 'user@example.com',
          created_at: '2023-01-01T00:00:00Z',
        },
        access_token: 'token',
      };

      // Mock profile with credits
      const mockProfile = {
        id: '123',
        credits: 5,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      // Setup Supabase mocks for profile operations
      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
            update: vi.fn().mockReturnThis(),
          } as any;
        }
        return {} as any;
      });

      // Mock successful credit decrement
      const updatedProfile = { ...mockProfile, credits: 4 };
      vi.mocked(supabase.from('profiles').update({ credits: 4 }).eq('id', '123').select().single)
        .mockResolvedValue({ data: updatedProfile, error: null });

      render(
        <TestWrapper initialEntries={['/']}>
          <App />
        </TestWrapper>
      );

      // Simulate user being logged in
      if (authStateCallback) {
        authStateCallback('SIGNED_IN', mockSession);
      }

      // Wait for dashboard to load
      await waitFor(() => {
        expect(screen.getByText(/investigate like a pro/i)).toBeInTheDocument();
      });

      // Find ticker search input and submit
      const tickerInput = screen.getByPlaceholderText(/enter ticker/i);
      await user.type(tickerInput, 'AAPL');
      
      // Simulate ticker selection (this would normally be triggered by the TickerSearch component)
      fireEvent.keyDown(tickerInput, { key: 'Enter', code: 'Enter' });

      // Assert that credits were decremented and navigation occurred
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/analysis/AAPL');
      });

      // Verify analysis service was called
      expect(mockAnalysisService.getInvestmentAnalysis).toHaveBeenCalledWith('AAPL');
    });

    it('should prevent analysis when user has no credits', async () => {
      const user = userEvent.setup();
      
      // Mock authenticated user with no credits
      const mockSession = {
        user: {
          id: '123',
          email: 'user@example.com',
          created_at: '2023-01-01T00:00:00Z',
        },
        access_token: 'token',
      };

      // Mock profile with no credits
      const mockProfile = {
        id: '123',
        credits: 0,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          } as any;
        }
        return {} as any;
      });

      // Mock alert function
      const mockAlert = vi.fn();
      vi.stubGlobal('alert', mockAlert);

      render(
        <TestWrapper initialEntries={['/']}>
          <App />
        </TestWrapper>
      );

      // Simulate user being logged in
      if (authStateCallback) {
        authStateCallback('SIGNED_IN', mockSession);
      }

      // Wait for dashboard to load
      await waitFor(() => {
        expect(screen.getByText(/investigate like a pro/i)).toBeInTheDocument();
      });

      // Try to perform analysis
      const tickerInput = screen.getByPlaceholderText(/enter ticker/i);
      await user.type(tickerInput, 'AAPL');
      fireEvent.keyDown(tickerInput, { key: 'Enter', code: 'Enter' });

      // Should show alert about needing credits
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('You need credits to perform a deep analysis.');
      });

      // Should not navigate
      expect(mockNavigate).not.toHaveBeenCalledWith('/analysis/AAPL');
    });
  });

  describe('Opportunity Credit Consumption', () => {
    it('should consume credits when user clicks Discover Opportunities button', async () => {
      const user = userEvent.setup();
      
      // Mock authenticated user with credits
      const mockSession = {
        user: {
          id: '123',
          email: 'user@example.com',
          created_at: '2023-01-01T00:00:00Z',
        },
        access_token: 'token',
      };

      // Mock profile with credits
      const mockProfile = {
        id: '123',
        credits: 3,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
            update: vi.fn().mockReturnThis(),
          } as any;
        }
        return {} as any;
      });

      // Mock successful credit decrement
      const updatedProfile = { ...mockProfile, credits: 2 };
      vi.mocked(supabase.from('profiles').update({ credits: 2 }).eq('id', '123').select().single)
        .mockResolvedValue({ data: updatedProfile, error: null });

      render(
        <TestWrapper initialEntries={['/']}>
          <App />
        </TestWrapper>
      );

      // Simulate user being logged in
      if (authStateCallback) {
        authStateCallback('SIGNED_IN', mockSession);
      }

      // Wait for dashboard to load
      await waitFor(() => {
        expect(screen.getByText(/discover opportunities/i)).toBeInTheDocument();
      });

      // Click the Discover Opportunities button
      const discoverButton = screen.getByRole('button', { name: /discover opportunities/i });
      await user.click(discoverButton);

      // Assert that the opportunity search was triggered
      await waitFor(() => {
        expect(mockAnalysisService.findOpportunities).toHaveBeenCalled();
      });

      // Should show opportunities modal
      await waitFor(() => {
        expect(screen.getByText(/investment opportunities/i)).toBeInTheDocument();
      });
    });

    it('should prevent opportunity search when user has no credits', async () => {
      const user = userEvent.setup();
      
      // Mock authenticated user with no credits
      const mockSession = {
        user: {
          id: '123',
          email: 'user@example.com',
          created_at: '2023-01-01T00:00:00Z',
        },
        access_token: 'token',
      };

      // Mock profile with no credits
      const mockProfile = {
        id: '123',
        credits: 0,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          } as any;
        }
        return {} as any;
      });

      // Mock alert function
      const mockAlert = vi.fn();
      vi.stubGlobal('alert', mockAlert);

      render(
        <TestWrapper initialEntries={['/']}>
          <App />
        </TestWrapper>
      );

      // Simulate user being logged in
      if (authStateCallback) {
        authStateCallback('SIGNED_IN', mockSession);
      }

      // Wait for dashboard to load and check button state
      await waitFor(() => {
        const discoverButton = screen.getByRole('button', { name: /no credits remaining/i });
        expect(discoverButton).toBeDisabled();
      });

      // Try to click the disabled button
      const discoverButton = screen.getByRole('button', { name: /no credits remaining/i });
      await user.click(discoverButton);

      // Should not trigger opportunity search
      expect(mockAnalysisService.findOpportunities).not.toHaveBeenCalled();
    });
  });

  describe('Analysis Results Display', () => {
    it('should display analysis results correctly after successful analysis', async () => {
      // Mock authenticated user
      const mockSession = {
        user: {
          id: '123',
          email: 'user@example.com',
          created_at: '2023-01-01T00:00:00Z',
        },
        access_token: 'token',
      };

      render(
        <TestWrapper initialEntries={['/analysis/AAPL']}>
          <App />
        </TestWrapper>
      );

      // Simulate user being logged in
      if (authStateCallback) {
        authStateCallback('SIGNED_IN', mockSession);
      }

      // Wait for analysis to complete and results to display
      await waitFor(() => {
        expect(screen.getByText(/analysis results/i)).toBeInTheDocument();
      });

      // Check that key analysis data is displayed
      expect(screen.getByText(/apple inc/i)).toBeInTheDocument();
      expect(screen.getByText(/\$175\.50/)).toBeInTheDocument();
      expect(screen.getByText(/78/)).toBeInTheDocument(); // Synthesis score

      // Verify analysis service was called
      expect(mockAnalysisService.getInvestmentAnalysis).toHaveBeenCalledWith('AAPL');
    });
  });
});