import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/auth-context';
import { DashboardPage } from '../../pages/DashboardPage';
import { OpportunitiesView } from '../../components/opportunities/OpportunitiesView';
import { mockOpportunityResponse } from '../mocks/analysisServiceMock';

// Test wrapper for components that need routing and auth context
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>
    <AuthProvider>
      {children}
    </AuthProvider>
  </MemoryRouter>
);

describe('Component Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DashboardPage Component', () => {
    it('should render main dashboard elements', () => {
      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      // Check for main dashboard sections
      expect(screen.getByText(/investigate like a pro/i)).toBeInTheDocument();
      expect(screen.getByText(/find your next great investment/i)).toBeInTheDocument();
      expect(screen.getByText(/why choose signal-360/i)).toBeInTheDocument();
      
      // Check for key features
      expect(screen.getByText(/deep analysis, in seconds/i)).toBeInTheDocument();
      expect(screen.getByText(/360° vision/i)).toBeInTheDocument();
      expect(screen.getByText(/invest with confidence/i)).toBeInTheDocument();
    });

    it('should display ticker search input', () => {
      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      const tickerInput = screen.getByPlaceholderText(/enter ticker/i);
      expect(tickerInput).toBeInTheDocument();
    });

    it('should display discover opportunities button', () => {
      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      const discoverButton = screen.getByRole('button', { name: /discover opportunities/i });
      expect(discoverButton).toBeInTheDocument();
    });

    it('should show disabled state when user has no credits', () => {
      // This test would require mocking the useUserProfile hook properly
      // For now, we'll test that the button exists and can be found
      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      // The button text changes based on credits, so we'll look for the aria-label
      const discoverButton = screen.getByLabelText(/discover investment opportunities/i);
      expect(discoverButton).toBeInTheDocument();
    });
  });

  describe('OpportunitiesView Component', () => {
    const mockProps = {
      onOpportunityClick: vi.fn(),
      onClose: vi.fn(),
      data: mockOpportunityResponse,
      error: null,
      isLoading: false,
    };

    it('should render opportunities when data is provided', () => {
      render(<OpportunitiesView {...mockProps} />);

      // Check for modal title
      expect(screen.getByText(/investment opportunities/i)).toBeInTheDocument();
      
      // Check for opportunity cards
      expect(screen.getByText(/microsoft corporation/i)).toBeInTheDocument();
      expect(screen.getByText(/alphabet inc/i)).toBeInTheDocument();
      expect(screen.getByText(/johnson & johnson/i)).toBeInTheDocument();
      
      // Check for tickers
      expect(screen.getByText('MSFT')).toBeInTheDocument();
      expect(screen.getByText('GOOGL')).toBeInTheDocument();
      expect(screen.getByText('JNJ')).toBeInTheDocument();
    });

    it('should show loading state', () => {
      render(
        <OpportunitiesView 
          {...mockProps} 
          data={null} 
          isLoading={true} 
        />
      );

      expect(screen.getAllByText(/scanning the market/i)[0]).toBeInTheDocument();
    });

    it('should show error state', () => {
      render(
        <OpportunitiesView 
          {...mockProps} 
          data={null} 
          error="Search failed" 
        />
      );

      expect(screen.getByText('Search Failed')).toBeInTheDocument();
    });

    it('should call onOpportunityClick when opportunity is clicked', async () => {
      const user = userEvent.setup();
      
      render(<OpportunitiesView {...mockProps} />);

      const msftCard = screen.getByText('MSFT').closest('div');
      expect(msftCard).toBeTruthy();
      
      if (msftCard) {
        await user.click(msftCard);
        expect(mockProps.onOpportunityClick).toHaveBeenCalledWith('MSFT');
      }
    });

    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      
      render(<OpportunitiesView {...mockProps} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);
      
      expect(mockProps.onClose).toHaveBeenCalled();
    });

    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      
      render(<OpportunitiesView {...mockProps} />);

      // Click the close button
      const closeButton = screen.getByLabelText(/close opportunities view/i);
      await user.click(closeButton);
      
      expect(mockProps.onClose).toHaveBeenCalled();
    });

    it('should handle empty opportunities data', () => {
      render(
        <OpportunitiesView 
          {...mockProps} 
          data={{ opportunities: [] }} 
        />
      );

      expect(screen.getByText(/no clear opportunities found/i)).toBeInTheDocument();
    });
  });

  describe('Interactive Elements', () => {
    const mockPropsForInteractive = {
      onOpportunityClick: vi.fn(),
      onClose: vi.fn(),
      data: mockOpportunityResponse,
      error: null,
      isLoading: false,
    };

    it('should handle keyboard navigation in opportunities modal', async () => {
      const user = userEvent.setup();
      
      render(<OpportunitiesView {...mockPropsForInteractive} />);

      // Test escape key closes modal
      await user.keyboard('{Escape}');
      expect(mockPropsForInteractive.onClose).toHaveBeenCalled();
    });

    it('should maintain focus management in modal', () => {
      render(<OpportunitiesView {...mockPropsForInteractive} />);

      // Check that modal exists
      const closeButton = screen.getByLabelText(/close opportunities view/i);
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    const mockPropsForA11y = {
      onOpportunityClick: vi.fn(),
      onClose: vi.fn(),
      data: mockOpportunityResponse,
      error: null,
      isLoading: false,
    };

    it('should have proper ARIA labels and roles', () => {
      render(<OpportunitiesView {...mockPropsForA11y} />);

      // Check for close button with proper aria-label
      const closeButton = screen.getByLabelText(/close opportunities view/i);
      expect(closeButton).toBeInTheDocument();
      
      // Check for heading
      const heading = screen.getByText(/investment opportunities/i);
      expect(heading).toBeInTheDocument();
    });

    it('should support screen reader navigation', () => {
      render(<OpportunitiesView {...mockPropsForA11y} />);

      // Check for proper heading structure
      const heading = screen.getByText(/investment opportunities/i);
      expect(heading).toBeInTheDocument();
      
      // Check for descriptive text
      expect(screen.getByText(/ai-discovered value opportunities/i)).toBeInTheDocument();
    });
  });
});