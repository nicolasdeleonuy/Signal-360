# Requirements Document

## Introduction

The Backend Core Analysis Logic v2 feature represents a complete overhaul of Signal-360's analysis pipeline, transforming it from a prototype with placeholder logic into a fully functional, production-ready system. This feature will create a master Supabase Edge Function that orchestrates real data fetching from external APIs, processes multiple analysis types in parallel, and returns synthesized investment insights to the frontend. The system must deliver accurate, context-aware analysis that combines fundamental, technical, and sentiment/eco data to provide users with actionable investment recommendations.

## Requirements

### Requirement 1

**User Story:** As an investor using Signal-360, I want to input a ticker symbol and receive a comprehensive analysis that combines fundamental, technical, and sentiment data, so that I can make informed investment decisions based on real market data rather than placeholder information.

#### Acceptance Criteria

1. WHEN a user submits a ticker symbol and context ("investment" or "trading") THEN the system SHALL create a new `signal-360-analysis` Supabase Edge Function that accepts these parameters
2. WHEN the function is called THEN it SHALL validate the ticker format and context value before processing
3. WHEN validation passes THEN the system SHALL initiate three parallel data fetching operations for fundamental, technical, and sentiment/eco analysis
4. WHEN any data fetching operation fails THEN the system SHALL implement proper error handling and return meaningful error messages
5. WHEN all data is successfully fetched THEN the system SHALL process and score each analysis type before synthesis

### Requirement 2

**User Story:** As a Signal-360 user, I want the system to fetch real fundamental analysis data from external APIs, so that I can receive accurate financial metrics, business model insights, and competitive advantage assessments for my selected ticker.

#### Acceptance Criteria

1. WHEN the fundamental analysis fetcher is triggered THEN it SHALL make authenticated requests to the Google API to retrieve financial data
2. WHEN financial data is retrieved THEN the system SHALL extract key metrics including revenue, profit margins, debt ratios, and growth rates
3. WHEN business model data is available THEN the system SHALL analyze competitive advantages and market position
4. WHEN fundamental data processing is complete THEN the system SHALL generate a numerical score (0-100) and summary text
5. WHEN API rate limits are encountered THEN the system SHALL implement proper retry logic with exponential backoff

### Requirement 3

**User Story:** As a Signal-360 user, I want the system to fetch real technical analysis data based on my specified context (investment vs trading), so that I can receive relevant price history, indicators, and chart patterns for my investment timeframe.

#### Acceptance Criteria

1. WHEN the technical analysis fetcher is triggered THEN it SHALL retrieve price history data appropriate to the specified context
2. WHEN context is "investment" THEN the system SHALL fetch longer-term price data and calculate investment-focused indicators
3. WHEN context is "trading" THEN the system SHALL fetch shorter-term price data and calculate trading-focused indicators
4. WHEN price data is retrieved THEN the system SHALL calculate key technical indicators including moving averages, RSI, and MACD
5. WHEN technical analysis is complete THEN the system SHALL generate a numerical score (0-100) and identify chart patterns

### Requirement 4

**User Story:** As a Signal-360 user, I want the system to fetch real sentiment and market eco data, so that I can understand current market sentiment, news impact, and social media buzz affecting my selected ticker.

#### Acceptance Criteria

1. WHEN the sentiment/eco analysis fetcher is triggered THEN it SHALL retrieve current news articles and social media mentions for the ticker
2. WHEN news data is retrieved THEN the system SHALL analyze sentiment using natural language processing
3. WHEN social media data is available THEN the system SHALL calculate buzz metrics and sentiment scores
4. WHEN sentiment analysis is complete THEN the system SHALL generate an "Eco Score" (0-100) and identify key sentiment drivers
5. WHEN multiple news sources are processed THEN the system SHALL aggregate sentiment scores and identify the most impactful headlines

### Requirement 5

**User Story:** As a Signal-360 user, I want the system to synthesize all analysis data using context-aware weighting, so that I receive a final recommendation that appropriately balances different analysis types based on my investment goals.

#### Acceptance Criteria

1. WHEN all three analysis scores are available THEN the synthesis engine SHALL apply context-specific weighting algorithms
2. WHEN context is "investment" THEN the system SHALL weight scores as: Fundamental (50%), Sentiment/Eco (30%), Technical (20%)
3. WHEN context is "trading" THEN the system SHALL weight scores as: Technical (60%), Fundamental (25%), Sentiment/Eco (15%)
4. WHEN weighted scores are calculated THEN the system SHALL generate a final synthesis score (0-100)
5. WHEN synthesis is complete THEN the system SHALL identify convergence factors (where analyses agree) and divergence factors (where analyses disagree)

### Requirement 6

**User Story:** As a Signal-360 user, I want to receive a comprehensive analysis response with actionable trade parameters, so that I can implement specific entry, exit, and risk management strategies based on the analysis.

#### Acceptance Criteria

1. WHEN synthesis is complete THEN the system SHALL generate specific trade parameters including entry price, stop loss, and take profit levels
2. WHEN trade parameters are calculated THEN they SHALL be based on current market price and volatility metrics
3. WHEN confidence levels are determined THEN they SHALL reflect the degree of agreement between different analysis types
4. WHEN the final response is prepared THEN it SHALL include a clear recommendation ("BUY", "SELL", "HOLD") with supporting rationale
5. WHEN key eco factors are identified THEN the system SHALL include the top 3-5 most impactful news items with source attribution

### Requirement 7

**User Story:** As a Signal-360 user, I want to receive a structured JSON response that the frontend can easily consume, so that the analysis results are displayed consistently and all data is accessible for visualization.

#### Acceptance Criteria

1. WHEN the analysis is complete THEN the system SHALL return a JSON response matching the specified schema exactly
2. WHEN the response is generated THEN it SHALL include synthesis_score, recommendation, confidence, convergence_factors, and divergence_factors
3. WHEN trade parameters are included THEN they SHALL contain entry_price, stop_loss, and take_profit_levels as numbers
4. WHEN key ecos are provided THEN each SHALL include source, headline, and sentiment fields
5. WHEN the full report is included THEN it SHALL contain detailed scores and summaries for all three analysis types

### Requirement 8

**User Story:** As a Signal-360 system administrator, I want the backend analysis logic to handle errors gracefully and provide monitoring capabilities, so that I can ensure system reliability and troubleshoot issues effectively.

#### Acceptance Criteria

1. WHEN API calls fail THEN the system SHALL log detailed error information and return user-friendly error messages
2. WHEN rate limits are exceeded THEN the system SHALL implement exponential backoff and queue management
3. WHEN invalid tickers are provided THEN the system SHALL validate ticker format and return appropriate error responses
4. WHEN system performance degrades THEN monitoring SHALL track response times and success rates
5. WHEN errors occur THEN the system SHALL maintain partial functionality where possible rather than complete failure