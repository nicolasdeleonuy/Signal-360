import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TickerSuggestion } from '../types/dashboard';
import { supabase } from '../lib/supabase';

interface TickerInputProps {
  onSubmit: (ticker: string) => void;
  loading: boolean;
  error: string | null;
  placeholder?: string;
  autoFocus?: boolean;
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

// Ticker validation regex - allows 1-5 uppercase letters, numbers, and common symbols
const TICKER_REGEX = /^[A-Z0-9.-]{1,5}$/;

// Debounce delay for API calls
const SUGGESTION_DEBOUNCE_DELAY = 300;

export function TickerInput({ 
  onSubmit, 
  loading, 
  error, 
  placeholder = "Enter ticker (e.g., AAPL)",
  autoFocus = true 
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
      return { isValid: false, error: 'Invalid ticker format. Use letters, numbers, dots, and hyphens only' };
    }

    return { isValid: true, error: null };
  }, []);

  // Fetch ticker suggestions from generate-ideas API
  const fetchSuggestions = useCallback(async (query: string): Promise<TickerSuggestion[]> => {
    if (!query || query.length < 1) {
      return [];
    }

    try {
      setState(prev => ({ ...prev, isLoadingSuggestions: true }));

      // Call generate-ideas API for investment context to get suggestions
      const { data, error } = await supabase.functions.invoke('generate-ideas', {
        body: { 
          context: 'investment_idea' 
        }
      });

      if (error) {
        console.warn('Failed to fetch ticker suggestions:', error);
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
      console.warn('Error fetching ticker suggestions:', error);
      return [];
    } finally {
      setState(prev => ({ ...prev, isLoadingSuggestions: false }));
    }
  }, []);

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

  // Handle form submission
  const handleSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    
    if (state.isValid && state.value.trim()) {
      onSubmit(state.value.trim());
      setState(prev => ({ ...prev, showSuggestions: false }));
    }
  }, [state.isValid, state.value, onSubmit]);

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

  const hasError = error || state.validationError;
  const inputId = 'ticker-input';
  const errorId = 'ticker-error';
  const suggestionsId = 'ticker-suggestions';

  return (
    <div className="ticker-input-container">
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
              className={`ticker-input ${hasError ? 'ticker-input-error' : ''} ${state.isValid ? 'ticker-input-valid' : ''}`}
              disabled={loading}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-invalid={!!hasError}
              aria-describedby={hasError ? errorId : undefined}
              aria-expanded={state.showSuggestions}
              aria-haspopup="listbox"
              aria-owns={state.showSuggestions ? suggestionsId : undefined}
              role="combobox"
            />

            {state.isLoadingSuggestions && (
              <div className="ticker-loading-indicator" aria-label="Loading suggestions">
                <div className="ticker-spinner"></div>
              </div>
            )}
          </div>

          {/* Error message */}
          {hasError && (
            <div id={errorId} className="ticker-error" role="alert">
              {error || state.validationError}
            </div>
          )}

          {/* Suggestions dropdown */}
          {state.showSuggestions && state.suggestions.length > 0 && (
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
          className="ticker-submit-button"
          disabled={!state.isValid || loading}
          aria-label={`Analyze ${state.value || 'ticker'}`}
        >
          {loading ? (
            <>
              <div className="ticker-button-spinner"></div>
              <span>Analyzing...</span>
            </>
          ) : (
            'Analyze'
          )}
        </button>
      </form>
    </div>
  );
}

export default TickerInput;