# Analyze Ticker Edge Function (Main Orchestrator)

This is the main orchestrator Edge Function for Signal-360 that coordinates the complete analysis workflow. It authenticates users, retrieves API keys, executes fundamental, technical, and ESG analyses concurrently, synthesizes the results, and stores the final analysis in the database.

## Endpoint

```
POST /functions/v1/analyze-ticker
```

## Authentication

**Required**: This function requires a valid JWT token in the Authorization header. Users must be authenticated to perform analysis.

```
Authorization: Bearer <jwt-token>
```

## Request Format

```json
{
  "ticker_symbol": "AAPL",
  "analysis_context": "investment",
  "trading_timeframe": "1M"
}
```

### Request Parameters

- `ticker_symbol` (string, required): Stock ticker symbol (1-5 uppercase letters)
- `analysis_context` (string, required): Either "investment" or "trading"
- `trading_timeframe` (string, optional): Required for trading context. One of "1D", "1W", "1M", "3M", "6M", "1Y"

## Response Format

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "analysis_id": 123,
    "ticker_symbol": "AAPL",
    "synthesis_score": 73,
    "convergence_factors": [
      {
        "category": "convergence",
        "description": "Strong positive signals across all analyses (avg: 73.7)",
        "weight": 0.9,
        "supporting_analyses": ["fundamental", "technical", "esg"],
        "metadata": {
          "fundamental_score": 75,
          "technical_score": 68,
          "esg_score": 78,
          "average_score": 73.7
        }
      }
    ],
    "divergence_factors": [],
    "full_report": {
      "summary": "AAPL receives a synthesis score of 73/100 for investment, resulting in a BUY recommendation...",
      "recommendation": "buy",
      "fundamental": {
        "score": 75,
        "factors": [...],
        "details": {...},
        "confidence": 0.85
      },
      "technical": {
        "score": 68,
        "factors": [...],
        "details": {...},
        "confidence": 0.82
      },
      "esg": {
        "score": 78,
        "factors": [...],
        "details": {...},
        "confidence": 0.85
      },
      "synthesis_methodology": "This analysis uses a weighted synthesis approach optimized for investment...",
      "limitations": [...],
      "metadata": {
        "analysis_timestamp": "2024-01-01T12:00:00.000Z",
        "data_sources": ["fundamental-analysis", "technical-analysis", "esg-analysis"],
        "api_version": "1.0.0"
      }
    }
  },
  "request_id": "req_1234567890_abcdef123",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Error Response (400/401/403/429/500)

```json
{
  "success": false,
  "error": {
    "code": "MISSING_API_KEY",
    "message": "User has not configured a Google API key. Please add your API key in the profile section.",
    "details": "Additional error details if available"
  },
  "request_id": "req_1234567890_abcdef123",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Analysis Workflow

### 1. Authentication & Validation
- **JWT Validation**: Verifies user authentication token
- **Input Validation**: Validates ticker symbol, analysis context, and timeframe
- **Rate Limiting**: Checks if user has exceeded analysis limits

### 2. API Key Retrieval
- **Database Query**: Retrieves user's encrypted Google API key
- **Decryption**: Calls decrypt-api-key function to get plain text key
- **Validation**: Ensures API key is available and valid

### 3. Concurrent Analysis Execution
- **Fundamental Analysis**: Company financials, ratios, and fundamentals
- **Technical Analysis**: Price patterns, indicators, and trends
- **ESG Analysis**: Environmental, social, and governance factors
- **Parallel Processing**: All three analyses run concurrently for optimal performance

### 4. Results Synthesis
- **Context-Aware Weighting**: Applies investment vs trading weighting
- **Convergence/Divergence**: Identifies agreement and conflict patterns
- **Final Scoring**: Generates synthesis score (0-100) and recommendation

### 5. Data Persistence
- **Database Storage**: Stores complete analysis results
- **Analysis ID**: Returns unique identifier for future reference
- **User Association**: Links analysis to authenticated user

## Analysis Components

### Fundamental Analysis
- **Financial Ratios**: ROE, ROA, debt ratios, liquidity ratios
- **Growth Metrics**: Revenue growth, earnings growth, CAGR
- **Valuation Metrics**: P/E, P/B, P/S ratios, dividend yield
- **Quality Indicators**: Management effectiveness, financial strength

### Technical Analysis
- **Trend Indicators**: Moving averages, MACD, Bollinger Bands
- **Momentum Indicators**: RSI, Stochastic, Williams %R
- **Volume Indicators**: Volume analysis, OBV, accumulation/distribution
- **Support/Resistance**: Key price levels and pivot points

### ESG Analysis
- **Environmental**: Carbon emissions, renewable energy, resource management
- **Social**: Employee relations, community impact, product responsibility
- **Governance**: Board composition, executive compensation, transparency
- **Sustainability**: Reporting standards, climate commitments, innovation

### Synthesis Engine
- **Weighted Scoring**: Context-appropriate weighting of analysis components
- **Factor Analysis**: Identification of convergence and divergence patterns
- **Recommendation**: Buy/sell/hold recommendation based on synthesis score
- **Confidence Assessment**: Overall confidence in analysis results

## Error Codes

### Authentication Errors
- `MISSING_TOKEN` (401): Authorization header missing or malformed
- `INVALID_TOKEN` (403): JWT token is invalid or expired
- `MISSING_API_KEY` (403): User has not configured Google API key

### Validation Errors
- `INVALID_REQUEST` (400): Request validation failed
- `INVALID_TICKER` (400): Invalid ticker symbol format
- `INVALID_PARAMETER` (400): Invalid analysis context or timeframe

### Rate Limiting
- `RATE_LIMIT_EXCEEDED` (429): User has exceeded analysis limits

### Processing Errors
- `PROCESSING_ERROR` (500): Analysis module execution failed
- `DATABASE_ERROR` (500): Database operation failed
- `DECRYPTION_ERROR` (500): API key decryption failed

### System Errors
- `INTERNAL_ERROR` (500): Unexpected system error
- `METHOD_NOT_ALLOWED` (405): HTTP method not allowed

## Usage Example

```bash
curl -X POST https://your-project.supabase.co/functions/v1/analyze-ticker \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "ticker_symbol": "AAPL",
    "analysis_context": "investment"
  }'
```

## Frontend Integration

```typescript
// Example React component usage
import { supabase } from './lib/supabase';

const analyzeStock = async (ticker: string, context: 'investment' | 'trading') => {
  try {
    const { data, error } = await supabase.functions.invoke('analyze-ticker', {
      body: {
        ticker_symbol: ticker,
        analysis_context: context,
        trading_timeframe: context === 'trading' ? '1D' : undefined
      }
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  }
};

// Usage in component
const handleAnalyze = async () => {
  setLoading(true);
  try {
    const result = await analyzeStock('AAPL', 'investment');
    setAnalysisResult(result);
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
};
```

## Performance Characteristics

### Execution Time
- **Average**: 5-15 seconds (depending on external API response times)
- **Concurrent Processing**: Analysis modules run in parallel
- **Timeout Protection**: 30-second timeout per analysis module
- **Total Timeout**: 60-second maximum for complete workflow

### Resource Usage
- **Memory**: ~10-20MB per analysis request
- **CPU**: Moderate usage during synthesis calculations
- **Network**: 6-8 external API calls per analysis
- **Database**: 2-3 database operations per analysis

### Scalability
- **Concurrent Users**: Supports multiple simultaneous analyses
- **Rate Limiting**: 10 analyses per hour per user (configurable)
- **Auto-scaling**: Edge Functions scale automatically
- **Caching**: Analysis results cached in database

## Rate Limiting

### Default Limits
- **Per User**: 10 analyses per hour
- **Burst Protection**: 3 analyses per 5 minutes
- **Cooldown**: 6-minute minimum between analyses

### Limit Enforcement
- **Database Tracking**: Analysis timestamps stored per user
- **Sliding Window**: Rolling hour calculation
- **Error Response**: Clear messaging when limits exceeded
- **Retry Information**: Suggested wait time in error response

## Security Considerations

### Authentication Security
- **JWT Validation**: All requests require valid authentication
- **Token Expiry**: Expired tokens rejected with clear error
- **User Context**: Analysis results linked to authenticated user only

### API Key Security
- **Encrypted Storage**: User API keys encrypted in database
- **Secure Decryption**: Keys decrypted only in memory during analysis
- **No Logging**: API keys never logged in plain text
- **Access Control**: Users can only access their own API keys

### Input Validation
- **Parameter Sanitization**: All inputs validated and sanitized
- **SQL Injection Prevention**: Parameterized database queries
- **XSS Protection**: Output encoding for web display
- **Rate Limiting**: Prevents abuse and resource exhaustion

## Monitoring and Observability

### Logging
- **Request Tracking**: Unique request IDs for tracing
- **Execution Metrics**: Timing for each analysis phase
- **Error Logging**: Detailed error information for debugging
- **User Activity**: Analysis requests per user (anonymized)

### Metrics Collection
- **Success Rate**: Percentage of successful analyses
- **Response Time**: Average and percentile response times
- **Error Distribution**: Breakdown of error types and frequencies
- **Resource Usage**: Memory and CPU utilization patterns

### Alerting
- **High Error Rate**: Alert when error rate exceeds threshold
- **Slow Response**: Alert for response times above SLA
- **Rate Limit Abuse**: Alert for excessive rate limit violations
- **System Health**: Overall system health monitoring

## Testing

Run the unit tests:

```bash
deno test supabase/functions/analyze-ticker/analyze-ticker.test.ts --allow-all
```

### Test Coverage
- **Authentication Flow**: Valid/invalid tokens, missing headers
- **Input Validation**: Valid/invalid tickers, contexts, timeframes
- **Analysis Workflow**: Complete end-to-end analysis execution
- **Error Handling**: Various failure scenarios and error responses
- **Rate Limiting**: Limit enforcement and error responses
- **Concurrent Execution**: Parallel analysis module execution

## Troubleshooting

### Common Issues

1. **"User has not configured a Google API key"**
   - User needs to add their Google API key in profile settings
   - Verify API key is properly encrypted and stored
   - Check decrypt-api-key function is working

2. **"Analysis limit reached"**
   - User has exceeded hourly analysis limit (10 per hour)
   - Wait for rate limit window to reset
   - Consider upgrading limits for premium users

3. **"Analysis module execution failed"**
   - Check external API availability and quotas
   - Verify network connectivity to external services
   - Review individual analysis function logs

4. **"Invalid or expired JWT token"**
   - User needs to re-authenticate
   - Check token expiry and refresh logic
   - Verify Supabase auth configuration

5. **Slow response times**
   - External API response times may be slow
   - Consider implementing caching for repeated analyses
   - Monitor network latency to external services

### Debug Information

Enable debug logging by setting environment variables:
- `LOG_LEVEL=debug`: Detailed execution logging
- `TRACE_REQUESTS=true`: Request/response tracing
- `PROFILE_PERFORMANCE=true`: Performance profiling

## Related Functions

- [`fundamental-analysis`](../fundamental-analysis/README.md): Financial analysis component
- [`technical-analysis`](../technical-analysis/README.md): Technical analysis component
- [`esg-analysis`](../esg-analysis/README.md): ESG analysis component
- [`synthesis-engine`](../synthesis-engine/README.md): Results synthesis component
- [`decrypt-api-key`](../decrypt-api-key/README.md): API key decryption service

## API Versioning

- **Current Version**: 1.0.0
- **Backward Compatibility**: Maintained for major versions
- **Deprecation Policy**: 6-month notice for breaking changes
- **Version Header**: `X-API-Version` header support planned