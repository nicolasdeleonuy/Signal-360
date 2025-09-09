import React, { useState } from 'react';
import { createAnalysisService, InvestmentAnalysisResponse } from '../services/analysisService';

const TestHarness: React.FC = () => {
  const [ticker, setTicker] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<InvestmentAnalysisResponse | null>(null);

  const handleRunAnalysis = async () => {
    if (!ticker.trim()) {
      setError('Please enter a ticker symbol');
      return;
    }

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setError('VITE_GEMINI_API_KEY environment variable is not set');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const startTime = performance.now();
      
      const analysisService = createAnalysisService(apiKey);
      const result = await analysisService.getInvestmentAnalysis(ticker.toUpperCase());
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      console.log(`Analysis execution time: ${executionTime.toFixed(2)}ms (${(executionTime / 1000).toFixed(2)}s)`);
      console.log('Analysis result:', result);
      
      setAnalysisResult(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Analysis error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Investment Analysis Test Harness</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="ticker-input" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Ticker Symbol:
          </label>
          <input
            id="ticker-input"
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="Enter ticker (e.g., AAPL, MSFT, TSLA)"
            style={{
              padding: '8px 12px',
              fontSize: '16px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              width: '200px',
              marginRight: '10px'
            }}
            disabled={isLoading}
          />
          <button
            onClick={handleRunAnalysis}
            disabled={isLoading || !ticker.trim()}
            style={{
              padding: '8px 16px',
              fontSize: '16px',
              backgroundColor: isLoading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? 'Running Analysis...' : 'Run Investment Analysis'}
          </button>
        </div>
      </div>

      {isLoading && (
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#f8f9fa', 
          border: '1px solid #dee2e6', 
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <p style={{ margin: 0, fontSize: '18px' }}>Loading... Please wait while we analyze {ticker.toUpperCase()}</p>
          <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#666' }}>
            This may take up to 60 seconds to complete the comprehensive analysis.
          </p>
        </div>
      )}

      {error && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          border: '1px solid #f5c6cb', 
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {analysisResult && (
        <div style={{ marginTop: '20px' }}>
          <h2>Analysis Result for {analysisResult.ticker}</h2>
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            border: '1px solid #dee2e6', 
            borderRadius: '4px',
            padding: '15px'
          }}>
            <pre style={{ 
              whiteSpace: 'pre-wrap', 
              wordWrap: 'break-word',
              fontSize: '12px',
              lineHeight: '1.4',
              margin: 0,
              maxHeight: '600px',
              overflow: 'auto'
            }}>
              {JSON.stringify(analysisResult, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestHarness;