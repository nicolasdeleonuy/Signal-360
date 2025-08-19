# Generate Ideas Edge Function

## Overview

The `generate-ideas` Edge Function provides intelligent ticker suggestions based on market screening criteria. It generates either investment ideas (for long-term positions) or trade ideas (for short-term opportunities) depending on the user's specified context.

## Functionality

### Investment Ideas
- Screens for companies with strong fundamentals
- Focuses on stability, growth potential, and dividend yield
- Considers market capitalization, P/E ratios, and ROE
- Prioritizes established sectors like Technology, Healthcare, Consumer Staples

### Trade Ideas
- Screens for high-volume, volatile stocks suitable for trading
- Adjusts criteria based on specified timeframe (1D, 1W, 1M, etc.)
- Considers technical indicators and momentum
- Focuses on sectors with higher trading activity

## API Specification

### Request

**Method:** `POST`

**Headers:**
- `Authorization: Bearer <jwt_token>`
- `Content-Type: application/json`

**Body:**
```json
{
  "context": "investment_idea" | "trade_idea",
  "timeframe": "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" // Required for trade_idea
}
```

### Response

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "ticker_symbol": "MSFT",
    "company_name": "Microsoft Corporation",
    "justification": "Strong long-term investment candidate with solid fundamentals...",
    "confidence": 0.85
  }
}
```

**Error Response (400/401/500):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Context is required and must be either 'investment_idea' or 'trade_idea'"
  }
}
```

## Screening Criteria

### Investment Ideas
- **Minimum Market Cap:** $1B
- **Maximum P/E Ratio:** 25
- **Minimum ROE:** 15%
- **Minimum Dividend Yield:** 2%
- **Preferred Sectors:** Technology, Healthcare, Consumer Staples, Utilities

### Trade Ideas (by Timeframe)

#### Day Trading (1D)
- **Minimum Volume:** 1M shares
- **Maximum Price:** $500
- **Volatility Range:** 2-8%
- **Sectors:** Technology, Energy, Financials

#### Weekly Trading (1W)
- **Minimum Volume:** 500K shares
- **Maximum Price:** $1,000
- **Volatility Range:** 3-12%
- **Sectors:** Technology, Healthcare, Consumer Discretionary

#### Longer-term Trading (1M+)
- **Minimum Volume:** 100K shares
- **Maximum Price:** $2,000
- **Volatility Range:** 5-20%
- **Sectors:** Technology, Biotechnology, Energy, Materials

## Error Handling

The function handles various error scenarios:

- **Authentication Errors:** Invalid or missing JWT token
- **Validation Errors:** Missing or invalid request parameters
- **API Key Errors:** Missing or invalid encrypted API key
- **Market Data Errors:** No suitable candidates found
- **Internal Errors:** Unexpected processing failures

## Security Features

- **JWT Authentication:** Validates user authentication token
- **API Key Encryption:** Securely retrieves and uses encrypted API keys
- **Input Validation:** Validates all request parameters
- **Error Sanitization:** Prevents sensitive information leakage

## Dependencies

- **Shared Utilities:** HTTP handling, validation, authentication
- **Decrypt API Key Function:** For secure API key retrieval
- **External APIs:** Market data providers (via user's API key)

## Testing

The function includes comprehensive unit tests covering:
- Input validation scenarios
- Authentication and authorization
- Idea generation logic for both contexts
- Error handling and edge cases
- Market screening criteria validation

## Usage Examples

### Generate Investment Idea
```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/generate-ideas \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"context": "investment_idea"}'
```

### Generate Day Trading Idea
```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/generate-ideas \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"context": "trade_idea", "timeframe": "1D"}'
```

## Performance Considerations

- **Response Time:** Typically 1-3 seconds depending on market data availability
- **Caching:** Market screening data cached for optimal performance
- **Rate Limiting:** Respects external API rate limits
- **Timeout Handling:** 30-second timeout for external API calls

## Future Enhancements

- **Real-time Market Data:** Integration with live market data feeds
- **Advanced Screening:** Machine learning-based candidate selection
- **Sector Rotation:** Dynamic sector preferences based on market conditions
- **Risk Assessment:** Integration with risk management criteria
- **Backtesting:** Historical performance validation of suggested ideas