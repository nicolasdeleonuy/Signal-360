import { useState } from 'react';
import { InvestmentGoal, InvestmentGoalType, TradingTimeframe } from '../types/dashboard';

export interface GoalSelectionProps {
  onGoalSelect: (goal: InvestmentGoal) => void;
  loading: boolean;
}

const GoalSelection: React.FC<GoalSelectionProps> = ({ onGoalSelect, loading }) => {
  const [selectedGoal, setSelectedGoal] = useState<InvestmentGoalType | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<TradingTimeframe | null>(null);

  const timeframeOptions: { value: TradingTimeframe; label: string; description: string }[] = [
    { value: '1D', label: '1 Day', description: 'Intraday trading' },
    { value: '1W', label: '1 Week', description: 'Short-term swing trading' },
    { value: '1M', label: '1 Month', description: 'Medium-term position trading' },
    { value: '3M', label: '3 Months', description: 'Quarterly position trading' },
    { value: '6M', label: '6 Months', description: 'Semi-annual trading' },
    { value: '1Y', label: '1 Year', description: 'Long-term trading' }
  ];

  const handleGoalSelection = (goalType: InvestmentGoalType) => {
    setSelectedGoal(goalType);

    if (goalType === 'investment') {
      // For investment, no timeframe needed - submit immediately
      const goal: InvestmentGoal = {
        type: 'investment',
        description: 'Long-term investment focused on fundamental analysis and company growth potential'
      };
      onGoalSelect(goal);
    }
    // For trading, wait for timeframe selection
  };

  const handleTimeframeSelection = (timeframe: TradingTimeframe) => {
    setSelectedTimeframe(timeframe);

    if (selectedGoal === 'trading') {
      const goal: InvestmentGoal = {
        type: 'trading',
        timeframe,
        description: `Short-term trading with ${timeframe} timeframe, emphasizing technical analysis and market timing`
      };
      onGoalSelect(goal);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

  return (
    <div className="goal-selection" role="region" aria-label="Investment Goal Selection">
      <div className="goal-selection-header">
        <h2>Select Your Investment Goal</h2>
        <p className="goal-selection-subtitle">
          Choose your investment strategy to get appropriately weighted recommendations
        </p>
      </div>

      <div className="goal-options">
        {/* Long-term Investment Option */}
        <div
          className={`goal-card ${selectedGoal === 'investment' ? 'selected' : ''} ${loading ? 'disabled' : ''}`}
          onClick={() => !loading && handleGoalSelection('investment')}
          onKeyDown={(e) => handleKeyDown(e, () => handleGoalSelection('investment'))}
          tabIndex={loading ? -1 : 0}
          role="button"
          aria-label="Select long-term investment strategy"
          aria-pressed={selectedGoal === 'investment'}
        >
          <div className="goal-icon">
            📈
          </div>
          <div className="goal-content">
            <h3>Long-term Investment</h3>
            <p className="goal-description">
              Focus on fundamental analysis, company financials, and long-term growth potential.
              Ideal for building wealth over years.
            </p>
            <div className="goal-features">
              <span className="feature-tag">Fundamental Analysis</span>
              <span className="feature-tag">ESG Factors</span>
              <span className="feature-tag">Growth Potential</span>
            </div>
          </div>
          <div className="goal-tooltip" role="tooltip">
            <strong>Analysis Weighting:</strong> 60% Fundamental, 20% Technical, 20% ESG
          </div>
        </div>

        {/* Short-term Trading Option */}
        <div
          className={`goal-card ${selectedGoal === 'trading' ? 'selected' : ''} ${loading ? 'disabled' : ''}`}
          onClick={() => !loading && handleGoalSelection('trading')}
          onKeyDown={(e) => handleKeyDown(e, () => handleGoalSelection('trading'))}
          tabIndex={loading ? -1 : 0}
          role="button"
          aria-label="Select short-term trading strategy"
          aria-pressed={selectedGoal === 'trading'}
        >
          <div className="goal-icon">
            ⚡
          </div>
          <div className="goal-content">
            <h3>Short-term Trading</h3>
            <p className="goal-description">
              Emphasize technical analysis, price patterns, and market timing.
              Perfect for active trading and quick profits.
            </p>
            <div className="goal-features">
              <span className="feature-tag">Technical Analysis</span>
              <span className="feature-tag">Price Patterns</span>
              <span className="feature-tag">Market Timing</span>
            </div>
          </div>
          <div className="goal-tooltip" role="tooltip">
            <strong>Analysis Weighting:</strong> 70% Technical, 25% Fundamental, 5% ESG
          </div>
        </div>
      </div>

      {/* Timeframe Selection for Trading */}
      {selectedGoal === 'trading' && (
        <div className="timeframe-selection" role="region" aria-label="Trading Timeframe Selection">
          <h3>Select Trading Timeframe</h3>
          <p className="timeframe-subtitle">
            Choose your preferred trading horizon to optimize the analysis
          </p>

          <div className="timeframe-grid">
            {timeframeOptions.map((option) => (
              <div
                key={option.value}
                className={`timeframe-card ${selectedTimeframe === option.value ? 'selected' : ''} ${loading ? 'disabled' : ''}`}
                onClick={() => !loading && handleTimeframeSelection(option.value)}
                onKeyDown={(e) => handleKeyDown(e, () => handleTimeframeSelection(option.value))}
                tabIndex={loading ? -1 : 0}
                role="button"
                aria-label={`Select ${option.label} timeframe for ${option.description}`}
                aria-pressed={selectedTimeframe === option.value}
              >
                <div className="timeframe-label">{option.label}</div>
                <div className="timeframe-description">{option.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="goal-loading" role="status" aria-label="Processing goal selection">
          <div className="loading-spinner"></div>
          <p>Processing your selection...</p>
        </div>
      )}

      {/* Live region for screen readers */}
      <div
        role="status"
        aria-live="polite"
        aria-label="Goal selection updates"
        className="sr-only"
      >
        {selectedGoal === 'investment' && 'Long-term investment goal selected'}
        {selectedGoal === 'trading' && !selectedTimeframe && 'Trading goal selected, please choose timeframe'}
        {selectedGoal === 'trading' && selectedTimeframe && `Trading goal selected with ${selectedTimeframe} timeframe`}
      </div>
    </div>
  );
};

export default GoalSelection;