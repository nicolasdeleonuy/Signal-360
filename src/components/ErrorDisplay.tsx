import React from 'react';
import { ClassifiedError, ErrorRecoveryAction, ErrorSeverity, ErrorType } from '../lib/errorHandler';

// Props interface
interface ErrorDisplayProps {
  error: ClassifiedError;
  actions?: ErrorRecoveryAction[];
  onDismiss?: () => void;
  compact?: boolean;
  showDetails?: boolean;
}

/**
 * User-friendly error display component
 * Shows classified errors with appropriate styling and actions
 */
export function ErrorDisplay({ 
  error, 
  actions = [], 
  onDismiss, 
  compact = false,
  showDetails = false 
}: ErrorDisplayProps) {
  const getSeverityClass = (severity: ErrorSeverity): string => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 'error-critical';
      case ErrorSeverity.HIGH:
        return 'error-high';
      case ErrorSeverity.MEDIUM:
        return 'error-medium';
      case ErrorSeverity.LOW:
        return 'error-low';
      default:
        return 'error-medium';
    }
  };

  const getTypeIcon = (type: ErrorType): string => {
    switch (type) {
      case ErrorType.NETWORK:
        return '🌐';
      case ErrorType.AUTHENTICATION:
        return '🔐';
      case ErrorType.AUTHORIZATION:
        return '🚫';
      case ErrorType.VALIDATION:
        return '⚠️';
      case ErrorType.TIMEOUT:
        return '⏱️';
      case ErrorType.RATE_LIMIT:
        return '🚦';
      case ErrorType.SERVER:
        return '🔧';
      case ErrorType.SERVICE_UNAVAILABLE:
        return '🚧';
      default:
        return '❌';
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (compact) {
    return (
      <div className={`error-display compact ${getSeverityClass(error.severity)}`}>
        <div className="error-content">
          <span className="error-icon">{getTypeIcon(error.type)}</span>
          <span className="error-message">{error.userMessage}</span>
          {onDismiss && (
            <button 
              className="error-dismiss" 
              onClick={onDismiss}
              aria-label="Dismiss error"
            >
              ×
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`error-display ${getSeverityClass(error.severity)}`}>
      <div className="error-header">
        <div className="error-title">
          <span className="error-icon">{getTypeIcon(error.type)}</span>
          <span className="error-type">{error.type.replace('_', ' ')}</span>
        </div>
        <div className="error-meta">
          <span className="error-code">{error.code}</span>
          <span className="error-time">{formatTimestamp(error.timestamp)}</span>
        </div>
      </div>

      <div className="error-body">
        <p className="error-message">{error.userMessage}</p>

        {showDetails && error.details && (
          <details className="error-details">
            <summary>Technical Details</summary>
            <pre className="error-details-content">{error.details}</pre>
          </details>
        )}

        {error.context && Object.keys(error.context).length > 0 && showDetails && (
          <details className="error-context">
            <summary>Context</summary>
            <pre className="error-context-content">
              {JSON.stringify(error.context, null, 2)}
            </pre>
          </details>
        )}
      </div>

      {(actions.length > 0 || onDismiss) && (
        <div className="error-actions">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className={`error-action ${action.primary ? 'primary' : 'secondary'}`}
            >
              {action.label}
            </button>
          ))}
          
          {onDismiss && (
            <button 
              onClick={onDismiss}
              className="error-action secondary"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {error.retryAfter && (
        <div className="error-retry-info">
          <small>
            You can try again in {Math.ceil(error.retryAfter / 1000)} seconds
          </small>
        </div>
      )}
    </div>
  );
}

// Toast-style error notification
export function ErrorToast({ 
  error, 
  onDismiss, 
  autoHide = true, 
  hideDelay = 5000 
}: {
  error: ClassifiedError;
  onDismiss: () => void;
  autoHide?: boolean;
  hideDelay?: number;
}) {
  React.useEffect(() => {
    if (autoHide && error.severity !== ErrorSeverity.CRITICAL) {
      const timer = setTimeout(onDismiss, hideDelay);
      return () => clearTimeout(timer);
    }
  }, [autoHide, hideDelay, onDismiss, error.severity]);

  return (
    <div className={`error-toast ${getSeverityClass(error.severity)}`}>
      <ErrorDisplay 
        error={error} 
        onDismiss={onDismiss} 
        compact={true}
      />
    </div>
  );
}

// Error list component for displaying multiple errors
export function ErrorList({ 
  errors, 
  onDismiss, 
  maxVisible = 3 
}: {
  errors: ClassifiedError[];
  onDismiss: (index: number) => void;
  maxVisible?: number;
}) {
  const visibleErrors = errors.slice(0, maxVisible);
  const hiddenCount = errors.length - maxVisible;

  return (
    <div className="error-list">
      {visibleErrors.map((error, index) => (
        <ErrorDisplay
          key={`${error.code}-${error.timestamp}`}
          error={error}
          onDismiss={() => onDismiss(index)}
          compact={true}
        />
      ))}
      
      {hiddenCount > 0 && (
        <div className="error-list-more">
          +{hiddenCount} more error{hiddenCount > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

// Utility function to get severity class (exported for external use)
export function getSeverityClass(severity: ErrorSeverity): string {
  switch (severity) {
    case ErrorSeverity.CRITICAL:
      return 'error-critical';
    case ErrorSeverity.HIGH:
      return 'error-high';
    case ErrorSeverity.MEDIUM:
      return 'error-medium';
    case ErrorSeverity.LOW:
      return 'error-low';
    default:
      return 'error-medium';
  }
}