import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface TickerSuggestion {
  symbol: string;
  name: string;
  exchange: string;
}

interface AnalysisInputProps {
  onAnalyze: (ticker: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

const AnalysisInput: React.FC<AnalysisInputProps> = ({ onAnalyze, isLoading, disabled = false }) => {
  const [ticker, setTicker] = useState<string>('');
  const [suggestions, setSuggestions] = useState<TickerSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounce ticker search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (ticker.length >= 2) {
        searchTickers(ticker);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [ticker]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchTickers = async (query: string) => {
    try {
      setIsSearching(true);
      const response = await axios.post('/api/ticker-search', { query });
      
      if (response.data && response.data.suggestions) {
        setSuggestions(response.data.suggestions.slice(0, 8)); // Limit to 8 suggestions
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Ticker search failed:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setTicker(value);
  };

  const handleSuggestionClick = (suggestion: TickerSuggestion) => {
    setTicker(suggestion.symbol);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ticker.trim() && !isLoading && !disabled) {
      onAnalyze(ticker.trim());
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative w-full max-w-md">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={ticker}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="Enter ticker symbol (e.g., AAPL)"
            className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
            disabled={isLoading || disabled}
            autoComplete="off"
          />
          
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            </div>
          )}

          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto"
            >
              {suggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion.symbol}-${index}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-gray-900">{suggestion.symbol}</div>
                      <div className="text-sm text-gray-600 truncate">{suggestion.name}</div>
                    </div>
                    <div className="text-xs text-gray-500 ml-2">{suggestion.exchange}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!ticker.trim() || isLoading || disabled}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Analyzing...' : 'Analyze'}
        </button>
      </form>
    </div>
  );
};

export default AnalysisInput;