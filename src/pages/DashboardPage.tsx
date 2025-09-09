import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/auth-context';
import { useSignalAnalysis } from '../hooks/useSignalAnalysis';
import { DashboardState, InvestmentGoal, AnalysisResult } from '../types/dashboard';
import { TickerSearch } from '../components/search/TickerSearch';
import GoalSelection from '../components/GoalSelection';
import { ResultsView } from '../components/ResultsView';
import { useErrorHandler } from '../hooks/useErrorHandler';

const initialDashboardState: Omit<DashboardState, 'currentStep'> = {
  tickerSymbol: '',
  analysisId: null,
  analysisProgress: null,
  goalSelection: null,
  tradingTimeframe: null,
  results: null,
  error: null,
  loading: false,
};

export function DashboardPage() {
  const { user } = useAuth();
  const { 
    data: analysisData, 
    error: analysisError, 
    isLoading: analysisLoading, 
    runAnalysis,
    cancelAnalysis,
    resetAnalysis
  } = useSignalAnalysis();
  const [dashboardState, setDashboardState] = useState(initialDashboardState);

  const {
    error: internalError,
    handleError,
    clearError,
    canRetry,
    retryLastOperation
  } = useErrorHandler({
    maxRetries: 3,
    baseRetryDelay: 2000,
    onError: (error) => {
      console.error('Dashboard error:', error);
    },
    onRecovery: () => {
      console.log('Dashboard error recovered');
    }
  });

  const isMountedRef = useRef(true);

  const handleTickerSubmit = useCallback(async (ticker: string) => {
    try {
      clearError();
      setDashboardState(prev => ({
        ...prev,
        tickerSymbol: ticker,
      }));
      
      // Get the goal and timeframe from current state
      const goal = dashboardState.goalSelection || 'investment';
      const timeframe = dashboardState.tradingTimeframe || '1M';
      
      await runAnalysis(ticker, goal, timeframe);
    } catch (error) {
      if (isMountedRef.current) {
        handleError(error, {
          source: 'DashboardPage.handleTickerSubmit',
          ticker,
          operation: 'analysis'
        });
      }
    }
  }, [runAnalysis, clearError, handleError, dashboardState.goalSelection, dashboardState.tradingTimeframe]);

  const handleTickerSelection = useCallback((ticker: string, _companyName: string) => {
    // Trigger existing analysis flow with the selected ticker
    handleTickerSubmit(ticker);
  }, [handleTickerSubmit]);

  const handleCancelAnalysis = useCallback(() => {
    // Cancel the analysis and reset dashboard state
    cancelAnalysis();
    setDashboardState(initialDashboardState);
  }, [cancelAnalysis]);

  const handleGoalSelection = useCallback((goal: InvestmentGoal) => {
    setDashboardState(prev => ({
      ...prev,
      goalSelection: goal.type,
      tradingTimeframe: goal.timeframe || null,
    }));
  }, []);

  const handleNewAnalysis = useCallback(() => {
    // Reset both dashboard state and analysis hook state
    setDashboardState(initialDashboardState);
    resetAnalysis();
    clearError();
  }, [resetAnalysis, clearError]);

  useEffect(() => {
    if (analysisError && isMountedRef.current) {
      handleError(analysisError, {
        source: 'DashboardPage.analysisEffect',
        ticker: dashboardState.tickerSymbol,
        operation: 'analysis'
      });
    }
  }, [analysisError, dashboardState.tickerSymbol, handleError]);

  // Handle analysis completion and use the real analysis verdict
  useEffect(() => {
    if (analysisData && !dashboardState.results) {
      // 🔍 DIAGNOSTIC LOG: Verify the analysis data structure
      console.log('🔍 [DASHBOARD-DIAGNOSTIC] Creating results from analysisData:', {
        hasVerdict: !!analysisData.verdict,
        finalScore: analysisData.verdict?.finalScore,
        recommendation: analysisData.verdict?.recommendation,
        convergenceFactors: analysisData.verdict?.convergenceFactors,
        divergenceFactors: analysisData.verdict?.divergenceFactors
      });

      // Use the actual analysis verdict instead of creating a custom synthesis
      const verdict = analysisData.verdict;
      
      // Map the recommendation format from the analysis service to the UI format
      let uiRecommendation: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
      switch (verdict.recommendation) {
        case 'Strong Buy':
        case 'Buy':
          uiRecommendation = 'BUY';
          break;
        case 'Strong Sell':
        case 'Sell':
          uiRecommendation = 'SELL';
          break;
        case 'Hold':
        default:
          uiRecommendation = 'HOLD';
          break;
      }

      const results: AnalysisResult = {
        synthesisScore: Math.round(verdict.finalScore), // Use the real final score from the analysis
        recommendation: uiRecommendation,
        convergenceFactors: verdict.convergenceFactors || [],
        divergenceFactors: verdict.divergenceFactors || [],
      };

      console.log('🔍 [DASHBOARD-DIAGNOSTIC] Final results object being set to state:', results);

      setDashboardState(prev => ({
        ...prev,
        results
      }));
    }
  }, [analysisData, dashboardState.results]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      clearError();
    };
  }, []);

  const handleRetryAnalysis = useCallback(async () => {
    if (dashboardState.tickerSymbol) {
      await handleTickerSubmit(dashboardState.tickerSymbol);
    } else if (canRetry) {
      retryLastOperation();
    }
  }, [dashboardState.tickerSymbol, handleTickerSubmit, canRetry, retryLastOperation]);

  // State machine logic: Goal selection must come first
  const getCurrentStep = () => {
    const { tickerSymbol, results, goalSelection } = dashboardState;
    if (!goalSelection) return 'goal-selection';
    if (!tickerSymbol) return 'input';
    if (results) return 'results';
    if (analysisLoading) return 'analysis';
    return 'input'; // Fallback seguro
  };
  const currentStep = getCurrentStep();

  const renderStepContent = () => {
    switch (currentStep) {
      case 'goal-selection':
        return (
          <div className="step-content-card">
            <GoalSelection onGoalSelect={handleGoalSelection} loading={false} />
          </div>
        );

      case 'input':
        return (
          <div className="step-content-card">
            <h2>Analyzing for: {dashboardState.goalSelection}</h2>
            <p>Start your comprehensive financial analysis by entering a stock ticker symbol.</p>
            <TickerSearch
              onTickerSelect={handleTickerSelection}
              placeholder="Enter ticker (e.g., AAPL)"
              autoFocus={true}
              disabled={analysisLoading}
            />
          </div>
        );

      case 'analysis':
        return (
          <div className="step-content-card">
            <h2>Analyzing {dashboardState.tickerSymbol}</h2>
            <p>Running comprehensive {dashboardState.goalSelection} analysis with real market data...</p>
            <div className="analysis-loading">
              <div className="analysis-progress">
                <div className="spinner" aria-label="Analysis in progress"></div>
                <div className="progress-info">
                  <p>Running analysis...</p>
                </div>
              </div>
              <button onClick={cancelAnalysis} className="cancel-button">
                Cancel Analysis
              </button>
            </div>
          </div>
        );

      case 'results':
        if (!dashboardState.results) return null;
        return (
          <div className="step-content-card">
            <ResultsView
              results={dashboardState.results}
              onNewAnalysis={handleNewAnalysis}
              analysisData={analysisData}
              ticker={dashboardState.tickerSymbol}
            />
          </div>
        );

      default:
        return <div>Error: Unknown step.</div>;
    }
  };

  const primaryError = analysisError || internalError?.userMessage;
  const hasError = !!primaryError;

  return (
    <div className={`dashboard-page ${analysisLoading ? 'loading' : ''} ${hasError ? 'has-error' : ''}`}>
      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1>Signal-360 Analysis Dashboard</h1>
          <div className="user-info">
            <span>Welcome, {user?.email}</span>
            {analysisLoading && <div className="global-loading-indicator" />}
          </div>
        </header>

        <main className="dashboard-main">
          <div className="step-indicator">
            <div className={`step ${currentStep === 'goal-selection' ? 'active' : ['input', 'analysis', 'results'].includes(currentStep) ? 'completed' : ''}`}>
              1. Goal Selection
            </div>
            <div className={`step ${currentStep === 'input' ? 'active' : ['analysis', 'results'].includes(currentStep) ? 'completed' : ''}`}>
              2. Ticker Input
            </div>
            <div className={`step ${currentStep === 'analysis' ? 'active' : currentStep === 'results' ? 'completed' : ''}`}>
              3. Analysis
            </div>
            <div className={`step ${currentStep === 'results' ? 'active' : ''}`}>
              4. Results
            </div>
          </div>

          <div className="dashboard-content">
            {/* CORRECCIÓN 2: Lógica del Banner de Error Refinada.
                Ahora solo se muestra si hay un error y no estamos en la pantalla de input
                (donde el error se muestra dentro del componente TickerInput). */}
            {hasError && currentStep !== 'input' && (
              <div className="error-banner" role="alert">
                <div className="error-content">
                  <span className="error-icon">⚠️</span>
                  <p>{primaryError}</p>
                  {canRetry && (
                    <button onClick={handleRetryAnalysis} className="retry-button-small">
                      Retry
                    </button>
                  )}
                </div>
              </div>
            )}
            {renderStepContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default DashboardPage;