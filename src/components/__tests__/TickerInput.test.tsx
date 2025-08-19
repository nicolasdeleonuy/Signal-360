import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TickerInput } from '../TickerInput';

// Mock Supabase
const mockInvoke = vi.fn();
vi.mock('../../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: mockInvoke
    }
  }
}));

describe('TickerInput Component', () => {
  const mockOnSubmit = vi.fn();
  const defaultProps = {
    onSubmit: mockOnSubmit,
    loading: false,
    error: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Rendering and Basic Functionality', () => {
    it('should render with default props', () => {
      render(<TickerInput {...defaultProps} />);
      
      expect(screen.getByLabelText('Stock Ticker Symbol')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter ticker (e.g., AAPL)')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /analyze/i })).toBeInTheDocument();
    });

    it('should render with custom placeholder', () => {
      render(<TickerInput {...defaultProps} placeholder="Custom placeholder" />);
      
      expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
    });

    it('should auto-focus input when autoFocus is true', () => {
      render(<TickerInput {...defaultProps} autoFocus={true} />);
      
      expect(screen.getByRole('combobox')).toHaveFocus();
    });

    it('should not auto-focus input when autoFocus is false', () => {
      render(<TickerInput {...defaultProps} autoFocus={false} />);
      
      expect(screen.getByRole('combobox')).not.toHaveFocus();
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should sanitize input by converting to uppercase and removing invalid characters', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<TickerInput {...defaultProps} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'aapl@#$');
      
      expect(input).toHaveValue('AAPL');
    });

    it('should limit input to 5 characters', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<TickerInput {...defaultProps} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'TOOLONG');
      
      expect(input).toHaveValue('TOOLO');
    });

    it('should validate ticker format and show error for invalid input', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<TickerInput {...defaultProps} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, '123456');
      
      expect(input).toHaveValue('12345');
      expect(screen.getByText('Ticker cannot exceed 5 characters')).toBeInTheDocument();
    });

    it('should show valid state for correct ticker format', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<TickerInput {...defaultProps} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'AAPL');
      
      expect(input).toHaveClass('ticker-input-valid');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should accept valid ticker formats with dots and hyphens', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<TickerInput {...defaultProps} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'BRK.A');
      
      expect(input).toHaveValue('BRK.A');
      expect(input).toHaveClass('ticker-input-valid');
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with valid ticker when form is submitted', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<TickerInput {...defaultProps} />);
      
      const input = screen.getByRole('combobox');
      const submitButton = screen.getByRole('button', { name: /analyze/i });
      
      await user.type(input, 'AAPL');
      await user.click(submitButton);
      
      expect(mockOnSubmit).toHaveBeenCalledWith('AAPL');
    });

    it('should call onSubmit when Enter key is pressed with valid ticker', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<TickerInput {...defaultProps} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'AAPL');
      await user.keyboard('{Enter}');
      
      expect(mockOnSubmit).toHaveBeenCalledWith('AAPL');
    });

    it('should not call onSubmit with invalid ticker', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<TickerInput {...defaultProps} />);
      
      const input = screen.getByRole('combobox');
      const submitButton = screen.getByRole('button', { name: /analyze/i });
      
      await user.type(input, '');
      await user.click(submitButton);
      
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should disable submit button when loading', () => {
      render(<TickerInput {...defaultProps} loading={true} />);
      
      const submitButton = screen.getByRole('button', { name: /analyzing/i });
      expect(submitButton).toBeDisabled();
      expect(screen.getByText('Analyzing...')).toBeInTheDocument();
    });

    it('should disable input when loading', () => {
      render(<TickerInput {...defaultProps} loading={true} />);
      
      const input = screen.getByRole('combobox');
      expect(input).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should display external error message', () => {
      render(<TickerInput {...defaultProps} error="Network error occurred" />);
      
      expect(screen.getByRole('alert')).toHaveTextContent('Network error occurred');
      expect(screen.getByRole('combobox')).toHaveClass('ticker-input-error');
    });

    it('should display validation error message', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<TickerInput {...defaultProps} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'TOOLONG');
      
      expect(screen.getByRole('alert')).toHaveTextContent('Ticker cannot exceed 5 characters');
      expect(input).toHaveClass('ticker-input-error');
    });

    it('should prioritize external error over validation error', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<TickerInput {...defaultProps} error="External error" />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'TOOLONG');
      
      expect(screen.getByRole('alert')).toHaveTextContent('External error');
    });
  });

  describe('Suggestions Functionality', () => {
    beforeEach(() => {
      mockInvoke.mockResolvedValue({
        data: {
          success: true,
          data: {
            ticker_symbol: 'AAPL',
            company_name: 'Apple Inc.',
          }
        }
      });
    });

    it('should fetch and display suggestions after debounce delay', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<TickerInput {...defaultProps} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'A');
      
      // Fast-forward past debounce delay
      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('generate-ideas', {
          body: { context: 'investment_idea' }
        });
      });
      
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
        expect(screen.getByText('AAPL')).toBeInTheDocument();
        expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
      });
    });

    it('should show loading indicator while fetching suggestions', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimers });
      mockInvoke.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
      
      render(<TickerInput {...defaultProps} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'A');
      
      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(screen.getByLabelText('Loading suggestions')).toBeInTheDocument();
      });
    });

    it('should select suggestion on click', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<TickerInput {...defaultProps} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'A');
      
      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
      
      const suggestion = screen.getByRole('option');
      await user.click(suggestion);
      
      expect(input).toHaveValue('AAPL');
      expect(mockOnSubmit).toHaveBeenCalledWith('AAPL');
    });

    it('should handle keyboard navigation in suggestions', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<TickerInput {...defaultProps} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'A');
      
      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
      
      // Navigate down to select first suggestion
      await user.keyboard('{ArrowDown}');
      expect(screen.getByRole('option')).toHaveClass('ticker-suggestion-selected');
      
      // Press Enter to select
      await user.keyboard('{Enter}');
      expect(input).toHaveValue('AAPL');
      expect(mockOnSubmit).toHaveBeenCalledWith('AAPL');
    });

    it('should hide suggestions on Escape key', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<TickerInput {...defaultProps} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'A');
      
      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
      
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('should hide suggestions on blur with delay', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<TickerInput {...defaultProps} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'A');
      
      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
      
      await user.tab(); // This will blur the input
      
      act(() => {
        vi.advanceTimersByTime(150);
      });
      
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mockInvoke.mockRejectedValue(new Error('API Error'));
      
      render(<TickerInput {...defaultProps} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'A');
      
      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalled();
      });
      
      // Should not show suggestions on error
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<TickerInput {...defaultProps} />);
      
      const input = screen.getByRole('combobox');
      expect(input).toHaveAttribute('aria-expanded', 'false');
      expect(input).toHaveAttribute('aria-haspopup', 'listbox');
      expect(input).toHaveAttribute('aria-invalid', 'false');
    });

    it('should update ARIA attributes when showing suggestions', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mockInvoke.mockResolvedValue({
        data: {
          success: true,
          data: {
            ticker_symbol: 'AAPL',
            company_name: 'Apple Inc.',
          }
        }
      });
      
      render(<TickerInput {...defaultProps} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'A');
      
      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(input).toHaveAttribute('aria-expanded', 'true');
        expect(input).toHaveAttribute('aria-owns', 'ticker-suggestions');
      });
    });

    it('should update ARIA attributes when there are errors', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<TickerInput {...defaultProps} error="Test error" />);
      
      const input = screen.getByRole('combobox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby', 'ticker-error');
    });

    it('should have proper labels and descriptions', () => {
      render(<TickerInput {...defaultProps} />);
      
      expect(screen.getByLabelText('Stock Ticker Symbol')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /analyze/i })).toBeInTheDocument();
    });
  });

  describe('Performance and Debouncing', () => {
    it('should debounce API calls', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<TickerInput {...defaultProps} />);
      
      const input = screen.getByRole('combobox');
      
      // Type multiple characters quickly
      await user.type(input, 'AAPL');
      
      // Should not have called API yet
      expect(mockInvoke).not.toHaveBeenCalled();
      
      // Fast-forward past debounce delay
      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      // Should have called API only once
      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledTimes(1);
      });
    });

    it('should cancel previous API calls when typing continues', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<TickerInput {...defaultProps} />);
      
      const input = screen.getByRole('combobox');
      
      await user.type(input, 'A');
      
      // Advance time partially
      act(() => {
        vi.advanceTimersByTime(200);
      });
      
      // Type more before debounce completes
      await user.type(input, 'A');
      
      // Complete the debounce
      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      // Should only call API once for the final input
      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledTimes(1);
      });
    });
  });
});