# Requirements Document

## Introduction

This specification defines the requirements for implementing the complete backend analysis logic for Signal-360's financial asset analysis system. The primary goal is to create a robust Supabase Edge Function that replaces frontend mock data with real analysis capabilities, integrating with external APIs using secure user-specific credentials to deliver comprehensive financial analysis results.

## Requirements

### Requirement 1

**User Story:** As an authenticated user, I want to request financial analysis for a specific ticker symbol so that I can receive comprehensive analysis data without exposing my API credentials to the client-side.

#### Acceptance Criteria

1. WHEN a user makes a request to the analysis endpoint THEN the system SHALL authenticate the user before processing
2. WHEN an unauthenticated request is made THEN the system SHALL return a 401 Unauthorized error
3. WHEN a valid ticker symbol and context are provided THEN the system SHALL process the analysis request
4. WHEN invalid input parameters are provided THEN the system SHALL return a 400 Bad Request error with descriptive messaging

### Requirement 2

**User Story:** As a user, I want my Google API key to be securely retrieved from the database so that my credentials remain protected and are not transmitted from the client-side.

#### Acceptance Criteria

1. WHEN the analysis function executes THEN the system SHALL retrieve the user's encrypted Google API key from the database using their authenticated user ID
2. WHEN a user does not have an API key configured THEN the system SHALL return a 400 Bad Request error indicating missing API key configuration
3. WHEN API key decryption fails THEN the system SHALL return a 500 Internal Server Error
4. WHEN the API key is successfully retrieved THEN the system SHALL use it for all external API calls without logging or exposing the key

### Requirement 3

**User Story:** As a user, I want to specify my investment context (investment or trading) so that the analysis results are appropriately weighted for my intended use case.

#### Acceptance Criteria

1. WHEN a user provides "investment" as context THEN the system SHALL weight the analysis toward long-term fundamental factors
2. WHEN a user provides "trading" as context THEN the system SHALL weight the analysis toward short-term technical factors
3. WHEN an invalid context is provided THEN the system SHALL return a 400 Bad Request error
4. WHEN no context is provided THEN the system SHALL return a 400 Bad Request error

### Requirement 4

**User Story:** As a user, I want comprehensive financial analysis including Fundamental, Technical, and ESG components so that I can make informed investment decisions based on a 360-degree view.

#### Acceptance Criteria

1. WHEN analysis is requested THEN the system SHALL perform Fundamental analysis using the Google API
2. WHEN analysis is requested THEN the system SHALL perform Technical analysis using the Google API
3. WHEN analysis is requested THEN the system SHALL perform ESG analysis using the Google API
4. WHEN any individual analysis component fails THEN the system SHALL continue with available analyses and note the failure in the response
5. WHEN all analysis components fail THEN the system SHALL return a 500 Internal Server Error with appropriate error messaging

### Requirement 5

**User Story:** As a frontend developer, I want the analysis results in a specific JSON format so that existing components can consume the data without modification.

#### Acceptance Criteria

1. WHEN analysis completes successfully THEN the system SHALL return data compatible with the AnalysisChart component interface
2. WHEN analysis completes successfully THEN the system SHALL return data compatible with the ResultsView component interface
3. WHEN analysis completes successfully THEN the system SHALL include convergence and divergence factors in the response
4. WHEN analysis completes successfully THEN the system SHALL include a final score between 0-100
5. WHEN analysis completes successfully THEN the system SHALL return structured data for each analysis type (Fundamental, Technical, ESG)

### Requirement 6

**User Story:** As a user, I want robust error handling so that I receive meaningful feedback when issues occur during analysis.

#### Acceptance Criteria

1. WHEN external API calls fail THEN the system SHALL return appropriate HTTP status codes (500 for server errors, 502 for upstream failures)
2. WHEN data processing encounters errors THEN the system SHALL return a 500 Internal Server Error with descriptive messaging
3. WHEN rate limits are exceeded THEN the system SHALL return a 429 Too Many Requests error
4. WHEN invalid ticker symbols are provided THEN the system SHALL return a 400 Bad Request error
5. WHEN network timeouts occur THEN the system SHALL return a 504 Gateway Timeout error

### Requirement 7

**User Story:** As a system administrator, I want comprehensive logging and monitoring so that I can track system performance and troubleshoot issues effectively.

#### Acceptance Criteria

1. WHEN the function executes THEN the system SHALL log request details (excluding sensitive data)
2. WHEN errors occur THEN the system SHALL log error details with appropriate severity levels
3. WHEN external API calls are made THEN the system SHALL log response times and status codes
4. WHEN the function completes THEN the system SHALL log execution duration and memory usage
5. WHEN sensitive data is logged THEN the system SHALL ensure API keys and user data are redacted

### Requirement 8

**User Story:** As a developer, I want the Edge Function to follow established patterns so that it integrates seamlessly with the existing Supabase infrastructure.

#### Acceptance Criteria

1. WHEN the function is deployed THEN it SHALL be located in the conventional Supabase functions directory structure
2. WHEN the function executes THEN it SHALL use established shared utilities for authentication, error handling, and logging
3. WHEN the function processes requests THEN it SHALL follow the existing security patterns and configurations
4. WHEN the function returns responses THEN it SHALL use consistent HTTP response formats with other Edge Functions
5. WHEN the function handles CORS THEN it SHALL allow requests from the configured frontend domains