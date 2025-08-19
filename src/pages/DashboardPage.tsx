import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/auth-context';
import { DashboardState, InvestmentGoalType, TradingTimeframe, AnalysisProgress, InvestmentGoal, AnalysisResult } from '../types/dashboard';
import { TickerInput } from '../components/TickerInput';
import AnalysisProgressComponent from '../components/AnalysisProgress';
import GoalSelection from '../components/GoalSelection';
import { ResultsView } from '../components/ResultsView';

// Initial dashboard state
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
  const [dashboardState, setDashboardState] = useState<DashboardState>(initialDashboardState);

  // Create mock progress data for demonstration
  const createMockProgress = useCallback((overallProgress: number): AnalysisProgress => {
    const now = new Date();
    const completion = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
    
    return {
      overall_progress: overallProgress,
      current_stage: overallProgress < 25 ? 'fundamental' : 
                    overallProgress < 50 ? 'technical' : 
                    overallProgress < 75 ? 'esg' : 'synthesis',
      estimated_completion: completion.toISOString(),
      stages: {
        fundamental: {
          status: overallProgress >= 25 ? 'completed' : overallProgress >= 0 ? 'running' : 'pending',
          progress: Math.min(100, Math.max(0, (overallProgress - 0) * 4)),
          message: overallProgress >= 25 ? 'Financial analysis completed' : 
                  overallProgress >= 0 ? 'Analyzing financial ratios and metrics...' : 'Waiting to start',
          started_at: overallProgress >= 0 ? now.toISOString() : undefined,
          completed_at: overallProgress >= 25 ? new Date(now.getTime() + 60000).toISOString() : undefined
        },
        technical: {
          status: overallProgress >= 50 ? 'completed' : overallProgress >= 25 ? 'running' : 'pending',
          progress: Math.min(100, Math.max(0, (overallProgress - 25) * 4)),
          message: overallProgress >= 50 ? 'Technical analysis completed' : 
                  overallProgress >= 25 ? 'Processing price trends and indicators...' : 'Waiting to start',
          started_at: overallProgress >= 25 ? new Date(now.getTime() + 60000).toISOString() : undefined,
          completed_at: overallProgress >= 50 ? new Date(now.getTime() + 120000).toISOString() : undefined
        },
        esg: {
          status: overallProgress >= 75 ? 'completed' : overallProgress >= 50 ? 'running' : 'pending',
          progress: Math.min(100, Math.max(0, (overallProgress - 50) * 4)),
          message: overallProgress >= 75 ? 'ESG analysis completed' : 
                  overallProgress >= 50 ? 'Evaluating environmental, social, and governance factors...' : 'Waiting to start',
          started_at: overallProgress >= 50 ? new Date(now.getTime() + 120000).toISOString() : undefined,
          completed_at: overallProgress >= 75 ? new Date(now.getTime() + 180000).toISOString() : undefined
        },
        synthesis: {
          status: overallProgress >= 100 ? 'completed' : overallProgress >= 75 ? 'running' : 'pending',
          progress: Math.min(100, Math.max(0, (overallProgress - 75) * 4)),
          message: overallProgress >= 100 ? 'Synthesis completed' : 
                  overallProgress >= 75 ? 'Combining analysis results...' : 'Waiting to start',
          started_at: overallProgress >= 75 ? new Date(now.getTime() + 180000).toISOString() : undefined,
          completed_at: overallProgress >= 100 ? new Date(now.getTime() + 240000).toISOString() : undefined
        }
      }
    };
  }, []);

  // Handler for ticker submission
  const handleTickerSubmit = useCallback((ticker: string) => {
    setDashboardState(prev => ({
      ...prev,
      tickerSymbol: ticker,
      currentStep: 'analysis',
      loading: true,
      error: null,
      analysisProgress: createMockProgress(0)
    }));
    
    // TODO: Implement analysis API call in next task
    console.log('Starting analysis for ticker:', ticker);
  }, [createMockProgress]);

  // Handler for canceling analysis
  const handleCancelAnalysis = useCallback(() => {
    setDashboardState(prev => ({
      ...prev,
      currentStep: 'input',
      loading: false,
      analysisProgress: null,
      error: null
    }));
    console.log('Analysis cancelled');
  }, []);

  // Handler for goal selection
  const handleGoalSelection = useCallback((goal: InvestmentGoal) => {
    setDashboardState(prev => ({
      ...prev,
      goalSelection: goal.type,
      tradingTimeframe: goal.timeframe || null,
      currentStep: 'synthesis',
      loading: true,
    }));
    
    // TODO: Implement synthesis API call in next task
    console.log('Goal selected:', goal.type, goal.timeframe, goal.description);
  }, []);

  // Create mock results data
  const createMockResults = useCallback((ticker: string, goalType: InvestmentGoalType): AnalysisResult => {
    const isInvestment = goalType === 'investment';
    
    return {
      synthesisScore: isInvestment ? 78 : 65,
      recommendation: isInvestment ? 'BUY' : 'HOLD',
      convergenceFactors: isInvestment ? [
        'Strong revenue growth of 15% year-over-year',
        'Improving profit margins and operational efficiency',
        'Solid balance sheet with low debt-to-equity ratio',
        'Positive ESG ratings with strong governance practices',
        'Technical indicators showing upward momentum'
      ] : [
        'Recent price breakout above key resistance level',
        'High trading volume confirming momentum',
        'Positive short-term technical indicators',
        'Strong quarterly earnings beat expectations'
      ],
      divergenceFactors: isInvestment ? [
        'High valuation multiples compared to industry peers',
        'Potential regulatory headwinds in key markets',
        'Increased competition from emerging players'
      ] : [
        'Overbought conditions on RSI indicator',
        'Potential profit-taking pressure at current levels',
        'Mixed signals from volume analysis',
        'Broader market volatility concerns'
      ]
    };
  }, []);

  // Handler for starting new analysis
  const handleNewAnalysis = useCallback(() => {
    setDashboardState(initialDashboardState);
  }, []);

  // Simulate progress updates during analysis (placeholder for polling mechanism)
  useEffect(() => {
    if (dashboardState.currentStep === 'analysis' && dashboardState.analysisProgress) {
      const interval = setInterval(() => {
        setDashboardState(prev => {
          if (prev.currentStep !== 'analysis' || !prev.analysisProgress) {
            return prev;
          }

          const currentProgress = prev.analysisProgress.overall_progress;
          const newProgress = Math.min(100, currentProgress + Math.random() * 15);
          
          // Move to goal selection when analysis is complete
          if (newProgress >= 100) {
            clearInterval(interval);
            return {
              ...prev,
              currentStep: 'goal-selection',
              loading: false,
              analysisProgress: createMockProgress(100)
            };
          }

          return {
            ...prev,
            analysisProgress: createMockProgress(newProgress)
          };
        });
      }, 2000); // Update every 2 seconds

      return () => clearInterval(interval);
    }
  }, [dashboardState.currentStep, dashboardState.analysisProgress, createMockProgress]);

  // Simulate synthesis completion and transition to results
  useEffect(() => {
    if (dashboardState.currentStep === 'synthesis' && dashboardState.loading) {
      const timeout = setTimeout(() => {
        setDashboardState(prev => ({
          ...prev,
          currentStep: 'results',
          loading: false,
          results: createMockResults(prev.tickerSymbol, prev.goalSelection || 'investment')
        }));
      }, 3000); // 3 seconds for synthesis

      return () => clearTimeout(timeout);
    }
  }, [dashboardState.currentStep, dashboardState.loading, createMockResults]);

  // Render current step content
  const renderStepContent = () => {
    switch (dashboardState.currentStep) {
      case 'input':
        return (
          <div className="step-content">
            <h2>Enter Ticker Symbol</h2>
            <p>Start your comprehensive financial analysis by entering a stock ticker symbol.</p>
            <TickerInput
              onSubmit={handleTickerSubmit}
              loading={dashboardState.loading}
              error={dashboardState.error?.message || null}
              placeholder="Enter ticker (e.g., AAPL)"
              autoFocus={true}
            />
          </div>
        );

      case 'analysis':
        return (
          <div className="step-content">
            <div className="step-header">
              <h2>Analyzing {dashboardState.tickerSymbol}</h2>
              <p>Running comprehensive analysis across fundamental, technical, and ESG factors...</p>
            </div>
            {dashboardState.analysisProgress && (
              <AnalysisProgressComponent
                progress={dashboardState.analysisProgress}
                onCancel={handleCancelAnalysis}
              />
            )}
          </div>
        );

      case 'goal-selection':
        return (
          <div className="step-content">
            <GoalSelection
              onGoalSelect={handleGoalSelection}
              loading={dashboardState.loading}
            />
          </div>
        );

      case 'synthesis':
        return (
          <div className="step-content">
            <h2>Synthesizing Results</h2>
            <p>Combining analysis results with your investment goal...</p>
            {/* TODO: Replace with synthesis progress component */}
            <div className="synthesis-progress-placeholder">
              <div className="spinner"></div>
              <p>Generating final recommendations...</p>
            </div>
          </div>
        );

      case 'results':
        if (!dashboardState.results) {
          return (
            <div className="step-content">
              <h2>Loading Results...</h2>
              <p>Preparing your analysis results...</p>
            </div>
          );
        }
        return (
          <div className="step-content">
            <ResultsView 
              results={dashboardState.results}
              onNewAnalysis={handleNewAnalysis}
            />
          </div>
        );

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
          <div className="dashboard-content">
            {dashboardState.error && (
              <div className="error-banner">
                <p>{dashboardState.error.message}</p>
                {dashboardState.error.recoverable && (
                  <button onClick={() => setDashboardState(prev => ({ ...prev, error: null }))}>
                    Dismiss
                  </button>
                )}
              </div>
            )}

            <div className="step-indicator">
              <div className={`step ${dashboardState.currentStep === 'input' ? 'active' : 'completed'}`}>
                1. Ticker Input
              </div>
              <div className={`step ${dashboardState.currentStep === 'analysis' ? 'active' : dashboardState.currentStep === 'goal-selection' || dashboardState.currentStep === 'synthesis' || dashboardState.currentStep === 'results' ? 'completed' : ''}`}>
                2. Analysis
              </div>
              <div className={`step ${dashboardState.currentStep === 'goal-selection' ? 'active' : dashboardState.currentStep === 'synthesis' || dashboardState.currentStep === 'results' ? 'completed' : ''}`}>
                3. Goal Selection
              </div>
              <div className={`step ${dashboardState.currentStep === 'synthesis' ? 'active' : dashboardState.currentStep === 'results' ? 'completed' : ''}`}>
                4. Synthesis
              </div>
              <div className={`step ${dashboardState.currentStep === 'results' ? 'active' : ''}`}>
                5. Results
              </div>
            </div>

            {renderStepContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default DashboardPage;