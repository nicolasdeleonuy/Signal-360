# Requirements Document

## Introduction

The Real-Time Financial Analysis feature transforms Signal-360 from a prototype with simulated data into a fully functional SaaS platform. This feature implements comprehensive backend analysis logic that integrates with the Google API to provide real-time, multi-dimensional financial analysis of stock tickers. The system will perform Fundamental, Technical, and ESG analysis using the user's securely stored Google API Key, then synthesize the results into actionable insights displayed on the dashboard.

## Requirements

### Requirement 1

**User Story:** As an analyst, I want to select a ticker from search results and trigger a comprehensive backend analysis process, so that I can get real-time insights instead of placeholder data.

#### Acceptance Criteria

1. WHEN a user selects a ticker from the search results THEN the system SHALL initiate a backend analysis process
2. WHEN the analysis process starts THEN the system SHALL display a progress indicator showing the current analysis phase
3. WHEN the backend process is running THEN the system SHALL prevent duplicate analysis requests for the same ticker within a 5-minute window
4. IF the analysis process fails THEN the system SHALL display a clear error message and allow retry

### Requirement 2

**User Story:** As an analyst, I want the backend to securely use my stored Google API Key for all external API calls, so that my credentials remain protected while enabling real-time data access.

#### Acceptance Criteria

1. WHEN the analysis process starts THEN the system SHALL retrieve the user's encrypted Google API Key from secure storage
2. WHEN making Google API calls THEN the system SHALL decrypt the API key only in memory and never log it
3. IF the API key is invalid or expired THEN the system SHALL return a specific error directing the user to update their credentials
4. WHEN API calls are made THEN the system SHALL implement rate limiting to respect Google API quotas
5. WHEN the analysis completes THEN the system SHALL clear the decrypted API key from memory

### Requirement 3

**User Story:** As an analyst, I want the backend to perform comprehensive analysis across Fundamental, Technical, and ESG dimensions, so that I receive a complete 360-degree view of the selected ticker.

#### Acceptance Criteria

1. WHEN fundamental analysis runs THEN the system SHALL fetch and analyze financial statements, ratios, and company metrics
2. WHEN technical analysis runs THEN the system SHALL analyze price patterns, volume trends, and technical indicators
3. WHEN ESG analysis runs THEN the system SHALL evaluate environmental, social, and governance factors
4. WHEN any analysis dimension fails THEN the system SHALL continue with remaining dimensions and note the failure
5. WHEN all analyses complete THEN the system SHALL store the raw results for synthesis processing
6. IF insufficient data is available for any dimension THEN the system SHALL provide a partial analysis with clear limitations noted

### Requirement 4

**User Story:** As an analyst, I want to see synthesized analysis results on the dashboard including scores and factors, so that I can make informed investment decisions based on comprehensive data.

#### Acceptance Criteria

1. WHEN analysis completes THEN the system SHALL calculate a Synthesis Score (0-100) based on all available dimensions
2. WHEN displaying results THEN the system SHALL show Convergence Factors that support the investment thesis
3. WHEN displaying results THEN the system SHALL show Divergence Factors that contradict the investment thesis
4. WHEN the user specifies their goal (Long-term Investment or Short-term Trading) THEN the system SHALL weight the analysis dimensions appropriately
5. WHEN results are displayed THEN the system SHALL include timestamps and data source attribution
6. WHEN results are older than 24 hours THEN the system SHALL offer to refresh the analysis
7. IF partial analysis was performed THEN the system SHALL clearly indicate which dimensions are missing and why

### Requirement 5

**User Story:** As an analyst, I want the system to handle errors gracefully and provide clear feedback, so that I understand what went wrong and how to resolve issues.

#### Acceptance Criteria

1. WHEN API rate limits are exceeded THEN the system SHALL queue the request and notify the user of expected wait time
2. WHEN network connectivity issues occur THEN the system SHALL retry with exponential backoff up to 3 attempts
3. WHEN Google API returns errors THEN the system SHALL translate technical errors into user-friendly messages
4. WHEN analysis partially fails THEN the system SHALL complete available analyses and clearly report what failed
5. WHEN the user's API key quota is exhausted THEN the system SHALL provide guidance on quota management

### Requirement 6

**User Story:** As an analyst, I want the system to cache analysis results appropriately, so that I don't waste API quota on redundant requests while still getting fresh data when needed.

#### Acceptance Criteria

1. WHEN analysis completes THEN the system SHALL cache results with appropriate TTL based on data type
2. WHEN a cached result exists and is fresh THEN the system SHALL return cached data instead of making new API calls
3. WHEN the user explicitly requests a refresh THEN the system SHALL bypass cache and perform new analysis
4. WHEN cache expires THEN the system SHALL automatically refresh data on next request
5. WHEN displaying cached results THEN the system SHALL show the age of the data clearly