import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ClassifiedError, errorHandler, ErrorRecoveryAction } from '../lib/errorHandler';

// Props interface
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: ClassifiedError, actions: ErrorRecoveryAction[]) => ReactNode;
  onError?: (error: ClassifiedError, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

// State interface
interface ErrorBoundaryState {
  hasError: boolean;
  error: ClassifiedError | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Enhanced Error Boundary with comprehensive error handling
 * Uses the centralized error classification system
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Classify the error using our error handler
    const classifiedError = errorHandler.classifyError(error, {
      source: 'ErrorBoundary',
      componentStack: true,
    });

    return {
      hasError: true,
      error: classifiedError,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error
    if (this.state.error) {
      errorHandler.logError(this.state.error);
    }

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Call error callback if provided
    if (this.props.onError && this.state.error) {
      this.props.onError(this.state.error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    // Reset error state if props changed and resetOnPropsChange is true
    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }

    // Reset error state if any reset keys changed
    if (hasError && resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (resetKey, idx) => prevProps.resetKeys![idx] !== resetKey
      );

      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleRetry = () => {
    this.resetErrorBoundary();
    // Force a re-render by updating a key or triggering parent re-render
    window.location.reload();
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      // Get recovery actions
      const recoveryActions = errorHandler.getRecoveryActions(error);

      // Enhance actions with actual implementations
      const enhancedActions = recoveryActions.map(action => ({
        ...action,
        action: () => {
          switch (action.label) {
            case 'Try Again':
              this.handleRetry();
              break;
            case 'Reload Page':
              this.handleReload();
              break;
            case 'Dismiss':
              this.resetErrorBoundary();
              break;
            default:
              action.action();
          }
        },
      }));

      // Use custom fallback if provided
      if (fallback) {
        return fallback(error, enhancedActions);
      }

      // Default error UI
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <h2>Something went wrong</h2>
            <p className="error-message">{error.userMessage}</p>
            
            {error.actionable && (
              <div className="error-actions">
                {enhancedActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    className={`error-action-button ${action.primary ? 'primary' : 'secondary'}`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            {process.env.NODE_ENV === 'development' && (
              <details className="error-details">
                <summary>Error Details (Development)</summary>
                <pre>{error.details}</pre>
                {this.state.errorInfo && (
                  <pre>{this.state.errorInfo.componentStack}</pre>
                )}
              </details>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Hook for imperative error boundary reset
export function useErrorBoundaryReset() {
  const [resetKey, setResetKey] = React.useState(0);

  const reset = React.useCallback(() => {
    setResetKey(prev => prev + 1);
  }, []);

  return { resetKey, reset };
}