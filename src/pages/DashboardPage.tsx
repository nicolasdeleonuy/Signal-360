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
    progress: analysisProgress,
    jobId,
    runAnalysis,
    cancelAnalysis
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
      setDashboardState({
        ...initialDashboardState,
        tickerSymbol: ticker,
      });
      await runAnalysis(ticker);
    } catch (error) {
      if (isMountedRef.current) {
        handleError(error, {
          source: 'DashboardPage.handleTickerSubmit',
          ticker,
          operation: 'analysis'
        });
      }
    }
  }, [runAnalysis, clearError, handleError]);

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
    if (!analysisData) return;

    let synthesisScore = 50;
    const convergenceFactors: string[] = [];
    const divergenceFactors: string[] = [];

    if (analysisData.data?.fundamental) {
      const fundamental = analysisData.data.fundamental;
      if ((fundamental as any).growthMetrics?.revenueGrowth > 0.10) {
        synthesisScore += 10;
        convergenceFactors.push("Strong revenue growth (> 10%)");
      }
      if ((fundamental as any).financialRatios?.debtToEquity < 0.5) {
        synthesisScore += 10;
        convergenceFactors.push("Healthy debt-to-equity ratio (< 0.5)");
      }
      if ((fundamental as any).financialRatios?.peRatio > 30) {
        synthesisScore -= 10;
        divergenceFactors.push("High valuation (P/E Ratio > 30)");
      }
    }
    if (analysisData.data?.technical) {
      const technical = analysisData.data.technical;
      if ((technical as any).trendIndicators?.sma50 > (technical as any).trendIndicators?.sma200) {
        synthesisScore += 10;
        convergenceFactors.push("Positive long-term trend (50-day SMA > 200-day SMA)");
      }
      if ((technical as any).momentumIndicators?.rsi > 70) {
        synthesisScore -= 10;
        divergenceFactors.push("Asset may be overbought (RSI > 70)");
      }
      if ((technical as any).momentumIndicators?.rsi < 30) {
        synthesisScore += 10;
        convergenceFactors.push("Asset may be oversold (RSI < 30)");
      }
    }
    if (analysisData.data?.esg) {
      const esg = analysisData.data.esg;
      if ((esg as any).overallESGScore > 70) {
        synthesisScore += 10;
        convergenceFactors.push("Strong ESG rating (> 70)");
      }
    }
    if (analysisData.partial && analysisData.failedAnalyses) {
      analysisData.failedAnalyses.forEach(failed => {
        synthesisScore -= 5;
        divergenceFactors.push(`${failed} analysis failed`);
      });
    }

    let recommendation: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    if (synthesisScore >= 70) recommendation = 'BUY';
    else if (synthesisScore < 40) recommendation = 'SELL';

    const results: AnalysisResult = {
      synthesisScore,
      recommendation,
      convergenceFactors,
      divergenceFactors
    };

    setDashboardState(prev => ({
      ...prev,
      goalSelection: goal.type,
      tradingTimeframe: goal.timeframe || null,
      results
    }));
  }, [analysisData]);

  const handleNewAnalysis = useCallback(() => {
    // `handleCancelAnalysis` ya tiene la lógica correcta para resetear.
    handleCancelAnalysis();
  }, [handleCancelAnalysis]);

  useEffect(() => {
    if (analysisError && isMountedRef.current) {
      handleError(analysisError, {
        source: 'DashboardPage.analysisEffect',
        ticker: dashboardState.tickerSymbol,
        operation: 'analysis'
      });
    }
  }, [analysisError, dashboardState.tickerSymbol]);

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

  // CORRECCIÓN 1: Lógica de Estado Derivado Refinada.
  // La ausencia de un `tickerSymbol` ahora tiene la máxima prioridad
  // para asegurar que el reinicio siempre lleve a la pantalla de 'input'.
  const getCurrentStep = () => {
    const { tickerSymbol, results, goalSelection } = dashboardState;
    if (!tickerSymbol) return 'input';
    if (results) return 'results';
    if (goalSelection) return 'results'; // Si hay objetivo, vamos a los resultados
    if (analysisData) return 'goal-selection';
    if (analysisLoading) return 'analysis';
    return 'input'; // Fallback seguro
  };
  const currentStep = getCurrentStep();

  const renderStepContent = () => {

    switch (currentStep) {
      case 'input':
        return (
          <div className="step-content-card">
            <h2>Enter Ticker Symbol</h2>
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
            <p>Running comprehensive fundamental analysis with real market data...</p>
            <div className="analysis-loading">
              <div className="analysis-progress">
                <div className="spinner" aria-label="Analysis in progress"></div>
                <div className="progress-info">
                  {analysisProgress && (
                    <>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${analysisProgress.progress}%` }}
                        ></div>
                      </div>
                      <p className="progress-text">
                        {analysisProgress.currentPhase} ({analysisProgress.progress}%)
                      </p>
                      {jobId && (
                        <p className="job-id">Job ID: {jobId}</p>
                      )}
                    </>
                  )}
                  {!analysisProgress && (
                    <p>Starting analysis...</p>
                  )}
                </div>
              </div>
              <button onClick={cancelAnalysis} className="cancel-button">
                Cancel Analysis
              </button>
            </div>
          </div>
        );

      case 'goal-selection':
        return (
          <div className="step-content-card">
            <GoalSelection onGoalSelect={handleGoalSelection} loading={false} />
            <div className="analysis-summary">
              <h3>Analysis Summary for {dashboardState.tickerSymbol}</h3>
              <p>✅ Analysis completed at {new Date().toLocaleTimeString()}</p>
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
            <div className={`step ${currentStep === 'input' ? 'active' : 'completed'}`}>
              1. Ticker Input
            </div>
            <div className={`step ${currentStep === 'analysis' ? 'active' : ['goal-selection', 'results'].includes(currentStep) ? 'completed' : ''}`}>
              2. Analysis
            </div>
            <div className={`step ${currentStep === 'goal-selection' ? 'active' : currentStep === 'results' ? 'completed' : ''}`}>
              3. Goal Selection
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