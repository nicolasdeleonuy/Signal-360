# Requirements Document

## Introduction

This specification defines the PostgreSQL database schema requirements for Signal-360, a SaaS investment and trading analysis platform. The database must support secure user profile management, encrypted API key storage, and comprehensive analysis result tracking. The schema will be implemented on Supabase and must integrate seamlessly with the existing authentication system while providing robust data storage for analysis workflows.

## Requirements

### Requirement 1

**User Story:** As a Signal-360 user, I want my profile information securely stored and linked to my authentication account, so that I can maintain personalized settings and API configurations across sessions.

#### Acceptance Criteria

1. WHEN a user registers THEN the system SHALL create a corresponding profile record linked to their auth.users UUID
2. WHEN a user's profile is created THEN the system SHALL establish a one-to-one relationship between auth.users and profiles tables
3. IF a user account is deleted THEN the system SHALL cascade delete the associated profile record
4. WHEN accessing profile data THEN the system SHALL use the user's UUID as both primary key and foreign key reference

### Requirement 2

**User Story:** As a Signal-360 user, I want my Google API key stored securely in encrypted format, so that my sensitive credentials are protected from unauthorized access.

#### Acceptance Criteria

1. WHEN a user saves their Google API key THEN the system SHALL store it in encrypted format using PostgreSQL encryption
2. WHEN retrieving the API key THEN the system SHALL decrypt it securely within Supabase Edge Functions
3. WHEN storing the API key THEN the system SHALL use the pgsodium extension for encryption/decryption operations
4. IF the API key field is accessed directly THEN the system SHALL only return encrypted data, never plaintext
5. WHEN the API key is null THEN the system SHALL handle the absence gracefully without errors

### Requirement 3

**User Story:** As a Signal-360 user, I want all my analysis results permanently logged, so that I can review my historical analysis decisions and track my investment research over time.

#### Acceptance Criteria

1. WHEN an analysis is completed THEN the system SHALL create a new record in the analyses table
2. WHEN storing analysis results THEN the system SHALL include ticker symbol, analysis context, and timestamp
3. WHEN an analysis involves trading THEN the system SHALL optionally store the trading timeframe
4. WHEN synthesis is complete THEN the system SHALL store the final score (0-100) and factor breakdowns
5. WHEN detailed results are available THEN the system SHALL store the complete report in JSONB format

### Requirement 4

**User Story:** As a Signal-360 user, I want my analysis history linked to my profile, so that I can access only my own analysis results and maintain data privacy.

#### Acceptance Criteria

1. WHEN creating an analysis record THEN the system SHALL link it to the user's profile via foreign key
2. WHEN querying analyses THEN the system SHALL filter results by the authenticated user's ID
3. IF a user profile is deleted THEN the system SHALL cascade delete all associated analysis records
4. WHEN accessing analysis data THEN the system SHALL enforce row-level security based on user ownership

### Requirement 5

**User Story:** As a Signal-360 developer, I want flexible storage for convergence and divergence factors, so that the analysis engine can store varying numbers and types of factors without schema changes.

#### Acceptance Criteria

1. WHEN storing convergence factors THEN the system SHALL accept variable-length arrays or JSON objects
2. WHEN storing divergence factors THEN the system SHALL accept variable-length arrays or JSON objects
3. WHEN querying factors THEN the system SHALL support JSON operations for filtering and analysis
4. WHEN factors are empty THEN the system SHALL handle null or empty arrays gracefully

### Requirement 6

**User Story:** As a Signal-360 developer, I want comprehensive analysis metadata captured, so that the system can support different analysis contexts and trading strategies.

#### Acceptance Criteria

1. WHEN performing investment analysis THEN the system SHALL store 'investment' as the analysis context
2. WHEN performing trading analysis THEN the system SHALL store 'trading' as the analysis context
3. WHEN trading analysis includes timeframe THEN the system SHALL store the specific timeframe (e.g., '1D', '1W', '1M')
4. WHEN investment analysis is performed THEN the trading_timeframe field SHALL remain null
5. WHEN storing ticker symbols THEN the system SHALL normalize them to uppercase format

### Requirement 7

**User Story:** As a Signal-360 administrator, I want the database schema to follow PostgreSQL best practices, so that the system maintains high performance, data integrity, and scalability.

#### Acceptance Criteria

1. WHEN creating tables THEN the system SHALL use appropriate data types for each column
2. WHEN defining relationships THEN the system SHALL implement proper foreign key constraints
3. WHEN creating indexes THEN the system SHALL optimize for common query patterns
4. WHEN implementing timestamps THEN the system SHALL use timezone-aware datetime types
5. WHEN defining primary keys THEN the system SHALL use efficient key types (UUID or BIGINT)