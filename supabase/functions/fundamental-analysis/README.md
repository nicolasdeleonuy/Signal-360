# Fundamental Analysis Edge Function

This Edge Function performs comprehensive fundamental analysis of stocks by analyzing financial statements, ratios, and company fundamentals. It's part of the Signal-360 backend analysis system and provides detailed insights into a company's financial health and investment potential.

## Endpoint

```
POST /functions/v1/fundamental-analysis
```

## Authentication

This function does not require user authentication as it's designed to be called internally by other Edge Functions. However, it requires a valid Google API key for external financial data API calls.

## Request Format

```json
{
  "ticker_symbol": "AAPL",
  "api_key": "AIzaSyDxVlAabc123def456ghi789jkl012mno345",
  "analysis_context": "investment"
}
```

### Request Parameters

- `ticker_symbol` (string, required): Stock ticker symbol (1-5 uppercase letters)
- `api_key` (string, required): Valid Google API key for external API calls
- `analysis_context` (string, required): Either "investment" or "trading"

## Response Format

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "score": 75,
    "factors": [
      {
        "category": "fundamental",
        "type": "positive",
        "description": "Strong return on equity of 25.3%",
        "weight": 0.8,
        "confidence": 0.9
      }
    ],
    "details": {
      "financial_ratios": {
        "roe": 25.3,
        "roa": 12.1,
        "net_margin": 15.8,
        "current_ratio": 1.2,
        "debt_to_equity": 0.8,
        "pe_ratio": 25.5
      },
      "growth_metrics": {
        "revenue_growth": 8.5,
        "earnings_growth": 12.3,
        "fcf_growth": 15.2,
        "revenue_cagr_3y": 7.8,
        "earnings_cagr_3y": 10.5
      },
      "valuation_metrics": {
        "pe_ratio": 25.5,
        "pb_ratio": 8.2,
        "ps_ratio": 7.8,
        "peg_ratio": 1.5,
        "dividend_yield": 0.61,
        "fcf_yield": 2.8
      },
      "quality_indicators": {
        "debt_service_coverage": 15.2,
        "working_capital": -1742000000,
        "roic": 18.5,
        "market_cap_rank": 1,
        "beta": 1.2,
        "earnings_consistency": 0.85,
        "revenue_consistency": 0.92
      }
    },
    "confidence": 0.85
  },
  "request_id": "req_1234567890_abcdef123",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Error Response (400/500)

```json
{
  "success": false,
  "error": {
    "code": "INVALID_TICKER",
    "message": "Invalid ticker symbol format",
    "details": "Additional error details if available"
  },
  "request_id": "req_1234567890_abcdef123",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Analysis Components

### Financial Ratios
- **Profitability**: ROE, ROA, Net Margin
- **Liquidity**: Current Ratio, Quick Ratio
- **Leverage**: Debt-to-Equity, Debt Ratio
- **Efficiency**: Asset Turnover
- **Market**: P/E, P/B, P/S Ratios

### Growth Metrics
- Revenue Growth (YoY)
- Earnings Growth (YoY)
- Free Cash Flow Growth
- 3-Year Revenue CAGR
- 3-Year Earnings CAGR

### Valuation Metrics
- P/E, P/B, P/S Ratios
- PEG Ratio
- Dividend Yield
- Free Cash Flow Yield

### Quality Indicators
- Debt Service Coverage
- Working Capital
- Return on Invested Capital (ROIC)
- Market Cap Ranking
- Beta (Volatility)
- Earnings/Revenue Consistency

## Scoring Algorithm

### Score Calculation (0-100)
- **Investment Context**: Emphasizes long-term fundamentals
- **Trading Context**: Applies 0.8x multiplier for shorter-term focus
- Weighted average of positive/negative factors
- Confidence-adjusted scoring

### Factor Generation
Factors are generated based on:
- **Strong Positives**: ROE > 15%, Revenue Growth > 10%, P/E < 15
- **Strong Negatives**: ROE < 5%, Current Ratio < 1, Debt/Equity > 2
- **Context Weighting**: Investment factors weighted higher for investment context

### Confidence Calculation
Confidence is reduced for:
- Limited historical data (< 3 years)
- Missing key financial data
- Very small (< $100M) or very large (> $1T) market caps
- Inconsistent earnings or revenue patterns

## External API Integration

### Data Sources
- **Financial Modeling Prep API**: Primary source for financial data
- **Company Profile**: Basic company information and market data
- **Financial Statements**: Income statement, balance sheet, cash flow
- **Market Data**: Current quotes and valuation metrics

### API Endpoints Used
- `/api/v3/profile/{ticker}`: Company profile and basic metrics
- `/api/v3/income-statement/{ticker}`: Income statement data (4 years)
- `/api/v3/balance-sheet-statement/{ticker}`: Balance sheet data (4 years)
- `/api/v3/cash-flow-statement/{ticker}`: Cash flow data (4 years)
- `/api/v3/quote/{ticker}`: Current market data and quotes

### Error Handling
- **Rate Limiting**: Handles 429 responses with retry-after headers
- **API Errors**: Graceful handling of 4xx/5xx responses
- **Retry Logic**: Exponential backoff with jitter (up to 3 retries)
- **Timeout Protection**: 30-second timeout for external calls

## Error Codes

- `MISSING_PARAMETER` (400): Required parameter missing
- `INVALID_TICKER` (400): Invalid ticker symbol format
- `INVALID_API_KEY` (400): Invalid Google API key format
- `INVALID_PARAMETER` (400): Invalid analysis context
- `EXTERNAL_API_ERROR` (502): External API failure
- `RATE_LIMIT_EXCEEDED` (429): API rate limit exceeded
- `PROCESSING_ERROR` (500): Analysis processing failure
- `METHOD_NOT_ALLOWED` (405): HTTP method not allowed

## Usage Example

```bash
curl -X POST https://your-project.supabase.co/functions/v1/fundamental-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "ticker_symbol": "AAPL",
    "api_key": "AIzaSyDxVlAabc123def456ghi789jkl012mno345",
    "analysis_context": "investment"
  }'
```

## Internal Usage

This function is primarily used by the main analysis orchestrator:

```typescript
// Example usage in analyze-ticker function
const { data, error } = await supabase.functions.invoke('fundamental-analysis', {
  body: {
    ticker_symbol: 'AAPL',
    api_key: decryptedApiKey,
    analysis_context: 'investment'
  }
});

if (data) {
  const fundamentalResult = data as FundamentalAnalysisOutput;
  // Use in synthesis engine
}
```

## Testing

Run the unit tests:

```bash
deno test supabase/functions/fundamental-analysis/fundamental-analysis.test.ts --allow-all
```

## Performance

- **Average Analysis Time**: 2-5 seconds (depending on API response times)
- **Memory Usage**: ~5-10MB per analysis
- **Concurrent Requests**: Supported (stateless operation)
- **External API Calls**: 5 parallel requests per analysis
- **Caching**: Recommended for production (1-hour cache for fundamentals)

## Environment Variables

### Required
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key

### Optional
- `EXTERNAL_API_TIMEOUT`: API timeout in ms (default: 30000)
- `MAX_RETRIES`: Maximum retry attempts (default: 3)
- `BASE_RETRY_DELAY`: Base retry delay in ms (default: 1000)
- `FUNDAMENTALS_CACHE_TIMEOUT`: Cache timeout in ms (default: 3600000)

## Security Considerations

1. **API Key Validation**: Validates Google API key format
2. **Input Sanitization**: Validates and sanitizes all inputs
3. **Rate Limiting**: Respects external API rate limits
4. **Error Handling**: Doesn't expose sensitive API details
5. **Timeout Protection**: Prevents hanging requests
6. **Logging**: Logs analysis attempts without sensitive data

## Monitoring

The function logs the following events:
- Analysis start/completion with ticker and context
- External API call attempts and failures
- Score and confidence calculations
- Processing errors and timeouts
- Request metadata and timing

## Limitations

1. **Data Dependency**: Relies on external API data availability
2. **Historical Data**: Limited to available financial statement history
3. **Market Coverage**: Coverage depends on external API support
4. **Real-time Data**: Financial statements are typically quarterly
5. **API Costs**: External API usage may incur costs
6. **Rate Limits**: Subject to external API rate limiting

## Related Functions

- [`analyze-ticker`](../analyze-ticker/README.md): Main orchestrator that calls this function
- [`technical-analysis`](../technical-analysis/README.md): Technical analysis counterpart
- [`esg-analysis`](../esg-analysis/README.md): ESG analysis counterpart
- [`synthesis-engine`](../synthesis-engine/README.md): Combines all analysis results

## Troubleshooting

### Common Issues

1. **"External API error"**
   - Check API key validity and quotas
   - Verify external API service status
   - Check network connectivity

2. **"Invalid ticker symbol format"**
   - Ensure ticker is 1-5 uppercase letters
   - Verify ticker exists on the exchange

3. **"Processing error"**
   - Check if company has sufficient financial data
   - Verify data quality and completeness

4. **Rate limit exceeded**
   - Implement request throttling
   - Consider upgrading API plan
   - Use caching to reduce API calls