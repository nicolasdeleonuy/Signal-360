# Asynchronous Analysis Endpoints

This document describes the new asynchronous analysis endpoints that replace the synchronous analysis flow with a job-based system for better user experience and scalability.

## Overview

The asynchronous analysis system consists of two main endpoints:

1. **POST /start-analysis** - Initiates a new analysis job
2. **GET /analysis-status/{jobId}** - Retrieves the status and results of an analysis job

## Endpoints

### POST /start-analysis

Initiates a new financial analysis job and returns a job ID for tracking progress.

**Request:**
```json
{
  "ticker": "AAPL",
  "context": "investment",
  "trading_timeframe": "1D" // Optional, only for trading context
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "pending",
    "ticker": "AAPL",
    "context": "investment",
    "estimated_completion_time": "2024-01-15T10:31:00Z",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "request_id": "req_123456"
}
```

**Features:**
- Validates ticker format and analysis context
- Prevents duplicate jobs for the same ticker within 5 minutes
- Returns existing job ID if analysis is already in progress
- Triggers background analysis processing

### GET /analysis-status/{jobId}

Retrieves the current status and progress of an analysis job.

**URL:** `/analysis-status/550e8400-e29b-41d4-a716-446655440000`

**Response (In Progress):**
```json
{
  "success": true,
  "data": {
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "in_progress",
    "progress_percentage": 45,
    "current_phase": "fundamental_analysis",
    "ticker": "AAPL",
    "context": "investment",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:30Z",
    "estimated_completion_time": "2024-01-15T10:31:00Z"
  },
  "request_id": "req_123457"
}
```

**Response (Completed):**
```json
{
  "success": true,
  "data": {
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "progress_percentage": 100,
    "current_phase": "completed",
    "ticker": "AAPL",
    "context": "investment",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:31:00Z",
    "result": {
      "synthesis_score": 75,
      "recommendation": "BUY",
      "confidence": 85,
      "convergence_factors": ["Strong financial ratios", "Positive growth trend"],
      "divergence_factors": ["High valuation metrics"],
      "trade_parameters": {
        "entry_price": 150.25,
        "stop_loss": 142.50,
        "take_profit_levels": [158.00, 165.00]
      },
      "key_ecos": [
        {
          "source": "ESG Analysis",
          "headline": "Strong governance practices",
          "sentiment": "positive"
        }
      ],
      "full_report": {
        "fundamental": {
          "score": 78,
          "summary": "Strong financial position with solid growth metrics"
        },
        "technical": {
          "score": 72,
          "summary": "Bullish technical indicators with upward momentum"
        },
        "sentiment_eco": {
          "score": 75,
          "summary": "Positive ESG factors with good governance"
        }
      }
    }
  },
  "request_id": "req_123458"
}
```

**Response (Failed):**
```json
{
  "success": true,
  "data": {
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "failed",
    "progress_percentage": 25,
    "current_phase": "failed",
    "ticker": "AAPL",
    "context": "investment",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:15Z",
    "error_message": "Google API key validation failed. Please update your API key in profile settings."
  },
  "request_id": "req_123459"
}
```

## Job Status Flow

```
pending → in_progress → completed
                    ↘ failed
```

### Status Descriptions

- **pending**: Job created and queued for processing
- **in_progress**: Analysis is currently running
- **completed**: Analysis finished successfully with results
- **failed**: Analysis failed due to an error

### Progress Phases

- **initializing**: Job setup and validation
- **api_key_validation**: Validating user's Google API key
- **data_fetching**: Retrieving financial data from APIs
- **fundamental_analysis**: Processing fundamental analysis
- **technical_analysis**: Processing technical analysis (Phase 2)
- **esg_analysis**: Processing ESG analysis (Phase 2)
- **synthesis**: Combining results and generating final score
- **completed**: Analysis finished
- **failed**: Analysis failed at some stage

## Database Schema

The system uses an `analysis_jobs` table to track job status:

```sql
CREATE TABLE analysis_jobs (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    ticker_symbol TEXT NOT NULL,
    analysis_context TEXT NOT NULL CHECK (analysis_context IN ('investment', 'trading')),
    trading_timeframe TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')) DEFAULT 'pending',
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    current_phase TEXT DEFAULT 'initializing',
    error_message TEXT,
    result_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
```

## Security

- All endpoints require user authentication
- Users can only access their own analysis jobs
- Service role authentication is supported for internal function calls
- Row Level Security (RLS) enforces data isolation

## Error Handling

Common error responses:

- **401 Unauthorized**: Invalid or missing authentication
- **400 Bad Request**: Invalid ticker format or missing parameters
- **404 Not Found**: Job ID not found or access denied
- **500 Internal Server Error**: System error during processing

## Frontend Integration

The frontend should:

1. Call `POST /start-analysis` when user selects a ticker
2. Store the returned `job_id`
3. Poll `GET /analysis-status/{jobId}` every 2-3 seconds
4. Display progress indicator based on `progress_percentage` and `current_phase`
5. Show results when `status` becomes `completed`
6. Handle errors when `status` becomes `failed`
7. Stop polling when analysis is complete or failed

## Testing

Run the test suites:

```bash
# Test start-analysis endpoint
deno test supabase/functions/start-analysis/__tests__/

# Test analysis-status endpoint  
deno test supabase/functions/analysis-status/__tests__/
```

## Deployment

Use the deployment script:

```bash
./scripts/deploy-analysis-endpoints.sh
```

Or deploy individually:

```bash
supabase functions deploy start-analysis
supabase functions deploy analysis-status
supabase functions deploy signal-360-analysis
```