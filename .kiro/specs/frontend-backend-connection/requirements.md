# Requirements Document

## Introduction

This feature establishes the connection between the React frontend and the Supabase Edge Function 'signal-360-analysis'. The implementation will create a reusable custom hook that encapsulates the API call and its state management (loading, data, error), and integrate this hook into the main Dashboard component to enable users to trigger stock analysis on demand.

## Requirements

### Requirement 1

**User Story:** As a user, I want to trigger stock analysis from the dashboard interface, so that I can get comprehensive analysis results for any ticker symbol.

#### Acceptance Criteria

1. WHEN the user clicks an "Analyze" button THEN the system SHALL invoke the signal-360-analysis Edge Function with the provided ticker
2. WHEN the analysis is triggered THEN the system SHALL display a loading state to indicate processing is in progress
3. WHEN the analysis completes successfully THEN the system SHALL display the results in the ResultsView component
4. WHEN the analysis fails THEN the system SHALL display a user-friendly error message
5. WHEN a new analysis is started THEN the system SHALL clear any previous results and error states

### Requirement 2

**User Story:** As a developer, I want a reusable custom hook for analysis functionality, so that the API logic can be easily maintained and reused across components.

#### Acceptance Criteria

1. WHEN the useSignalAnalysis hook is created THEN it SHALL be located at src/hooks/useSignalAnalysis.ts
2. WHEN the hook is initialized THEN it SHALL expose data, error, isLoading states and runAnalysis function
3. WHEN runAnalysis is called with a ticker THEN it SHALL set isLoading to true and clear previous error states
4. WHEN the API call succeeds THEN it SHALL update the data state and set isLoading to false
5. WHEN the API call fails THEN it SHALL update the error state with a user-friendly message and set isLoading to false
6. WHEN the hook is used THEN it SHALL NOT automatically fetch data on component mount

### Requirement 3

**User Story:** As a user, I want the dashboard to integrate seamlessly with the analysis functionality, so that I can easily input tickers and view results in one interface.

#### Acceptance Criteria

1. WHEN the DashboardPage loads THEN it SHALL import and initialize the useSignalAnalysis hook
2. WHEN the user enters a ticker and clicks analyze THEN the system SHALL pass the ticker value to the runAnalysis function
3. WHEN isLoading is true THEN the system SHALL display the AnalysisProgress component
4. WHEN error state contains a message THEN the system SHALL display an alert with the error information
5. WHEN data state contains results THEN the system SHALL display the ResultsView component with the analysis data
6. WHEN no analysis is running and no results exist THEN the system SHALL display the TickerInput component

### Requirement 4

**User Story:** As a user, I want proper error handling and user feedback, so that I understand what's happening during the analysis process and can recover from any issues.

#### Acceptance Criteria

1. WHEN a network error occurs THEN the system SHALL display a meaningful error message indicating connectivity issues
2. WHEN the Edge Function returns an error THEN the system SHALL display the specific error message from the function
3. WHEN an unexpected error occurs THEN the system SHALL display a generic "unexpected error" message
4. WHEN an error is displayed THEN the user SHALL be able to retry the analysis
5. WHEN the analysis is retried THEN the system SHALL clear the previous error state before starting