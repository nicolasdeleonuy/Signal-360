import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TickerSearch } from '../TickerSearch';

// Mock the error handler hook
vi.mock('../../../hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({
    error: null,
    isRetrying: false,
    handleError: vi.fn(),
    clearError: vi.fn(),
    canRetry: false,
  }),
}));

// Mock Supabase client
vi.mock('../../../lib/supabaseClient', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

// Import the mocked modules to get access to the mock functions
import { supabase } from '../../../lib/supabaseClient';

describe('TickerSearch', () => {
  const mockOnTickerSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<TickerSearch onTickerSelect={mockOnTickerSelect} />);

    // Check that the component renders by looking for the input element
    const searchInput = screen.getByRole('combobox');
    expect(searchInput).toBeInTheDocument();
  });

  it('updates input value when user types', async () => {
    const user = userEvent.setup();

    render(<TickerSearch onTickerSelect={mockOnTickerSelect} />);

    const searchInput = screen.getByRole('combobox');

    // Type in the input field
    await user.type(searchInput, 'AAPL');

    // Verify the input value is updated
    expect(searchInput).toHaveValue('AAPL');
  });

  it('makes API call and renders suggestions after debounce delay', async () => {
    const user = userEvent.setup();

    // Mock successful API response
    const mockSuggestions = [
      { ticker: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
      { ticker: 'AAPLW', name: 'Apple Inc. Warrants', exchange: 'NASDAQ' }
    ];

    const mockSupabaseInvoke = vi.mocked(supabase.functions.invoke);
    mockSupabaseInvoke.mockResolvedValue({
      data: {
        success: true,
        data: mockSuggestions
      },
      error: null
    });

    render(<TickerSearch onTickerSelect={mockOnTickerSelect} />);

    const searchInput = screen.getByRole('combobox');

    // Type in the input field
    await user.type(searchInput, 'AAPL');

    // Check that suggestions are rendered using findBy queries
    // This waits for the 300ms debounce delay and API response to complete
    const appleInc = await screen.findByText('Apple Inc.');
    const appleWarrants = await screen.findByText('Apple Inc. Warrants');

    // Now that we've confirmed the visual result, assert the API call was made
    expect(mockSupabaseInvoke).toHaveBeenCalledWith('ticker-search', {
      body: { query: 'AAPL' }
    });

    expect(appleInc).toBeInTheDocument();
    expect(appleWarrants).toBeInTheDocument();

    // Verify the suggestions dropdown is visible
    const suggestionsList = await screen.findByRole('listbox');
    expect(suggestionsList).toBeInTheDocument();
  });

  it('calls onTickerSelect when user clicks on a suggestion', async () => {
    const user = userEvent.setup();

    // Mock successful API response
    const mockSuggestions = [
      { ticker: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
      { ticker: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ' }
    ];

    const mockSupabaseInvoke = vi.mocked(supabase.functions.invoke);
    mockSupabaseInvoke.mockResolvedValue({
      data: {
        success: true,
        data: mockSuggestions
      },
      error: null
    });

    render(<TickerSearch onTickerSelect={mockOnTickerSelect} />);

    const searchInput = screen.getByRole('combobox');

    // Type in the input field
    await user.type(searchInput, 'A');

    // Wait for suggestions to appear using findBy
    const appleSuggestion = await screen.findByText('Apple Inc.');

    // Click on the first suggestion (Apple Inc.)
    await user.click(appleSuggestion);

    // Verify that onTickerSelect was called with correct parameters
    expect(mockOnTickerSelect).toHaveBeenCalledWith('AAPL', 'Apple Inc.');
    expect(mockOnTickerSelect).toHaveBeenCalledTimes(1);

    // Verify that the input value is updated to the selected ticker
    expect(searchInput).toHaveValue('AAPL');
  });
});