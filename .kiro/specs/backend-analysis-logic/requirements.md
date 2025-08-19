# Requirements Document

## Introduction

The Backend Analysis Logic for Signal-360 is the core engine that powers the unified financial analysis platform. This system runs as Supabase Edge Functions and is responsible for executing comprehensive financial analysis based on user-provided ticker symbols and analysis context. The backend logic orchestrates three distinct analysis modules (Fundamental, Technical, ESG) and synthesizes their outputs into actionable investment insights while maintaining security and performance through server-side execution.

## Requirements

### Requirement 1

**User Story:** As a developer, I want a primary Edge Function that can receive analysis requests from the frontend and coordinate the execution of all analysis modules.

#### Acceptance Criteria

1. WHEN a frontend client sends a ticker symbol, analysis context ('investment' or 'trading'), and optional trading timeframe THEN the system SHALL accept and validate these parameters
2. WHEN the primary function receives a valid request THEN the system SHALL trigger the three sub-analysis modules (Fundamental, Technical, ESG) concurrently
3. WHEN executing analysis modules THEN the system SHALL securely retrieve and use the calling user's encrypted Google API key for external API calls
4. WHEN processing any request THEN the system SHALL execute all logic exclusively on the backend to ensure security and performance
5. IF any required parameter is missing or invalid THEN the system SHALL return a structured error response with appropriate HTTP status codes
6. WHEN concurrent analysis execution completes THEN the system SHALL collect all results and pass them to the synthesis module

### Requirement 2

**User Story:** As a developer, I want individual analysis modules that can perform specialized financial analysis for different aspects of a ticker symbol.

#### Acceptance Criteria

1. WHEN the Fundamental Analysis module is triggered THEN the system SHALL retrieve and analyze financial statements, ratios, and company fundamentals
2. WHEN the Technical Analysis module is triggered THEN the system SHALL analyze price patterns, indicators, and market trends based on the specified timeframe
3. WHEN the ESG Analysis module is triggered THEN the system SHALL evaluate environmental, social, and governance factors
4. WHEN any analysis module encounters an error THEN the system SHALL return a structured error response without failing the entire analysis process
5. WHEN analysis modules complete successfully THEN the system SHALL return standardized data structures for synthesis processing
6. IF external API calls fail THEN the system SHALL implement retry logic with exponential backoff up to 3 attempts

### Requirement 3

**User Story:** As a developer, I want a synthesis module that can intelligently combine analysis results based on user context and generate actionable insights.

#### Acceptance Criteria

1. WHEN the synthesis module receives outputs from all three analysis modules THEN the system SHALL weigh the results based on the user's chosen context ('investment' or 'trading')
2. WHEN the context is 'trading' THEN the system SHALL prioritize technical analysis and align weighting with the specified timeframe
3. WHEN the context is 'investment' THEN the system SHALL prioritize fundamental and ESG analysis with appropriate long-term weighting
4. WHEN synthesis processing completes THEN the system SHALL generate a final "Synthesis Score" between 0 and 100
5. WHEN generating the final output THEN the system SHALL identify and list key "Convergence Factors" (points of agreement between analyses)
6. WHEN generating the final output THEN the system SHALL identify and list key "Divergence Factors" (points of conflict between analyses)
7. WHEN synthesis encounters conflicting signals THEN the system SHALL apply context-appropriate conflict resolution rules
8. IF insufficient data is available for synthesis THEN the system SHALL return a partial analysis with confidence indicators

### Requirement 4

**User Story:** As a developer, I want a separate Edge Function that can generate investment or trading ideas when users don't have a specific ticker in mind.

#### Acceptance Criteria

1. WHEN a user requests idea generation THEN the system SHALL accept a context parameter ('investment idea' or 'trade idea')
2. WHEN the context is 'investment idea' THEN the system SHALL generate ticker suggestions based on long-term investment criteria
3. WHEN the context is 'trade idea' THEN the system SHALL generate ticker suggestions based on short-term trading opportunities
4. WHEN idea generation completes successfully THEN the system SHALL return a single, promising ticker symbol with brief justification
5. WHEN generating ideas THEN the system SHALL use market screening criteria appropriate to the requested context
6. IF no suitable ideas can be generated THEN the system SHALL return an appropriate message indicating market conditions or data limitations

### Requirement 5

**User Story:** As a developer, I want robust error handling and logging throughout the backend analysis system to ensure reliability and debuggability.

#### Acceptance Criteria

1. WHEN any Edge Function encounters an error THEN the system SHALL log detailed error information for debugging purposes
2. WHEN returning error responses THEN the system SHALL provide user-friendly error messages without exposing sensitive system details
3. WHEN external API rate limits are exceeded THEN the system SHALL implement appropriate backoff strategies and user notification
4. WHEN system resources are constrained THEN the system SHALL gracefully degrade functionality and inform users of limitations
5. WHEN processing requests THEN the system SHALL implement request timeout handling to prevent hanging operations
6. WHEN logging occurs THEN the system SHALL ensure no sensitive user data (API keys, personal information) is logged in plain text

### Requirement 6

**User Story:** As a developer, I want secure and efficient data handling throughout the analysis pipeline to protect user information and optimize performance.

#### Acceptance Criteria

1. WHEN handling user API keys THEN the system SHALL decrypt keys only in memory and never store them in plain text
2. WHEN making external API calls THEN the system SHALL implement connection pooling and request optimization
3. WHEN caching analysis results THEN the system SHALL implement time-based cache invalidation appropriate to data freshness requirements
4. WHEN processing user requests THEN the system SHALL validate and sanitize all input parameters to prevent injection attacks
5. WHEN returning analysis results THEN the system SHALL structure responses consistently for frontend consumption
6. IF analysis results contain sensitive information THEN the system SHALL apply appropriate data masking or filtering before returning to frontend