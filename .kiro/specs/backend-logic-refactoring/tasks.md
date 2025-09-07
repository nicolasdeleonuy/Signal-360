# Implementation Plan

- [x] 1. Enhance SynthesisEngine with trade parameters calculation logic
  - Move all trade parameters calculation methods from the standalone Edge Function into the SynthesisEngine class
  - Update the SynthesisOutput interface to include comprehensive trade parameters data
  - Integrate trade parameters calculation into the main synthesis workflow
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 1.1 Add TradeParametersCalculator class methods to SynthesisEngine
  - Copy the complete TradeParametersCalculator class from `supabase/functions/trade-parameters/index.ts` into the SynthesisEngine class
  - Adapt method signatures to work within the SynthesisEngine context
  - Ensure all private helper methods are properly integrated
  - _Requirements: 1.1, 1.2_

- [x] 1.2 Update SynthesisOutput interface to include trade parameters
  - Modify the SynthesisOutput interface in `supabase/functions/_shared/types.ts` to include the complete trade_parameters object
  - Ensure the interface matches the TradeParametersOutput structure from the original function
  - Update any dependent interfaces that reference SynthesisOutput
  - _Requirements: 1.1, 1.3_

- [x] 1.3 Integrate trade parameters calculation into synthesis workflow
  - Modify the main `synthesize` method in SynthesisEngine to call trade parameters calculation
  - Pass the necessary technical analysis data and synthesis score to the calculation methods
  - Include trade parameters in the returned SynthesisOutput object
  - _Requirements: 1.1, 1.3, 1.4_

- [x] 2. Add inline response formatting logic to main orchestrator
  - Move all response formatting logic from standalone Edge Function and shared utility into the signal-360-analysis orchestrator
  - Create inline functions for all formatting operations
  - Remove dependencies on external response formatting functions
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 2.1 Create inline response formatting functions in orchestrator
  - Copy the ResponseFormatter class methods from `supabase/functions/response-formatter/index.ts` as inline functions
  - Copy utility functions from `supabase/functions/_shared/response-formatter.ts` as inline functions
  - Adapt function signatures to work within the orchestrator context
  - _Requirements: 2.1, 2.2_

- [x] 2.2 Implement formatAnalysisResponse function inline
  - Create the main `formatAnalysisResponse` function within the orchestrator file
  - Include all sub-formatting functions (generateRecommendation, formatFactorsAsStrings, etc.)
  - Ensure the function produces identical output to the original response formatter
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 2.3 Add response schema validation inline
  - Copy the `validateResponseSchema` function from the shared utility
  - Integrate schema validation into the inline response formatting workflow
  - Maintain the same validation rules and error handling
  - _Requirements: 2.2, 2.4_

- [x] 3. Update main orchestrator to use consolidated logic
  - Modify the signal-360-analysis orchestrator to call SynthesisEngine methods directly for trade parameters
  - Update the orchestrator to use inline response formatting instead of external Edge Functions
  - Remove all calls to the standalone trade-parameters and response-formatter Edge Functions
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3.1 Remove TradeParametersCalculator class from orchestrator
  - Delete the existing TradeParametersCalculator class from `supabase/functions/signal-360-analysis/index.ts`
  - Remove the `calculateTradeParameters` method calls that use the local class
  - Update the synthesis workflow to get trade parameters from SynthesisEngine output
  - _Requirements: 3.1, 3.3_

- [x] 3.2 Remove ResponseFormatter class from orchestrator
  - Delete the existing ResponseFormatter class from the orchestrator file
  - Remove calls to `ResponseFormatter.formatResponse` method
  - Update the response generation to use the new inline formatting functions
  - _Requirements: 3.2, 3.3_

- [x] 3.3 Update synthesis workflow integration
  - Modify the orchestrator to extract trade parameters directly from SynthesisEngine output
  - Update the response formatting to use the inline functions with synthesis results
  - Ensure the complete workflow produces identical results to the original system
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. Remove obsolete files and directories
  - Delete the standalone trade-parameters Edge Function directory
  - Delete the standalone response-formatter Edge Function directory
  - Delete the shared response-formatter utility file
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 4.1 Delete trade-parameters Edge Function
  - Remove the entire `supabase/functions/trade-parameters` directory and all its contents
  - Verify no other files reference or import from this directory
  - Update any deployment configurations that reference this function
  - _Requirements: 5.1_

- [x] 4.2 Delete response-formatter Edge Function
  - Remove the entire `supabase/functions/response-formatter` directory and all its contents
  - Verify no other files reference or import from this directory
  - Update any deployment configurations that reference this function
  - _Requirements: 5.2_

- [x] 4.3 Delete shared response-formatter utility
  - Remove the `supabase/functions/_shared/response-formatter.ts` file
  - Update the `supabase/functions/_shared/index.ts` file to remove exports of deleted functions
  - Verify no other files import from the deleted utility
  - _Requirements: 5.3_

- [-] 5. Run comprehensive validation tests
  - Execute the final validation test suite to ensure all changes are non-breaking
  - Verify that the refactored system produces identical API responses
  - Confirm that performance is equal to or better than the original system
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 5.1 Execute final validation test suite
  - Run the `supabase/functions/test-suite/execute-final-validation.ts` script
  - Verify that all tests pass with 100% success rate
  - Document any test failures and resolve them before proceeding
  - _Requirements: 4.1, 4.2_

- [ ] 5.2 Perform API response comparison testing
  - Test the refactored system with various ticker symbols and contexts
  - Compare responses with the original system to ensure identical output
  - Verify that all response fields match exactly including data types and formats
  - _Requirements: 4.1, 4.2, 4.4_

- [ ] 5.3 Conduct performance validation testing
  - Measure response times for the refactored system
  - Compare performance metrics with the original system
  - Ensure that consolidation has not negatively impacted performance
  - _Requirements: 4.3, 4.4_