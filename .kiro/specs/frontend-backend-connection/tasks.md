# Implementation Plan

- [x] 1. Create the useSignalAnalysis custom hook
  - Create the hook file at `src/hooks/useSignalAnalysis.ts` with proper TypeScript interfaces
  - Implement state management for data, error, and isLoading states using useState
  - Create the runAnalysis async function that calls the Supabase Edge Function
  - Add proper error handling with user-friendly error messages
  - Ensure the hook imports the Supabase client from the correct path
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 2. Create unit tests for the useSignalAnalysis hook
  - Create test file at `src/hooks/__tests__/useSignalAnalysis.test.ts`
  - Write tests for initial state, loading state transitions, success scenarios, and error handling
  - Mock the Supabase client and Edge Function responses
  - Test state reset functionality when new analysis is triggered
  - Verify proper error message formatting for different error types
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 3. Integrate the hook into DashboardPage component
  - Import and initialize the useSignalAnalysis hook in `src/pages/DashboardPage.tsx`
  - Connect the runAnalysis function to the existing analyze button in TickerInput component
  - Replace the mock handleTickerSubmit logic with real API call using runAnalysis
  - Maintain the existing component structure and step-based navigation
  - _Requirements: 3.1, 3.2_

- [ ] 4. Update DashboardPage UI state management
  - Modify the dashboard state to use real loading, error, and data states from the hook
  - Update the renderStepContent function to handle real API responses
  - Replace mock progress simulation with real loading states from useSignalAnalysis
  - Ensure proper error display when API calls fail
  - _Requirements: 3.3, 3.4, 3.5, 3.6_

- [ ] 5. Implement proper error handling in the UI
  - Update error display logic to show user-friendly messages from the hook
  - Add retry functionality for failed analysis requests
  - Ensure error states are properly cleared when new analysis starts
  - Handle different error types (authentication, validation, network) with appropriate messages
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 6. Create integration tests for the complete flow
  - Create test file at `src/pages/__tests__/DashboardPage-signal-analysis.test.tsx`
  - Write end-to-end tests for the complete analysis flow from input to results
  - Test error scenarios and proper error message display
  - Verify loading states are shown during API calls
  - Test that results are properly displayed when analysis completes
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 7. Update TypeScript interfaces for analysis data
  - Add or update interfaces in `src/types/dashboard.ts` for the Edge Function response format
  - Ensure proper typing for the analysis response data structure
  - Add interfaces for error responses and validation errors
  - Update existing AnalysisResult interface to match real API response structure
  - _Requirements: 2.1, 2.4_

- [ ] 8. Remove mock analysis logic and finalize integration
  - Remove mock progress simulation and data generation from DashboardPage
  - Clean up unused mock functions (createMockProgress, createMockResults)
  - Remove mock intervals and timeouts that simulate analysis progress
  - Ensure the component only uses real API data and states
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_