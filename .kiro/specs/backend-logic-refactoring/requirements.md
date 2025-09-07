# Requirements Document

## Introduction

This specification addresses the consolidation of redundant backend logic in the Signal-360 analysis system. The current architecture has duplicate functionality across multiple Edge Functions and shared utilities, creating maintenance overhead and potential inconsistencies. This refactoring will establish a single source of truth for trade parameters calculation and response formatting logic.

## Requirements

### Requirement 1

**User Story:** As a developer maintaining the Signal-360 backend, I want trade parameters logic consolidated into the SynthesisEngine, so that there is a single source of truth for all calculation logic.

#### Acceptance Criteria

1. WHEN the system needs to calculate trade parameters THEN it SHALL use the SynthesisEngine class methods directly
2. WHEN the standalone trade-parameters Edge Function is removed THEN the system SHALL maintain 100% functional compatibility
3. WHEN trade parameters are calculated THEN they SHALL be computed using the same algorithms as before consolidation
4. IF the SynthesisEngine is called for trade parameters THEN it SHALL return the same data structure as the original function

### Requirement 2

**User Story:** As a developer maintaining the Signal-360 backend, I want response formatting logic consolidated into the main orchestrator, so that formatting is handled in one place without separate Edge Functions.

#### Acceptance Criteria

1. WHEN the system needs to format analysis responses THEN it SHALL use inline formatting logic in the signal-360-analysis function
2. WHEN the standalone response-formatter Edge Function is removed THEN the system SHALL maintain identical response formats
3. WHEN the shared response-formatter utility is removed THEN no other functions SHALL be affected
4. IF response formatting is needed THEN it SHALL be performed directly within the orchestrator function

### Requirement 3

**User Story:** As a developer maintaining the Signal-360 backend, I want the main orchestrator updated to use consolidated logic, so that it no longer depends on the removed Edge Functions.

#### Acceptance Criteria

1. WHEN the signal-360-analysis function executes THEN it SHALL call consolidated logic directly without invoking separate Edge Functions
2. WHEN trade parameters are needed THEN the orchestrator SHALL call SynthesisEngine methods directly
3. WHEN response formatting is needed THEN the orchestrator SHALL use inline formatting code
4. IF the orchestrator completes successfully THEN it SHALL produce identical results to the pre-refactoring system

### Requirement 4

**User Story:** As a developer maintaining the Signal-360 backend, I want validation tests to confirm non-breaking changes, so that I can be confident the refactoring maintains system functionality.

#### Acceptance Criteria

1. WHEN the refactoring is complete THEN the execute-final-validation.ts test suite SHALL pass 100%
2. WHEN validation tests run THEN they SHALL verify identical API responses before and after refactoring
3. WHEN the system processes analysis requests THEN performance SHALL be equal to or better than before refactoring
4. IF any validation test fails THEN the refactoring SHALL be considered incomplete

### Requirement 5

**User Story:** As a developer maintaining the Signal-360 backend, I want obsolete files and directories removed, so that the codebase is clean and maintainable.

#### Acceptance Criteria

1. WHEN refactoring is complete THEN the supabase/functions/trade-parameters directory SHALL be deleted
2. WHEN refactoring is complete THEN the supabase/functions/response-formatter directory SHALL be deleted
3. WHEN refactoring is complete THEN the supabase/functions/_shared/response-formatter.ts file SHALL be deleted
4. IF any file references the deleted functions THEN those references SHALL be updated to use the consolidated logic