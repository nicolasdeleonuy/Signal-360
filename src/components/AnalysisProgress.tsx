import React, { useEffect, useCallback, useState } from 'react';
import { AnalysisProgress as AnalysisProgressType, AnalysisStageInfo } from '../types/dashboard';

export interface AnalysisProgressProps {
  progress: AnalysisProgressType;
  onCancel?: () => void;
}

const AnalysisProgress: React.FC<AnalysisProgressProps> = ({ progress, onCancel }) => {
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Calculate estimated time remaining
  const calculateTimeRemaining = useCallback(() => {
    if (!progress.estimated_completion) return '';
    
    const now = new Date();
    const completion = new Date(progress.estimated_completion);
    const diff = completion.getTime() - now.getTime();
    
    if (diff <= 0) return 'Completing...';
    
    const minutes = Math.ceil(diff / (1000 * 60));
    if (minutes < 1) return 'Less than 1 minute';
    if (minutes === 1) return '1 minute';
    return `${minutes} minutes`;
  }, [progress.estimated_completion]);

  useEffect(() => {
    setTimeRemaining(calculateTimeRemaining());
    
    // Update time remaining every 30 seconds
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 30000);
    
    return () => clearInterval(interval);
  }, [calculateTimeRemaining]);

  const getStageIcon = (stage: AnalysisStageInfo): string => {
    switch (stage.status) {
      case 'completed':
        return '✅';
      case 'running':
        return '⏳';
      case 'failed':
        return '❌';
      default:
        return '⏸️';
    }
  };

  const getStageStatusText = (stage: AnalysisStageInfo): string => {
    switch (stage.status) {
      case 'completed':
        return 'Completed';
      case 'running':
        return 'In Progress';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Pending';
      default:
        return 'Unknown';
    }
  };

  const getProgressBarColor = (progress: number): string => {
    if (progress >= 100) return '#10b981'; // green-500
    if (progress >= 75) return '#3b82f6'; // blue-500
    if (progress >= 50) return '#f59e0b'; // amber-500
    return '#6b7280'; // gray-500
  };

  const formatDuration = (startTime?: string, endTime?: string): string => {
    if (!startTime) return '';
    
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diff = end.getTime() - start.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="analysis-progress" role="region" aria-label="Analysis Progress">
      {/* Overall Progress Header */}
      <div className="progress-header">
        <div className="progress-title">
          <h2>Analyzing {progress.current_stage}</h2>
          <p className="progress-subtitle">
            {timeRemaining && `Estimated time remaining: ${timeRemaining}`}
          </p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="cancel-button"
            aria-label="Cancel analysis"
            type="button"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Overall Progress Bar */}
      <div className="overall-progress">
        <div className="progress-bar-container">
          <div
            className="progress-bar"
            style={{
              width: `${progress.overall_progress}%`,
              backgroundColor: getProgressBarColor(progress.overall_progress)
            }}
            role="progressbar"
            aria-valuenow={progress.overall_progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Overall progress: ${progress.overall_progress}%`}
          />
        </div>
        <span className="progress-percentage">
          {Math.round(progress.overall_progress)}%
        </span>
      </div>

      {/* Stage Breakdown */}
      <div className="stages-container">
        <h3>Analysis Stages</h3>
        <div className="stages-grid">
          {Object.entries(progress.stages).map(([stageName, stageInfo]) => (
            <div
              key={stageName}
              className={`stage-card ${stageInfo.status}`}
              role="article"
              aria-label={`${stageName} analysis stage`}
            >
              <div className="stage-header">
                <span className="stage-icon" aria-hidden="true">
                  {getStageIcon(stageInfo)}
                </span>
                <div className="stage-info">
                  <h4 className="stage-name">
                    {stageName.charAt(0).toUpperCase() + stageName.slice(1)} Analysis
                  </h4>
                  <span className="stage-status">
                    {getStageStatusText(stageInfo)}
                  </span>
                </div>
              </div>

              {/* Stage Progress Bar */}
              <div className="stage-progress">
                <div className="progress-bar-container small">
                  <div
                    className="progress-bar"
                    style={{
                      width: `${stageInfo.progress}%`,
                      backgroundColor: stageInfo.status === 'failed' 
                        ? '#ef4444' 
                        : getProgressBarColor(stageInfo.progress)
                    }}
                    role="progressbar"
                    aria-valuenow={stageInfo.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${stageName} progress: ${stageInfo.progress}%`}
                  />
                </div>
                <span className="stage-percentage">
                  {Math.round(stageInfo.progress)}%
                </span>
              </div>

              {/* Stage Message */}
              {stageInfo.message && (
                <p className="stage-message">{stageInfo.message}</p>
              )}

              {/* Stage Timing */}
              {stageInfo.started_at && (
                <div className="stage-timing">
                  <small>
                    Duration: {formatDuration(stageInfo.started_at, stageInfo.completed_at)}
                  </small>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Live Region for Screen Readers */}
      <div
        role="status"
        aria-live="polite"
        aria-label="Analysis progress updates"
        className="sr-only"
      >
        {progress.current_stage} analysis is {progress.overall_progress}% complete
      </div>
    </div>
  );
};

export default AnalysisProgress;