import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/auth-context';
import { useSignalAnalysis } from '../hooks/useSignalAnalysis';
import { DashboardState, InvestmentGoalType, AnalysisProgress, InvestmentGoal, AnalysisResult } from '../types/dashboard';
import { TickerInput } from '../components/TickerInput';
import AnalysisProgressComponent from '../components/AnalysisProgress';
import GoalSelection from '../components/GoalSelection';
import { ResultsView } from '../components/ResultsView';

const initialDashboardState: DashboardState = {
  currentStep: 'input',
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
  const { data: analysisData, error: analysisError, isLoading: analysisLoading, runAnalysis } = useSignalAnalysis();
  const [dashboardState, setDashboardState] = useState<DashboardState>(initialDashboardState);

  const createMockProgress = useCallback((overallProgress: number): AnalysisProgress => {
    const now = new Date();
    const completion = new Date(now.getTime() + 5 * 60 * 1000);
    return {
      overall_progress: overallProgress,
      current_stage: overallProgress < 25 ? 'fundamental' : overallProgress < 50 ? 'technical' : overallProgress < 75 ? 'esg' : 'synthesis',
      estimated_completion: completion.toISOString(),
      stages: {
        fundamental: { status: overallProgress >= 25 ? 'completed' : 'running', progress: Math.min(100, Math.max(0, (overallProgress) * 4)), message: 'Analyzing financials...' },
        technical: { status: overallProgress >= 50 ? 'completed' : overallProgress >= 25 ? 'running' : 'pending', progress: Math.min(100, Math.max(0, (overallProgress - 25) * 4)), message: 'Processing trends...' },
        esg: { status: overallProgress >= 75 ? 'completed' : overallProgress >= 50 ? 'running' : 'pending', progress: Math.min(100, Math.max(0, (overallProgress - 50) * 4)), message: 'Evaluating ESG factors...' },
        synthesis: { status: overallProgress >= 100 ? 'completed' : overallProgress >= 75 ? 'running' : 'pending', progress: Math.min(100, Math.max(0, (overallProgress - 75) * 4)), message: 'Combining results...' }
      }
    };
  }, []);

  const handleTickerSubmit = useCallback(async (ticker: string) => {
    // Clear previous state and set to analysis step
    setDashboardState(prev => ({ 
      ...prev, 
      tickerSymbol: ticker, 
      currentStep: 'analysis', 
      loading: false, // We'll use analysisLoading from the hook
      error: null, 
      analysisProgress: createMockProgress(0) 
    }));
    
    // Trigger the real analysis
    await runAnalysis(ticker);
  }, [createMockProgress, runAnalysis]);

  const handleCancelAnalysis = useCallback(() => {
    setDashboardState(prev => ({ ...prev, currentStep: 'input', loading: false, analysisProgress: null, error: null }));
    // Note: The useSignalAnalysis hook doesn't expose a cancel function, 
    // but the state will be reset when a new analysis is started
  }, []);

  const handleGoalSelection = useCallback((goal: InvestmentGoal) => {
    setDashboardState(prev => ({ ...prev, goalSelection: goal.type, tradingTimeframe: goal.timeframe || null, currentStep: 'synthesis', loading: true }));
  }, []);

  const createMockResults = useCallback((goalType: InvestmentGoalType): AnalysisResult => {
    const isInvestment = goalType === 'investment';
    return {
      synthesisScore: isInvestment ? 78 : 65,
      recommendation: isInvestment ? 'BUY' : 'HOLD',
      convergenceFactors: isInvestment ? ['Strong revenue growth', 'Improving profit margins', 'Solid balance sheet'] : ['Recent price breakout', 'High trading volume', 'Positive quarterly earnings'],
      divergenceFactors: isInvestment ? ['High valuation multiples', 'Potential regulatory headwinds', 'Increased competition'] : ['Overbought RSI conditions', 'Potential profit-taking pressure', 'Broader market volatility']
    };
  }, []);

  const handleNewAnalysis = useCallback(() => {
    setDashboardState(initialDashboardState);
    // The useSignalAnalysis hook state will be reset when a new analysis is started
  }, []);

  useEffect(() => {
    if (dashboardState.currentStep === 'analysis' && dashboardState.analysisProgress) {
      const interval = setInterval(() => {
        setDashboardState(prev => {
          if (prev.currentStep !== 'analysis' || !prev.analysisProgress) return prev;
          const newProgress = Math.min(100, prev.analysisProgress.overall_progress + Math.random() * 15);
          if (newProgress >= 100) {
            clearInterval(interval);
            return { ...prev, currentStep: 'goal-selection', loading: false, analysisProgress: createMockProgress(100) };
          }
          return { ...prev, analysisProgress: createMockProgress(newProgress) };
        });
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [dashboardState.currentStep, dashboardState.analysisProgress, createMockProgress]);

  useEffect(() => {
    if (dashboardState.currentStep === 'synthesis' && dashboardState.loading) {
      const timeout = setTimeout(() => {
        setDashboardState(prev => ({ ...prev, currentStep: 'results', loading: false, results: createMockResults(prev.goalSelection || 'investment') }));
      }, 2500);
      return () => clearTimeout(timeout);
    }
  }, [dashboardState.currentStep, dashboardState.loading, createMockResults]);

  // Handle analysis completion and errors from the useSignalAnalysis hook
  useEffect(() => {
    if (dashboardState.currentStep === 'analysis') {
      if (analysisError) {
        // Show error and allow user to retry
        setDashboardState(prev => ({ 
          ...prev, 
          error: { 
            type: 'api' as const,
            message: analysisError,
            recoverable: true
          }, 
          loading: false,
          currentStep: 'input' // Return to input step for retry
        }));
      } else if (analysisData && !analysisLoading) {
        // Analysis completed successfully, move to goal selection
        setDashboardState(prev => ({ 
          ...prev, 
          currentStep: 'goal-selection', 
          loading: false, 
          analysisProgress: createMockProgress(100),
          error: null
        }));
      }
    }
  }, [analysisData, analysisError, analysisLoading, dashboardState.currentStep, createMockProgress]);

  const renderStepContent = () => {
    switch (dashboardState.currentStep) {
      case 'input':
        return (
          <div className="step-content-card">
            <h2>Enter Ticker Symbol</h2>
            <p>Start your comprehensive financial analysis by entering a stock ticker symbol.</p>
            <TickerInput onSubmit={handleTickerSubmit} loading={analysisLoading} error={dashboardState.error?.message || null} placeholder="Enter ticker (e.g., AAPL)" autoFocus={true} />
          </div>
        );
      case 'analysis':
        return (
          <div className="step-content-card">
            <h2>Analyzing {dashboardState.tickerSymbol}</h2>
            <p>Running comprehensive analysis across fundamental, technical, and ESG factors...</p>
            {analysisLoading && dashboardState.analysisProgress && (
              <AnalysisProgressComponent progress={dashboardState.analysisProgress} onCancel={handleCancelAnalysis} />
            )}
            {!analysisLoading && analysisData && (
              <div className="analysis-complete">
                <p>✅ Analysis completed successfully!</p>
                <p>Ready to proceed to goal selection.</p>
              </div>
            )}
          </div>
        );
      case 'goal-selection':
        return <GoalSelection onGoalSelect={handleGoalSelection} loading={dashboardState.loading} />;
      case 'synthesis':
        return (
          <div className="step-content-card">
            <h2>Synthesizing Results</h2>
            <p>Combining analysis results with your investment goal...</p>
            <div className="synthesis-progress-placeholder">
              <div className="spinner"></div>
              <p>Generating final recommendations...</p>
            </div>
          </div>
        );
      case 'results':
        if (!dashboardState.results) return <div className="step-content-card"><h2>Loading Results...</h2></div>;
        return <ResultsView results={dashboardState.results} onNewAnalysis={handleNewAnalysis} />;
      default:
        return null;
    }
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1>Signal-360 Analysis Dashboard</h1>
          <div className="user-info">
            <span>Welcome, {user?.email}</span>
          </div>
        </header>

        <main className="dashboard-main">
          <div className="step-indicator">
            <div className={`step ${dashboardState.currentStep === 'input' ? 'active' : 'completed'}`}>1. Ticker Input</div>
            <div className={`step ${dashboardState.currentStep === 'analysis' ? 'active' : ['goal-selection', 'synthesis', 'results'].includes(dashboardState.currentStep) ? 'completed' : ''}`}>2. Analysis</div>
            <div className={`step ${dashboardState.currentStep === 'goal-selection' ? 'active' : ['synthesis', 'results'].includes(dashboardState.currentStep) ? 'completed' : ''}`}>3. Goal Selection</div>
            <div className={`step ${dashboardState.currentStep === 'synthesis' ? 'active' : dashboardState.currentStep === 'results' ? 'completed' : ''}`}>4. Synthesis</div>
            <div className={`step ${dashboardState.currentStep === 'results' ? 'active' : ''}`}>5. Results</div>
          </div>

          <div className="dashboard-content">
            {dashboardState.error && <div className="error-banner"><p>{dashboardState.error.message}</p></div>}
            {renderStepContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default DashboardPage;