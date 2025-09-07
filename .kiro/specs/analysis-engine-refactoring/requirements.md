# Requirements Document

## Introduction

This specification outlines the requirements for refactoring our financial analysis system from a monolithic approach into a centralized, modular, and high-performance analysis engine. The new analysis-engine will replace the current signal-360-analysis function with a more maintainable, scalable, and resilient architecture that separates concerns into distinct, specialized engines while maintaining performance through parallel execution.

## Requirements

### Requirement 1

**User Story:** As a developer, I want to replace the monolithic signal-360-analysis function with a modular analysis-engine, so that the codebase becomes more maintainable and scalable.

#### Acceptance Criteria

1. WHEN the analysis-engine is implemented THEN the system SHALL completely replace the existing signal-360-analysis function
2. WHEN the new architecture is deployed THEN the system SHALL maintain the same API contract as the current implementation
3. WHEN code changes are needed THEN developers SHALL be able to modify individual engines without affecting others

### Requirement 2

**User Story:** As a system architect, I want the analysis-engine to be composed of distinct modular components, so that each analysis type can be developed and maintained independently.

#### Acceptance Criteria

1. WHEN the analysis-engine is structured THEN the system SHALL contain an AnalysisOrchestrator as the main entry point
2. WHEN the analysis-engine is structured THEN the system SHALL contain a FundamentalEngine for fundamental analysis
3. WHEN the analysis-engine is structured THEN the system SHALL contain a TechnicalEngine for technical chart analysis
4. WHEN the analysis-engine is structured THEN the system SHALL contain an EcoEngine for sentiment and news analysis
5. WHEN the analysis-engine is structured THEN the system SHALL contain a SynthesisEngine for final verdict generation
6. WHEN any engine is modified THEN other engines SHALL remain unaffected

### Requirement 3

**User Story:** As a performance-conscious user, I want the analysis engines to run in parallel, so that analysis results are delivered with minimal latency.

#### Acceptance Criteria

1. WHEN the AnalysisOrchestrator executes analysis THEN the system SHALL run FundamentalEngine, TechnicalEngine, and EcoEngine in parallel
2. WHEN parallel execution is implemented THEN the system SHALL use Promise.allSettled or equivalent mechanism
3. WHEN parallel execution completes THEN the system SHALL proceed to synthesis without unnecessary delays

### Requirement 4

**User Story:** As a system operator, I want the analysis-engine to be resilient to individual engine failures, so that partial results can still provide value to users.

#### Acceptance Criteria

1. WHEN any individual engine fails THEN the orchestrator SHALL continue processing with successful results
2. WHEN an engine fails THEN the system SHALL provide neutral/default data for the failed engine
3. WHEN engine failures occur THEN the synthesis SHALL proceed with available data
4. WHEN failures are handled THEN the system SHALL log appropriate error information

### Requirement 5

**User Story:** As a developer, I want the FundamentalEngine to provide real data-fetching capabilities from day one, so that fundamental analysis functionality is immediately available.

#### Acceptance Criteria

1. WHEN the FundamentalEngine is implemented THEN it SHALL migrate and refactor logic from the existing EnhancedGoogleApiClient class
2. WHEN the FundamentalEngine is implemented THEN it SHALL fetch real financial data from external APIs
3. WHEN the FundamentalEngine processes a request THEN it SHALL return structured AnalysisResult data
4. WHEN the FundamentalEngine encounters errors THEN it SHALL handle them gracefully and return appropriate error states

### Requirement 6

**User Story:** As a developer, I want the TechnicalEngine and EcoEngine to be implemented as structured placeholders initially, so that the architecture can be validated while detailed implementations are developed later.

#### Acceptance Criteria

1. WHEN the TechnicalEngine is implemented THEN it SHALL return valid, structured AnalysisResult data
2. WHEN the EcoEngine is implemented THEN it SHALL return valid, structured AnalysisResult data
3. WHEN placeholder engines are called THEN they SHALL simulate realistic response times and data structures
4. WHEN placeholder engines are implemented THEN they SHALL be easily replaceable with real implementations

### Requirement 7

**User Story:** As a user, I want the SynthesisEngine to intelligently weigh different analysis types based on my investment context, so that I receive contextually relevant recommendations.

#### Acceptance Criteria

1. WHEN the SynthesisEngine receives analysis results THEN it SHALL weigh scores based on analysis context (investment vs trading)
2. WHEN the context is "investment" THEN the system SHALL prioritize fundamental and ESG analysis
3. WHEN the context is "trading" THEN the system SHALL prioritize technical analysis
4. WHEN synthesis is complete THEN the system SHALL generate a final verdict with clear reasoning

### Requirement 8

**User Story:** As a developer, I want all shared interfaces and types centralized in a types.ts file, so that type consistency is maintained across all engines.

#### Acceptance Criteria

1. WHEN the analysis-engine is structured THEN the system SHALL contain a central types.ts file
2. WHEN types.ts is created THEN it SHALL contain AnalysisResult interface for individual engine outputs
3. WHEN types.ts is created THEN it SHALL contain SynthesisResult interface for final outputs
4. WHEN types.ts is created THEN it SHALL contain all data-related interfaces migrated from googleApiService.ts
5. WHEN any engine uses data types THEN it SHALL import them from the central types.ts file

### Requirement 9

**User Story:** As an API consumer, I want the analysis-engine to maintain a consistent API contract, so that existing integrations continue to work without modification.

#### Acceptance Criteria

1. WHEN the analysis-engine receives requests THEN it SHALL accept POST requests with JSON body
2. WHEN the request body is processed THEN it SHALL contain ticker, context ('investment' or 'trading'), and apiKey fields
3. WHEN the analysis is complete THEN the system SHALL return JSON conforming to SynthesisResult interface
4. WHEN errors occur THEN the system SHALL return appropriate HTTP status codes and error messages

### Requirement 10

**User Story:** As a system maintainer, I want all analysis-engine components located in a dedicated directory, so that the module is self-contained and easy to manage.

#### Acceptance Criteria

1. WHEN the analysis-engine is implemented THEN all components SHALL be located in supabase/functions/analysis-engine/ directory
2. WHEN the directory structure is created THEN it SHALL contain index.ts for the AnalysisOrchestrator
3. WHEN the directory structure is created THEN it SHALL contain separate files for each engine (fundamental-engine.ts, technical-engine.ts, eco-engine.ts, synthesis-engine.ts)
4. WHEN the directory structure is created THEN it SHALL contain types.ts for shared interfaces
5. WHEN the module is deployed THEN it SHALL be self-contained with minimal external dependencies