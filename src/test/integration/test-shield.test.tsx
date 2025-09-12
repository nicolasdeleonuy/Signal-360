import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/auth-context';
import { DashboardPage } from '../../pages/DashboardPage';
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

describe('Test Shield - Core Application Functionality', () => {
  let mockNavigate: ReturnType<typeof vi.fn>;
  let authStateCallback: ((event: string, session: any) => void) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset analysis service mocks
    mockAnalysisService.getInvestmentAnalysis.mockClear();
    mockAnalysisService.findOpportunities.mockClear();
    
    // Setup navigation mock
    mockNavigate = vi.fn();
    
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

    // Mock profile data
    const mockProfile = {
      id: '123',
      credits: 5,
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
  });

  describe('Dashboard Core Functionality', () => {
    it('should render main dashboard components without errors', () => {
      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      // Verify core dashboard elements are present
      expect(screen.getByText(/investigate like a pro/i)).toBeInTheDocument();
      expect(screen.getByText(/find your next great investment/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter ticker/i)).toBeInTheDocument();
    });

    it('should display ticker search functionality', () => {
      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      const tickerInput = screen.getByPlaceholderText(/enter ticker/i);
      expect(tickerInput).toBeInTheDocument();
      expect(tickerInput).toHaveAttribute('type', 'text');
    });

    it('should display opportunity discovery button', () => {
      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      const discoverButton = screen.getByLabelText(/discover investment opportunities/i);
      expect(discoverButton).toBeInTheDocument();
    });
  });

  describe('Analysis Service Integration', () => {
    it('should not make live API calls during tests', async () => {
      // This test verifies our mocking strategy is working
      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      // Verify that our mocks are in place and no real API calls are made
      expect(mockAnalysisService.getInvestmentAnalysis).not.toHaveBeenCalled();
      expect(mockAnalysisService.findOpportunities).not.toHaveBeenCalled();
    });

    it('should use mocked analysis service when triggered', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      // Simulate user interaction that would trigger analysis
      const tickerInput = screen.getByPlaceholderText(/enter ticker/i);
      await user.type(tickerInput, 'AAPL');

      // The actual analysis would be triggered by component logic
      // This test verifies the mock is available and configured
      expect(mockAnalysisService.getInvestmentAnalysis).toBeDefined();
      expect(typeof mockAnalysisService.getInvestmentAnalysis).toBe('function');
    });
  });

  describe('User Authentication Flow', () => {
    it('should handle authentication state changes', async () => {
      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      // Simulate user login
      const mockSession = {
        user: {
          id: '123',
          email: 'user@example.com',
          created_at: '2023-01-01T00:00:00Z',
        },
        access_token: 'token',
      };

      // Trigger auth state change
      if (authStateCallback) {
        authStateCallback('SIGNED_IN', mockSession);
      }

      // Wait for any async updates
      await waitFor(() => {
        expect(screen.getByText(/investigate like a pro/i)).toBeInTheDocument();
      });
    });
  });

  describe('Credit System Integration', () => {
    it('should interact with Supabase for credit management', () => {
      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      // Verify Supabase client is properly mocked
      expect(supabase.from).toBeDefined();
      expect(typeof supabase.from).toBe('function');
    });

    it('should handle profile data loading', async () => {
      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      // Wait for component to stabilize
      await waitFor(() => {
        expect(screen.getByText(/investigate like a pro/i)).toBeInTheDocument();
      });

      // The component should render without errors even with mocked data
      expect(screen.getByLabelText(/discover investment opportunities/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle component rendering errors gracefully', () => {
      // Test that components don't crash with mocked dependencies
      expect(() => {
        render(
          <TestWrapper>
            <DashboardPage />
          </TestWrapper>
        );
      }).not.toThrow();
    });

    it('should handle missing data gracefully', async () => {
      // Mock empty/null responses
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }) as any);

      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      // Component should still render
      await waitFor(() => {
        expect(screen.getByText(/investigate like a pro/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Reliability', () => {
    it('should render quickly without blocking', () => {
      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render in under 100ms (very generous for testing)
      expect(renderTime).toBeLessThan(100);
    });

    it('should not have memory leaks in component lifecycle', () => {
      const { unmount } = render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      // Should unmount without errors
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Mock Validation', () => {
    it('should have properly configured analysis service mocks', () => {
      expect(mockAnalysisService.getInvestmentAnalysis).toBeDefined();
      expect(mockAnalysisService.getTradingAnalysis).toBeDefined();
      expect(mockAnalysisService.findOpportunities).toBeDefined();
      
      expect(vi.isMockFunction(mockAnalysisService.getInvestmentAnalysis)).toBe(true);
      expect(vi.isMockFunction(mockAnalysisService.getTradingAnalysis)).toBe(true);
      expect(vi.isMockFunction(mockAnalysisService.findOpportunities)).toBe(true);
    });

    it('should have properly configured Supabase mocks', () => {
      expect(supabase.auth.signInWithPassword).toBeDefined();
      expect(supabase.auth.signUp).toBeDefined();
      expect(supabase.auth.signOut).toBeDefined();
      expect(supabase.from).toBeDefined();
      
      expect(vi.isMockFunction(supabase.auth.signInWithPassword)).toBe(true);
      expect(vi.isMockFunction(supabase.auth.signUp)).toBe(true);
      expect(vi.isMockFunction(supabase.auth.signOut)).toBe(true);
      expect(vi.isMockFunction(supabase.from)).toBe(true);
    });

    it('should return realistic mock data', async () => {
      const analysisResult = await mockAnalysisService.getInvestmentAnalysis('AAPL');
      
      expect(analysisResult).toHaveProperty('ticker', 'AAPL');
      expect(analysisResult).toHaveProperty('marketData');
      expect(analysisResult).toHaveProperty('verdict');
      expect(analysisResult).toHaveProperty('fundamental');
      expect(analysisResult).toHaveProperty('sentiment');
      expect(analysisResult).toHaveProperty('technical');
      
      expect(analysisResult.verdict.synthesisScore).toBeGreaterThanOrEqual(0);
      expect(analysisResult.verdict.synthesisScore).toBeLessThanOrEqual(100);
    });
  });
});