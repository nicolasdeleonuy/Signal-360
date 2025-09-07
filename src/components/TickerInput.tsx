import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TickerSuggestion } from '../types/dashboard';
import { supabase } from '../lib/supabaseClient';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { ErrorDisplay } from './ErrorDisplay';
import { ClassifiedError } from '../lib/errorHandler';

interface TickerInputProps {
  onSubmit: (ticker: string) => void;
  loading: boolean;
  error: string | ClassifiedError | null;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  showSuggestions?: boolean;
  onErrorRetry?: () => void;
}

interface TickerInputState {
  value: string;
  isValid: boolean;
  suggestions: TickerSuggestion[];
  showSuggestions: boolean;
  selectedSuggestionIndex: number;
  isLoadingSuggestions: boolean;
  validationError: string | null;
}

// Ticker validation regex - requires at least one letter, allows letters, numbers, dots, and hyphens (1-5 chars)
const TICKER_REGEX = /^(?=.*[A-Z])[A-Z0-9.-]{1,5}$/;

// Debounce delay for API calls
const SUGGESTION_DEBOUNCE_DELAY = 300;

export function TickerInput({ 
  onSubmit, 
  loading, 
  error, 
  placeholder = "Enter ticker (e.g., AAPL)",
  autoFocus = true,
  disabled = false,
  showSuggestions = true,
  onErrorRetry
}: TickerInputProps) {
  const [state, setState] = useState<TickerInputState>({
    value: '',
    isValid: false,
    suggestions: [],
    showSuggestions: false,
    selectedSuggestionIndex: -1,
    isLoadingSuggestions: false,
    validationError: null,
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLUListElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  // Enhanced error handling
  const {
    error: internalError,
    handleError,
    clearError,
    getRecoveryActions,
    canRetry,
    retryLastOperation
  } = useErrorHandler({
    maxRetries: 2,
    baseRetryDelay: 1000,
    onError: (classifiedError) => {
      console.warn('TickerInput error:', classifiedError);
    },
    onRecovery: () => {
      console.log('TickerInput error recovered');
    }
  });

  // Sanitize ticker input - remove invalid characters and convert to uppercase
  const sanitizeTicker = useCallback((input: string): string => {
    return input
      .toUpperCase()
      .replace(/[^A-Z0-9.-]/g, '') // Remove invalid characters
      .slice(0, 5); // Limit to 5 characters
  }, []);

  // Validate ticker format
  const validateTicker = useCallback((ticker: string): { isValid: boolean; error: string | null } => {
    if (!ticker.trim()) {
      return { isValid: false, error: null };
    }

    if (ticker.length < 1) {
      return { isValid: false, error: 'Ticker must be at least 1 character' };
    }

    if (ticker.length > 5) {
      return { isValid: false, error: 'Ticker cannot exceed 5 characters' };
    }

    if (!TICKER_REGEX.test(ticker)) {
      return { isValid: false, error: 'Invalid format. Use 1-5 characters (A-Z, 0-9, ., -) and include at least one letter.' };
    }

    return { isValid: true, error: null };
  }, []);

  // Fetch ticker suggestions from generate-ideas API with enhanced error handling
  const fetchSuggestions = useCallback(async (query: string): Promise<TickerSuggestion[]> => {
    if (!query || query.length < 1) {
      return [];
    }

    try {
      setState(prev => ({ ...prev, isLoadingSuggestions: true }));
      clearError(); // Clear any previous errors

      // Call generate-ideas API for investment context to get suggestions
      const { data, error } = await supabase.functions.invoke('generate-ideas', {
        body: { 
          context: 'investment_idea' 
        }
      });

      if (error) {
        handleError(error, { 
          source: 'TickerInput.fetchSuggestions',
          query,
          operation: 'generate-ideas'
        });
        return [];
      }

      if (data?.success && data.data) {
        // Create suggestion from the generated idea
        const suggestion: TickerSuggestion = {
          symbol: data.data.ticker_symbol,
          name: data.data.company_name,
          exchange: 'NASDAQ' // Default exchange
        };

        // Filter suggestion based on query
        if (suggestion.symbol.toLowerCase().includes(query.toLowerCase()) ||
            suggestion.name.toLowerCase().includes(query.toLowerCase())) {
          return [suggestion];
        }
      }

      return [];
    } catch (error) {
      handleError(error, { 
        source: 'TickerInput.fetchSuggestions',
        query,
        operation: 'generate-ideas'
      });
      return [];
    } finally {
      setState(prev => ({ ...prev, isLoadingSuggestions: false }));
    }
  }, [handleError, clearError]);

  // Handle input change with real-time validation and suggestions
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value;
    const sanitizedValue = sanitizeTicker(rawValue);
    const validation = validateTicker(sanitizedValue);

    setState(prev => ({
      ...prev,
      value: sanitizedValue,
      isValid: validation.isValid,
      validationError: validation.error,
      selectedSuggestionIndex: -1,
    }));

    // Debounce suggestions API call
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (sanitizedValue.length >= 1) {
      debounceTimeoutRef.current = setTimeout(async () => {
        const suggestions = await fetchSuggestions(sanitizedValue);
        setState(prev => ({
          ...prev,
          suggestions,
          showSuggestions: suggestions.length > 0,
        }));
      }, SUGGESTION_DEBOUNCE_DELAY);
    } else {
      setState(prev => ({
        ...prev,
        suggestions: [],
        showSuggestions: false,
      }));
    }
  }, [sanitizeTicker, validateTicker, fetchSuggestions]);

  // Handle form submission with proper validation
  const handleSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    
    const trimmedValue = state.value.trim();
    
    // Always re-validate at submission time to ensure accuracy
    const validation = validateTicker(trimmedValue);
    
    if (!validation.isValid) {
      // Update state to show validation error
      setState(prev => ({
        ...prev,
        validationError: validation.error,
        isValid: false,
      }));
      return;
    }
    
    // Clear any validation errors and proceed with submission
    setState(prev => ({
      ...prev,
      validationError: null,
      isValid: true,
      showSuggestions: false,
    }));
    
    onSubmit(trimmedValue);
  }, [state.value, onSubmit, validateTicker]);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: TickerSuggestion) => {
    const validation = validateTicker(suggestion.symbol);
    
    setState(prev => ({
      ...prev,
      value: suggestion.symbol,
      isValid: validation.isValid,
      validationError: validation.error,
      showSuggestions: false,
      selectedSuggestionIndex: -1,
    }));

    // Auto-submit if valid
    if (validation.isValid) {
      onSubmit(suggestion.symbol);
    }
  }, [validateTicker, onSubmit]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!state.showSuggestions || state.suggestions.length === 0) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setState(prev => ({
          ...prev,
          selectedSuggestionIndex: Math.min(
            prev.selectedSuggestionIndex + 1,
            prev.suggestions.length - 1
          ),
        }));
        break;

      case 'ArrowUp':
        event.preventDefault();
        setState(prev => ({
          ...prev,
          selectedSuggestionIndex: Math.max(prev.selectedSuggestionIndex - 1, -1),
        }));
        break;

      case 'Enter':
        if (state.selectedSuggestionIndex >= 0) {
          event.preventDefault();
          handleSuggestionSelect(state.suggestions[state.selectedSuggestionIndex]);
        }
        break;

      case 'Escape':
        setState(prev => ({
          ...prev,
          showSuggestions: false,
          selectedSuggestionIndex: -1,
        }));
        break;
    }
  }, [state.showSuggestions, state.suggestions, state.selectedSuggestionIndex, handleSuggestionSelect]);

  // Handle input blur - hide suggestions after a delay
  const handleBlur = useCallback(() => {
    // Delay hiding suggestions to allow for click events
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        showSuggestions: false,
        selectedSuggestionIndex: -1,
      }));
    }, 150);
  }, []);

  // Handle input focus - show suggestions if available
  const handleFocus = useCallback(() => {
    if (state.suggestions.length > 0) {
      setState(prev => ({ ...prev, showSuggestions: true }));
    }
  }, [state.suggestions.length]);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Auto-focus input if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Determine the primary error to display
  const primaryError = error || internalError;
  const validationError = state.validationError;
  const hasError = primaryError || validationError;
  
  const inputId = 'ticker-input';
  const errorId = 'ticker-error';
  const suggestionsId = 'ticker-suggestions';

  // Get recovery actions for the primary error
  const recoveryActions = primaryError && typeof primaryError === 'object' && 'type' in primaryError 
    ? getRecoveryActions() 
    : [];

  // Enhanced retry handler
  const handleRetry = useCallback(() => {
    if (onErrorRetry) {
      onErrorRetry();
    } else if (canRetry) {
      retryLastOperation();
    }
  }, [onErrorRetry, canRetry, retryLastOperation]);

  return (
    <div className={`ticker-input-container ${loading ? 'ticker-container-loading' : ''}`}>
      {/* Loading overlay for better visual feedback */}
      {loading && (
        <div className="ticker-loading-overlay" aria-hidden="true">
          <div className="ticker-loading-backdrop"></div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="ticker-form">
        <div className="ticker-input-wrapper">
          <label htmlFor={inputId} className="ticker-label">
            Stock Ticker Symbol
          </label>
          
          <div className="ticker-input-field">
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              value={state.value}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              onFocus={handleFocus}
              placeholder={placeholder}
              className={`ticker-input ${hasError ? 'ticker-input-error' : ''} ${state.isValid ? 'ticker-input-valid' : ''} ${loading ? 'ticker-input-loading' : ''}`}
              disabled={loading || disabled}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-invalid={!!hasError}
              aria-describedby={hasError ? errorId : undefined}
              aria-expanded={showSuggestions && state.showSuggestions}
              aria-haspopup="listbox"
              aria-owns={showSuggestions && state.showSuggestions ? suggestionsId : undefined}
              role="combobox"
              aria-label="Enter stock ticker symbol for analysis"
            />

            {state.isLoadingSuggestions && (
              <div className="ticker-loading-indicator" aria-label="Loading suggestions">
                <div className="ticker-spinner"></div>
              </div>
            )}
          </div>

          {/* Enhanced error display */}
          {hasError && (
            <div id={errorId} className="ticker-error-container" role="alert">
              {/* Validation errors (simple display) */}
              {validationError && (
                <div className="ticker-validation-error">
                  <span className="ticker-error-icon">⚠️</span>
                  <span className="ticker-error-message">{validationError}</span>
                </div>
              )}
              
              {/* API/System errors (enhanced display) */}
              {primaryError && typeof primaryError === 'object' && 'type' in primaryError && (
                <ErrorDisplay
                  error={primaryError}
                  actions={recoveryActions.map(action => ({
                    ...action,
                    action: action.label === 'Try Again' ? handleRetry : action.action
                  }))}
                  compact={true}
                  onDismiss={clearError}
                />
              )}
              
              {/* Simple string errors */}
              {primaryError && typeof primaryError === 'string' && (
                <div className="ticker-simple-error">
                  <span className="ticker-error-icon">❌</span>
                  <span className="ticker-error-message">{primaryError}</span>
                  {onErrorRetry && (
                    <button 
                      type="button"
                      onClick={handleRetry}
                      className="ticker-retry-button"
                      aria-label="Retry operation"
                    >
                      Try Again
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Suggestions dropdown */}
          {showSuggestions && state.showSuggestions && state.suggestions.length > 0 && (
            <ul
              ref={suggestionsRef}
              id={suggestionsId}
              className="ticker-suggestions"
              role="listbox"
              aria-label="Ticker suggestions"
            >
              {state.suggestions.map((suggestion, index) => (
                <li
                  key={suggestion.symbol}
                  className={`ticker-suggestion ${index === state.selectedSuggestionIndex ? 'ticker-suggestion-selected' : ''}`}
                  role="option"
                  aria-selected={index === state.selectedSuggestionIndex}
                  onClick={() => handleSuggestionSelect(suggestion)}
                  onMouseEnter={() => setState(prev => ({ ...prev, selectedSuggestionIndex: index }))}
                >
                  <div className="ticker-suggestion-content">
                    <span className="ticker-suggestion-symbol">{suggestion.symbol}</span>
                    <span className="ticker-suggestion-name">{suggestion.name}</span>
                    <span className="ticker-suggestion-exchange">{suggestion.exchange}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="submit"
          className={`ticker-submit-button ${loading ? 'ticker-submit-loading' : ''} ${!state.isValid ? 'ticker-submit-disabled' : ''}`}
          disabled={!state.isValid || loading || disabled}
          aria-label={loading ? `Analyzing ${state.value}...` : `Analyze ${state.value || 'ticker'}`}
          aria-describedby={loading ? 'ticker-loading-status' : undefined}
        >
          {loading ? (
            <>
              <div className="ticker-button-spinner" aria-hidden="true"></div>
              <span>Analyzing...</span>
              <span id="ticker-loading-status" className="sr-only">
                Analysis in progress for {state.value}
              </span>
            </>
          ) : (
            <>
              <span>Analyze</span>
              {state.isValid && (
                <span className="ticker-submit-ticker" aria-hidden="true">
                  {state.value}
                </span>
              )}
            </>
          )}
        </button>
      </form>

      {/* Screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {loading && `Analyzing ticker ${state.value}...`}
        {hasError && `Error: ${typeof primaryError === 'string' ? primaryError : primaryError?.userMessage || validationError}`}
        {state.isValid && !loading && !hasError && state.value && `Valid ticker: ${state.value}`}
      </div>

      {/* Status announcements for suggestions */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {state.isLoadingSuggestions && 'Loading ticker suggestions...'}
        {showSuggestions && state.showSuggestions && state.suggestions.length > 0 && 
          `${state.suggestions.length} suggestion${state.suggestions.length > 1 ? 's' : ''} available`}
      </div>
    </div>
  );
}

export default TickerInput;