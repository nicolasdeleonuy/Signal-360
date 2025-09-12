import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { ErrorType } from '../../lib/errorHandler';

// TypeScript interfaces
export interface TickerSuggestion {
  ticker: string;
  name: string;
  exchange?: string;
  type?: string;
}

// Cache interfaces
interface CacheEntry {
  data: TickerSuggestion[];
  timestamp: number;
  query: string;
}

interface SearchCache {
  [normalizedQuery: string]: CacheEntry;
}

export interface TickerSearchProps {
  onTickerSelect: (ticker: string, companyName: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

interface TickerSearchState {
  query: string;
  suggestions: TickerSuggestion[];
  isLoading: boolean;
  isOpen: boolean;
  selectedIndex: number;
  error: string | null;
  warning: string | null;
  retryCount: number;
  lastFailedQuery: string | null;
  hasUserInteracted: boolean;
}

// Memoized suggestion item component for performance optimization
const SuggestionItem = React.memo<{
  suggestion: TickerSuggestion;
  index: number;
  isSelected: boolean;
  onSuggestionClick: (suggestion: TickerSuggestion) => void;
  onSuggestionMouseEnter: (index: number) => void;
}>(({ suggestion, index, isSelected, onSuggestionClick, onSuggestionMouseEnter }) => {
  const handleClick = useCallback(() => {
    onSuggestionClick(suggestion);
  }, [suggestion, onSuggestionClick]);

  const handleMouseEnter = useCallback(() => {
    onSuggestionMouseEnter(index);
  }, [index, onSuggestionMouseEnter]);

  return (
    <li
      key={`${suggestion.ticker}-${index}`}
      id={`ticker-suggestion-${index}`}
      role="option"
      aria-selected={isSelected}
      aria-label={`${suggestion.ticker}, ${suggestion.name}${suggestion.exchange ? `, ${suggestion.exchange}` : ''}`}
      className={`
        ticker-suggestion px-3 py-2.5 sm:px-4 sm:py-3 md:px-4 md:py-3 cursor-pointer 
        border-b border-slate-100 last:border-b-0
        flex flex-col sm:flex-row sm:justify-between sm:items-center
        transition-all duration-150 ease-in-out
        min-h-[44px] sm:min-h-[48px]
        ${isSelected
          ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-300 shadow-sm'
          : 'hover:bg-slate-50 focus:bg-slate-50 active:bg-blue-50 md:hover:bg-blue-25'
        }
        touch-manipulation
      `}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
    >
      <div className="flex flex-col min-w-0 flex-1 space-y-0.5">
        <span className="font-semibold text-slate-900 text-sm sm:text-base leading-tight" aria-hidden="true">
          {suggestion.ticker}
        </span>
        <span className="text-xs sm:text-sm text-slate-600 truncate leading-tight" aria-hidden="true">
          {suggestion.name}
        </span>
      </div>
      {suggestion.exchange && (
        <span className="text-xs text-slate-500 mt-1 sm:mt-0 sm:ml-2 flex-shrink-0 
                       bg-slate-100 px-2 py-0.5 rounded-full font-medium" aria-hidden="true">
          {suggestion.exchange}
        </span>
      )}
    </li>
  );
});

SuggestionItem.displayName = 'SuggestionItem';

// Default props
const defaultProps: Partial<TickerSearchProps> = {
  placeholder: 'Enter ticker symbol (e.g., AAPL, MSFT, GOOGL)...',
  disabled: false,
  autoFocus: false,
  className: '',
};

export const TickerSearch: React.FC<TickerSearchProps> = (props) => {
  // Merge props with defaults
  const {
    onTickerSelect,
    placeholder = defaultProps.placeholder,
    disabled = defaultProps.disabled,
    autoFocus = defaultProps.autoFocus,
    className = defaultProps.className,
  } = props;

  // Component state
  const [state, setState] = useState<TickerSearchState>({
    query: '',
    suggestions: [],
    isLoading: false,
    isOpen: false,
    selectedIndex: -1,
    error: null,
    warning: null,
    retryCount: 0,
    lastFailedQuery: null,
    hasUserInteracted: false,
  });

  // Stable callback functions for error handler
  const onError = useCallback((error: any) => {
    setState(prevState => ({
      ...prevState,
      error: error.userMessage,
      warning: null,
      isLoading: false,
      suggestions: [],
      isOpen: false,
    }));
  }, []);

  const onRetry = useCallback((attemptCount: number) => {
    setState(prevState => ({
      ...prevState,
      retryCount: attemptCount,
      isLoading: true,
      error: null,
    }));
  }, []);

  const onRecovery = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      error: null,
      warning: null,
      retryCount: 0,
      lastFailedQuery: null,
    }));
  }, []);

  // Error handling hook
  const {
    error: classifiedError,
    isRetrying,
    handleError: handleClassifiedError,
    clearError: clearClassifiedError,
    canRetry,
  } = useErrorHandler({
    maxRetries: 3,
    baseRetryDelay: 1000,
    onError,
    onRetry,
    onRecovery,
  });

  // Refs for managing timeouts, input focus, and request cancellation
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cache ref for storing search results
  const cacheRef = useRef<SearchCache>({});

  // Cache configuration
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
  const MAX_CACHE_SIZE = 100; // Prevent memory leaks by limiting cache size

  // Cache utility functions with stable references

  const getCachedResults = useCallback((query: string): TickerSuggestion[] | null => {
    const normalizedQuery = query.trim().toLowerCase();
    const cacheEntry = cacheRef.current[normalizedQuery];

    if (!cacheEntry) {
      return null;
    }

    // Check if cache entry has expired
    const now = Date.now();
    if (now - cacheEntry.timestamp > CACHE_TTL) {
      // Remove expired entry
      delete cacheRef.current[normalizedQuery];
      return null;
    }

    return cacheEntry.data;
  }, []);

  const setCachedResults = useCallback((query: string, data: TickerSuggestion[]): void => {
    const normalizedQuery = query.trim().toLowerCase();

    // Implement cache size limit to prevent memory leaks
    const cacheKeys = Object.keys(cacheRef.current);
    if (cacheKeys.length >= MAX_CACHE_SIZE) {
      // Remove oldest entries (simple FIFO approach)
      const oldestKey = cacheKeys.reduce((oldest, key) => {
        const oldestEntry = cacheRef.current[oldest];
        const currentEntry = cacheRef.current[key];
        return (!oldestEntry || currentEntry.timestamp < oldestEntry.timestamp) ? key : oldest;
      });
      delete cacheRef.current[oldestKey];
    }

    // Store new cache entry
    cacheRef.current[normalizedQuery] = {
      data,
      timestamp: Date.now(),
      query: query.trim(), // Store original query for debugging
    };
  }, []);

  const clearCache = useCallback((): void => {
    cacheRef.current = {};
  }, []);

  // Validate search query with detailed feedback
  const validateSearchQuery = useCallback((query: string): { isValid: boolean; error?: string; warning?: string } => {
    if (!query.trim()) {
      return { isValid: false };
    }

    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 1) {
      return { isValid: false, error: 'Please enter at least 1 character' };
    }

    if (trimmedQuery.length > 10) {
      return { isValid: false, error: 'Ticker symbols are typically 1-5 characters (max 10 allowed)' };
    }

    // Check for valid characters (alphanumeric, spaces, hyphens, dots)
    const validPattern = /^[a-zA-Z0-9\s\-\.]+$/;
    if (!validPattern.test(trimmedQuery)) {
      return {
        isValid: false,
        error: 'Only letters, numbers, spaces, hyphens, and dots are allowed'
      };
    }

    // Check for common patterns that might not be ticker symbols
    if (trimmedQuery.length === 1 && /^[0-9]$/.test(trimmedQuery)) {
      return {
        isValid: true,
        warning: 'Single digits are rarely ticker symbols. Try adding more characters.'
      };
    }

    // Check for very long queries that might be company names
    if (trimmedQuery.length > 5 && trimmedQuery.includes(' ')) {
      return {
        isValid: true,
        warning: 'Searching by company name. For best results, try the ticker symbol instead.'
      };
    }

    return { isValid: true };
  }, []);

  // Perform search API call with enhanced error handling and caching
  const performSearch = useCallback(async (query: string) => {
    // Clear any previous errors when starting a new search
    clearClassifiedError();

    // Validate input
    const validation = validateSearchQuery(query);
    if (!validation.isValid) {
      if (validation.error) {
        setState(prevState => ({
          ...prevState,
          error: validation.error!,
          warning: null,
          suggestions: [],
          isLoading: false,
          isOpen: false,
        }));
      } else {
        setState(prevState => ({
          ...prevState,
          suggestions: [],
          isLoading: false,
          isOpen: false,
          error: null,
          warning: null,
        }));
      }
      return;
    }

    // Check cache first for valid, non-expired results
    const cachedResults = getCachedResults(query);
    if (cachedResults !== null) {
      // Use cached results immediately
      setState(prevState => ({
        ...prevState,
        suggestions: cachedResults,
        isLoading: false,
        isOpen: true,
        selectedIndex: -1,
        error: null,
        warning: validation.warning || null,
        retryCount: 0,
        lastFailedQuery: null,
      }));
      return;
    }

    // Set warning if present
    if (validation.warning) {
      setState(prevState => ({
        ...prevState,
        warning: validation.warning!,
        error: null,
      }));
    } else {
      setState(prevState => ({
        ...prevState,
        warning: null,
      }));
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const currentController = new AbortController();
    abortControllerRef.current = currentController;

    setState(prevState => ({
      ...prevState,
      isLoading: true,
      error: null,
      lastFailedQuery: null,
    }));

    try {
      const { data, error } = await supabase.functions.invoke('ticker-search', {
        body: { query: query.trim() },
      });

      // Check if this request was cancelled
      if (currentController.signal.aborted) {
        return;
      }

      if (error) {
        // Classify different types of API errors
        let errorType = ErrorType.SERVER;
        let errorMessage = 'Search failed';

        if (error.message?.includes('rate limit') || error.message?.includes('429')) {
          errorType = ErrorType.RATE_LIMIT;
          errorMessage = 'Too many search requests. Please wait a moment and try again.';
        } else if (error.message?.includes('timeout') || error.message?.includes('ECONNABORTED')) {
          errorType = ErrorType.TIMEOUT;
          errorMessage = 'Search request timed out. Please try again.';
        } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
          errorType = ErrorType.NETWORK;
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message?.includes('503') || error.message?.includes('unavailable')) {
          errorType = ErrorType.SERVICE_UNAVAILABLE;
          errorMessage = 'Search service temporarily unavailable. Please try again later.';
        }

        handleClassifiedError(new Error(errorMessage), {
          type: errorType,
          query: query.trim(),
          originalError: error,
        });

        setState(prevState => ({
          ...prevState,
          lastFailedQuery: query.trim(),
        }));

        throw new Error(errorMessage);
      }

      if (data && data.success) {
        const suggestions = data.data || [];

        // Cache the successful results
        setCachedResults(query.trim(), suggestions);

        setState(prevState => ({
          ...prevState,
          suggestions,
          isLoading: false,
          isOpen: true,
          selectedIndex: -1,
          retryCount: 0,
          lastFailedQuery: null,
          error: null,
        }));
      } else {
        const errorMessage = data?.error?.message || 'Search failed';
        handleClassifiedError(new Error(errorMessage), {
          type: ErrorType.SERVER,
          query: query.trim(),
          responseData: data,
        });

        setState(prevState => ({
          ...prevState,
          lastFailedQuery: query.trim(),
        }));

        throw new Error(errorMessage);
      }
    } catch (err) {
      // Don't show error for aborted requests
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      // If this is not already a classified error, classify it
      if (!classifiedError) {
        let errorType = ErrorType.UNKNOWN;

        if (err instanceof Error) {
          if (err.message.includes('rate limit') || err.message.includes('429')) {
            errorType = ErrorType.RATE_LIMIT;
          } else if (err.message.includes('timeout') || err.message.includes('ECONNABORTED')) {
            errorType = ErrorType.TIMEOUT;
          } else if (err.message.includes('network') || err.message.includes('fetch')) {
            errorType = ErrorType.NETWORK;
          } else if (err.message.includes('503') || err.message.includes('unavailable')) {
            errorType = ErrorType.SERVICE_UNAVAILABLE;
          }
        }

        handleClassifiedError(err, {
          type: errorType,
          query: query.trim(),
        });

        setState(prevState => ({
          ...prevState,
          lastFailedQuery: query.trim(),
        }));
      }
    }
  }, [validateSearchQuery, clearClassifiedError, handleClassifiedError, getCachedResults, setCachedResults]);

  // Retry search operation
  const retrySearch = useCallback(async () => {
    if (state.lastFailedQuery) {
      await performSearch(state.lastFailedQuery);
    }
  }, [state.lastFailedQuery, performSearch]);

  // Handle input change with controlled state management and debouncing
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = event.target.value;

    // Clear errors when user starts typing
    clearClassifiedError();

    setState(prevState => ({
      ...prevState,
      query: newQuery,
      error: null,
      warning: null,
      lastFailedQuery: null,
      hasUserInteracted: true,
    }));

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout for debounced search (300ms delay)
    debounceTimeoutRef.current = setTimeout(() => {
      performSearch(newQuery);
    }, 300);
  }, [performSearch, clearClassifiedError]);

  // Handle input focus
  const handleInputFocus = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      isOpen: prevState.suggestions.length > 0 && prevState.query.trim().length > 0,
    }));
  }, []);

  // Handle input blur
  const handleInputBlur = useCallback(() => {
    // Delay closing to allow for suggestion clicks
    setTimeout(() => {
      setState(prevState => ({
        ...prevState,
        isOpen: false,
        selectedIndex: -1,
      }));
    }, 150);
  }, []);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: TickerSuggestion) => {
    setState(prevState => ({
      ...prevState,
      query: suggestion.ticker,
      isOpen: false,
      selectedIndex: -1,
      suggestions: [],
    }));

    // Call the parent callback
    onTickerSelect(suggestion.ticker, suggestion.name);

    // Clear any pending timeouts
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
  }, [onTickerSelect]);

  // Handle suggestion mouse enter for highlighting
  const handleSuggestionMouseEnter = useCallback((index: number) => {
    setState(prevState => ({
      ...prevState,
      selectedIndex: index,
    }));
  }, []);

  // Memoized values for performance optimization
  const hasResults = useMemo(() => state.suggestions.length > 0, [state.suggestions.length]);
  const showDropdown = useMemo(() => state.isOpen && hasResults, [state.isOpen, hasResults]);
  const showNoResults = useMemo(() => 
    state.isOpen && !state.isLoading && !isRetrying && state.query.trim() && 
    state.suggestions.length === 0 && !state.error && !classifiedError,
    [state.isOpen, state.isLoading, isRetrying, state.query, state.suggestions.length, state.error, classifiedError]
  );

  // Memoized ARIA attributes for input
  const inputAriaAttributes = useMemo(() => ({
    'aria-expanded': state.isOpen,
    'aria-haspopup': 'listbox' as const,
    'aria-owns': 'ticker-suggestions-list',
    'aria-activedescendant': state.selectedIndex >= 0 && state.isOpen 
      ? `ticker-suggestion-${state.selectedIndex}` 
      : undefined,
    'aria-autocomplete': 'list' as const,
    'aria-describedby': `ticker-search-instructions ${state.error || classifiedError ? 'ticker-search-error' : ''} ${state.warning ? 'ticker-search-warning' : ''} ${state.isLoading || isRetrying ? 'ticker-search-status' : ''}`.trim(),
  }), [state.isOpen, state.selectedIndex, state.error, classifiedError, state.warning, state.isLoading, isRetrying]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!state.isOpen || state.suggestions.length === 0) {
      // If dropdown is not open, only handle Escape to clear any error states
      if (event.key === 'Escape') {
        clearClassifiedError();
        setState(prevState => ({
          ...prevState,
          error: null,
          warning: null,
          lastFailedQuery: null,
        }));
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setState(prevState => ({
          ...prevState,
          selectedIndex: prevState.selectedIndex < prevState.suggestions.length - 1
            ? prevState.selectedIndex + 1
            : 0, // Wrap to first item
        }));
        break;

      case 'ArrowUp':
        event.preventDefault();
        setState(prevState => ({
          ...prevState,
          selectedIndex: prevState.selectedIndex > 0
            ? prevState.selectedIndex - 1
            : prevState.suggestions.length - 1, // Wrap to last item
        }));
        break;

      case 'Enter':
        event.preventDefault();
        if (state.selectedIndex >= 0 && state.selectedIndex < state.suggestions.length) {
          const selectedSuggestion = state.suggestions[state.selectedIndex];
          handleSuggestionClick(selectedSuggestion);
        }
        break;

      case 'Escape':
        event.preventDefault();
        clearClassifiedError();
        setState(prevState => ({
          ...prevState,
          isOpen: false,
          selectedIndex: -1,
          error: null,
          warning: null,
          lastFailedQuery: null,
        }));
        break;

      default:
        // For other keys, don't prevent default behavior
        break;
    }
  }, [state.isOpen, state.suggestions, state.selectedIndex, handleSuggestionClick]);

  // Cleanup timeouts, abort controllers, and cache on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Clear any pending error states
      clearClassifiedError();
      // Clear cache to prevent memory leaks
      clearCache();
    };
  }, []);

  return (
    <div className={`ticker-search-container relative w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mx-auto ${className}`}>
      {/* Helper text */}
      {!state.hasUserInteracted && (
        <div className="ticker-search-helper mb-2 text-xs sm:text-sm text-gray-400 text-center">
          <span className="hidden sm:inline">Start typing a ticker symbol or company name to see suggestions</span>
          <span className="sm:hidden">Type ticker symbol for suggestions</span>
        </div>
      )}

      {/* Search Input */}
      <div className="ticker-search-input-wrapper relative">
        <input
          ref={inputRef}
          type="text"
          value={state.query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          role="combobox"
          {...inputAriaAttributes}
          className={`
            ticker-search-input w-full 
            px-3 py-2.5 sm:px-4 sm:py-3 md:px-4 md:py-3 lg:px-5 lg:py-4
            pr-10 sm:pr-12 
            text-sm sm:text-base md:text-lg 
            border-2 rounded-lg sm:rounded-xl bg-white
            focus:outline-none transition-all duration-200
            hover:border-slate-400
            disabled:bg-slate-100 disabled:border-slate-200 disabled:cursor-not-allowed disabled:text-slate-500
            placeholder:text-slate-400 placeholder:text-sm sm:placeholder:text-base
            ${state.error || classifiedError
              ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
              : state.warning
                ? 'border-yellow-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200'
                : state.suggestions.length > 0 && state.isOpen
                  ? 'border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-200'
                  : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
            }
            ${state.isLoading || isRetrying ? 'pr-10 sm:pr-12' : ''}
            touch-manipulation
          `}
          aria-label="Search for ticker symbols"
        />

        {/* Hidden instructions for screen readers */}
        <div id="ticker-search-instructions" className="sr-only">
          Type to search for stock ticker symbols. Use arrow keys to navigate suggestions and Enter to select. Press Escape to close suggestions.
        </div>

        {/* Warning message */}
        {state.warning && !state.error && !classifiedError && (
          <div
            className="ticker-search-warning absolute top-full left-0 right-0 z-30 mt-1 
                     p-2 sm:p-3 bg-yellow-50 border border-yellow-200 
                     rounded-lg sm:rounded-xl text-yellow-800 text-xs sm:text-sm
                     shadow-md backdrop-blur-sm"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start space-x-1 sm:space-x-2">
              <span className="text-yellow-600 text-sm sm:text-base flex-shrink-0 mt-0.5" aria-hidden="true">💡</span>
              <span className="flex-1 leading-tight">{state.warning}</span>
            </div>
          </div>
        )}

        {/* Live region for search status announcements */}
        <div
          id="ticker-search-status"
          className="sr-only"
          aria-live="polite"
          aria-atomic="true"
        >
          {state.isLoading && !isRetrying && 'Searching for ticker symbols...'}
          {isRetrying && `Retrying search, attempt ${state.retryCount} of 3...`}
          {!state.isLoading && !isRetrying && state.isOpen && state.suggestions.length > 0 &&
            `${state.suggestions.length} suggestion${state.suggestions.length === 1 ? '' : 's'} available. Use arrow keys to navigate.`
          }
          {!state.isLoading && !isRetrying && state.isOpen && state.query.trim() && state.suggestions.length === 0 && !state.error && !classifiedError &&
            `No results found for ${state.query}.`
          }
          {(state.error || classifiedError) &&
            `Search error: ${state.error || classifiedError?.userMessage}. ${canRetry ? 'You can try again.' : 'You can enter a ticker manually.'}`
          }
          {state.warning && !state.error && !classifiedError &&
            `Search tip: ${state.warning}`
          }
        </div>

        {/* Loading indicator */}
        {(state.isLoading || isRetrying) && (
          <div className="ticker-search-loading absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 z-10">
            <div
              className={`animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 ${isRetrying
                  ? 'border-orange-200 border-t-orange-600'
                  : 'border-blue-200 border-t-blue-600'
                }`}
              aria-hidden="true"
            ></div>
            <span className="sr-only">
              {isRetrying ? 'Retrying search...' : 'Searching for ticker symbols...'}
            </span>
          </div>
        )}
      </div>

      {/* Error message with retry functionality */}
      {(state.error || classifiedError) && (
        <div
          id="ticker-search-error"
          className="ticker-search-error absolute top-full left-0 right-0 z-40 mt-1 
                     p-3 sm:p-4 bg-red-50 border border-red-200 
                     rounded-lg sm:rounded-xl text-red-700 text-xs sm:text-sm
                     shadow-lg backdrop-blur-sm"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-start space-x-2 sm:space-x-3">
            <span className="text-red-500 text-sm sm:text-base flex-shrink-0 mt-0.5" aria-hidden="true">⚠️</span>
            <div className="flex-1 space-y-2">
              <span className="block leading-tight">
                {state.error || classifiedError?.userMessage}
              </span>

              {/* Retry information */}
              {state.retryCount > 0 && (
                <span className="block text-xs text-red-600 leading-tight">
                  Retry attempt {state.retryCount} of 3
                </span>
              )}

              {/* Recovery actions */}
              {classifiedError && canRetry && !isRetrying && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    onClick={retrySearch}
                    disabled={isRetrying}
                    className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 
                             border border-red-300 rounded-md hover:bg-red-200 
                             focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1
                             disabled:opacity-50 disabled:cursor-not-allowed
                             transition-colors duration-200"
                    aria-label="Retry search"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => {
                      clearClassifiedError();
                      setState(prevState => ({
                        ...prevState,
                        error: null,
                        warning: null,
                        lastFailedQuery: null,
                      }));
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 bg-transparent 
                             border border-red-300 rounded-md hover:bg-red-50 
                             focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1
                             transition-colors duration-200"
                    aria-label="Dismiss error"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Retrying indicator */}
              {isRetrying && (
                <div className="flex items-center space-x-2 mt-2">
                  <div className="animate-spin rounded-full h-3 w-3 border border-red-300 border-t-red-600"></div>
                  <span className="text-xs text-red-600">Retrying...</span>
                </div>
              )}

              {/* Graceful degradation message */}
              {classifiedError && !canRetry && (
                <span className="block text-xs text-red-600 leading-tight mt-1">
                  You can still enter a ticker symbol manually and proceed with analysis.
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Suggestions Dropdown */}
      {showDropdown && (
        <div className="ticker-suggestions-dropdown absolute top-full left-0 right-0 z-50 mt-1 sm:mt-2 
                        bg-white border border-slate-200 rounded-lg sm:rounded-xl shadow-xl 
                        max-h-48 sm:max-h-60 md:max-h-72 overflow-y-auto backdrop-blur-sm">
          <ul
            id="ticker-suggestions-list"
            role="listbox"
            aria-label={`Ticker suggestions for ${state.query}`}
            aria-multiselectable="false"
            className="py-0.5 sm:py-1"
          >
            {state.suggestions.map((suggestion, index) => (
              <SuggestionItem
                key={`${suggestion.ticker}-${index}`}
                suggestion={suggestion}
                index={index}
                isSelected={index === state.selectedIndex}
                onSuggestionClick={handleSuggestionClick}
                onSuggestionMouseEnter={handleSuggestionMouseEnter}
              />
            ))}
          </ul>
        </div>
      )}

      {/* No results message */}
      {showNoResults && (
        <div
          className="ticker-no-results absolute top-full left-0 right-0 z-50 mt-1 sm:mt-2 
                     p-3 sm:p-4 bg-white border border-slate-200 rounded-lg sm:rounded-xl shadow-lg 
                     text-center text-slate-500 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col items-center space-y-2 sm:space-y-3">
            <span className="text-xl sm:text-2xl" aria-hidden="true">🔍</span>
            <div className="space-y-1">
              <p className="text-xs sm:text-sm leading-tight">
                No results found for <span className="font-medium text-slate-700">"{state.query}"</span>
              </p>
              <p className="text-xs text-slate-400">
                You can still enter this ticker manually and proceed with analysis
              </p>
            </div>
            <div className="text-xs text-slate-400 space-y-1">
              <p className="font-medium">Suggestions:</p>
              <ul className="space-y-0.5 text-left">
                <li>• Try common ticker symbols (AAPL, MSFT, GOOGL)</li>
                <li>• Check spelling and try again</li>
                <li>• Use the official ticker symbol from your broker</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Prop validation (TypeScript provides compile-time validation)
TickerSearch.displayName = 'TickerSearch';

export default TickerSearch;