import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { TickerInput } from '../TickerInput';
import { ClassifiedError, ErrorType, ErrorSeverity, RecoveryStrategy } from '../../lib/errorHandler';

// Mock the error handler hook
vi.mock('../../hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({
    error: null,
    handleError: vi.fn(),
    clearError: vi.fn(),
    getRecoveryActions: vi.fn(() => []),
    canRetry: false,
    retryLastOperation: vi.fn(),
  }),
}));

// Mock the ErrorDisplay component
vi.mock('../ErrorDisplay', () => ({
  ErrorDisplay: ({ error, onDismiss }: any) => (
    <div data-testid="error-display">
      <span>{error.userMessage}</span>
      {onDismiss && (
        <button onClick={onDismiss} data-testid="error-dismiss">
          Dismiss
        </button>
      )}
    </div>
  ),
}));

// Mock Supabase client
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('Enhanced TickerInput', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    loading: false,
    error: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should render with default props', () => {
      render(<TickerInput {...defaultProps} />);
      
      expect(screen.getByLabelText(/stock ticker symbol/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /analyze/i })).toBeInTheDocument();
    });

    it('should handle input changes and validation', async () => {
      const user = userEvent.setup();
      render(<TickerInput {...defaultProps} />);
      
      const input = screen.getByLabelText(/stock ticker symbol/i);
      
      await user.type(input, 'AAPL');
      
      expect(input).toHaveValue('AAPL');
      expect(screen.getByRole('button', { name: /analyze aapl/i })).not.toBeDisabled();
    });

    it('should validate ticker format', async () => {
      const user = userEvent.setup();
      render(<TickerInput {...defaultProps} />);
      
      const input = screen.getByLabelText(/stock ticker symbol/i);
      
      // Test invalid ticker (too long)
      await user.type(input, 'TOOLONG');
      
      expect(input).toHaveValue('TOOLO'); // Should be truncated to 5 chars
    });

    it('should submit valid ticker', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<TickerInput {...defaultProps} onSubmit={onSubmit} />);
      
      const input = screen.getByLabelText(/stock ticker symbol/i);
      const submitButton = screen.getByRole('button', { name: /analyze/i });
      
      await user.type(input, 'AAPL');
      await user.click(submitButton);
      
      expect(onSubmit).toHaveBeenCalledWith('AAPL');
    });
  });

  describe('Loading States', () => {
    it('should show loading state when loading prop is true', () => {
      render(<TickerInput {...defaultProps} loading={true} />);
      
      expect(screen.getByText(/analyzing\.\.\./i)).toBeInTheDocument();
      expect(screen.getByLabelText(/stock ticker symbol/i)).toBeDisabled();
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should show loading overlay when loading', () => {
      render(<TickerInput {...defaultProps} loading={true} />);
      
      expect(document.querySelector('.ticker-loading-overlay')).toBeInTheDocument();
    });

    it('should announce loading state to screen readers', () => {
      render(<TickerInput {...defaultProps} loading={true} />);
      
      // Check for aria-live region with loading announcement
      expect(screen.getByText(/analyzing ticker/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should validate ticker format and prevent invalid submissions', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<TickerInput {...defaultProps} onSubmit={onSubmit} />);
      
      const input = screen.getByLabelText(/stock ticker symbol/i);
      const submitButton = screen.getByRole('button', { name: /analyze/i });
      
      // Test case 1: Invalid ticker with numbers only (should be invalid)
      await user.clear(input);
      await user.type(input, '12345');
      await user.click(submitButton);
      
      // Should NOT call onSubmit for invalid ticker
      expect(onSubmit).not.toHaveBeenCalled();
      
      // Look for the error in the error container specifically
      const errorContainer = screen.getByRole('alert');
      expect(errorContainer).toBeInTheDocument();
      expect(errorContainer).toHaveTextContent(/invalid format.*use 1-5 characters.*include at least one letter/i);
      
      // Test case 2: Valid ticker should work
      await user.clear(input);
      await user.type(input, 'AAPL');
      await user.click(submitButton);
      
      expect(onSubmit).toHaveBeenCalledWith('AAPL');
    });

    it('should display string errors', () => {
      render(<TickerInput {...defaultProps} error="Network connection failed" />);
      
      // Use getAllByText since the error appears in both the error display and screen reader announcement
      const errorElements = screen.getAllByText(/network connection failed/i);
      expect(errorElements.length).toBeGreaterThan(0);
    });

    it('should display classified errors with ErrorDisplay component', () => {
      const classifiedError: ClassifiedError = {
        type: ErrorType.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        code: 'NETWORK_ERROR',
        message: 'Network error occurred',
        userMessage: 'Network error. Please check your connection.',
        recoverable: true,
        retryable: true,
        recoveryStrategy: RecoveryStrategy.RETRY,
        actionable: true,
        timestamp: new Date().toISOString(),
      };

      render(<TickerInput {...defaultProps} error={classifiedError} />);
      
      expect(screen.getByTestId('error-display')).toBeInTheDocument();
      // Use getAllByText since the error appears in both the error display and screen reader announcement
      const errorElements = screen.getAllByText(/network error\. please check your connection/i);
      expect(errorElements.length).toBeGreaterThan(0);
    });

    it('should handle retry functionality', () => {
      const onErrorRetry = vi.fn();
      render(
        <TickerInput 
          {...defaultProps} 
          error="Connection failed" 
          onErrorRetry={onErrorRetry}
        />
      );
      
      const retryButton = screen.getByRole('button', { name: /retry operation/i });
      fireEvent.click(retryButton);
      
      expect(onErrorRetry).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<TickerInput {...defaultProps} />);
      
      const input = screen.getByLabelText(/stock ticker symbol/i);
      
      expect(input).toHaveAttribute('role', 'combobox');
      expect(input).toHaveAttribute('aria-haspopup', 'listbox');
      expect(input).toHaveAttribute('autoComplete', 'off');
    });

    it('should associate errors with input via aria-describedby', () => {
      render(<TickerInput {...defaultProps} error="Test error" />);
      
      const input = screen.getByLabelText(/stock ticker symbol/i);
      
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby', 'ticker-error');
    });

    it('should announce errors to screen readers', () => {
      render(<TickerInput {...defaultProps} error="Test error message" />);
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/error: test error message/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<TickerInput {...defaultProps} />);
      
      const input = screen.getByLabelText(/stock ticker symbol/i);
      
      await user.type(input, 'AAPL');
      await user.keyboard('{Enter}');
      
      expect(defaultProps.onSubmit).toHaveBeenCalledWith('AAPL');
    });
  });

  describe('Props and Configuration', () => {
    it('should respect disabled prop', () => {
      render(<TickerInput {...defaultProps} disabled={true} />);
      
      const input = screen.getByLabelText(/stock ticker symbol/i);
      const button = screen.getByRole('button');
      
      expect(input).toBeDisabled();
      expect(button).toBeDisabled();
    });

    it('should respect showSuggestions prop', () => {
      render(<TickerInput {...defaultProps} showSuggestions={false} />);
      
      // Suggestions should not be shown even if available
      // This would need to be tested with actual suggestions data
    });

    it('should use custom placeholder', () => {
      render(<TickerInput {...defaultProps} placeholder="Custom placeholder" />);
      
      expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
    });

    it('should handle autoFocus prop', () => {
      render(<TickerInput {...defaultProps} autoFocus={true} />);
      
      const input = screen.getByLabelText(/stock ticker symbol/i);
      expect(input).toHaveFocus();
    });
  });

  describe('Visual Feedback', () => {
    it('should apply appropriate CSS classes for different states', () => {
      const { rerender } = render(<TickerInput {...defaultProps} />);
      
      // Normal state
      expect(document.querySelector('.ticker-input-container')).toBeInTheDocument();
      
      // Loading state
      rerender(<TickerInput {...defaultProps} loading={true} />);
      expect(document.querySelector('.ticker-container-loading')).toBeInTheDocument();
      
      // Error state
      rerender(<TickerInput {...defaultProps} error="Test error" />);
      expect(document.querySelector('.ticker-error-container')).toBeInTheDocument();
    });

    it('should show appropriate button text based on state', () => {
      const { rerender } = render(<TickerInput {...defaultProps} />);
      
      // Normal state
      expect(screen.getByText('Analyze')).toBeInTheDocument();
      
      // Loading state
      rerender(<TickerInput {...defaultProps} loading={true} />);
      expect(screen.getByText('Analyzing...')).toBeInTheDocument();
    });
  });
});