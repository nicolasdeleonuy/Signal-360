# Technical Analysis Edge Function

This Edge Function performs comprehensive technical analysis of stocks by analyzing price patterns, technical indicators, and market trends based on specified timeframes. It's part of the Signal-360 backend analysis system and provides detailed insights into price momentum, trend direction, and trading opportunities.

## Endpoint

```
POST /functions/v1/technical-analysis
```

## Authentication

This function does not require user authentication as it's designed to be called internally by other Edge Functions. However, it requires a valid Google API key for external market data API calls.

## Request Format

```json
{
  "ticker_symbol": "AAPL",
  "api_key": "AIzaSyDxVlAabc123def456ghi789jkl012mno345",
  "analysis_context": "trading",
  "trading_timeframe": "1D"
}
```

### Request Parameters

- `ticker_symbol` (string, required): Stock ticker symbol (1-5 uppercase letters)
- `api_key` (string, required): Valid Google API key for external API calls
- `analysis_context` (string, required): Either "investment" or "trading"
- `trading_timeframe` (string, optional): One of "1D", "1W", "1M", "3M", "6M", "1Y"

## Response Format

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "score": 68,
    "factors": [
      {
        "category": "technical",
        "type": "positive",
        "description": "Price above short-term moving averages with bullish alignment",
        "weight": 0.9,
        "confidence": 0.8
      },
      {
        "category": "technical",
        "type": "negative",
        "description": "RSI overbought at 78.5, potential pullback",
        "weight": 0.7,
        "confidence": 0.8
      }
    ],
    "details": {
      "trend_indicators": {
        "sma_20": 152.45,
        "sma_50": 148.32,
        "sma_200": 145.67,
        "ema_12": 153.21,
        "ema_26": 150.89,
        "macd": 2.32,
        "macd_signal": 1.87,
        "macd_histogram": 0.45,
        "bollinger_upper": 158.45,
        "bollinger_lower": 146.23,
        "bollinger_middle": 152.34
      },
      "momentum_indicators": {
        "rsi": 78.5,
        "stochastic_k": 85.2,
        "stochastic_d": 82.1,
        "williams_r": -15.8,
        "atr": 3.45
      },
      "volume_indicators": {
        "volume_sma_20": 45000000,
        "volume_ratio": 1.35,
        "on_balance_volume": 125000000,
        "volume_price_trend": 8500000,
        "accumulation_distribution": 15000000
      },
      "support_resistance": {
        "support_levels": [148.50, 145.20, 142.80],
        "resistance_levels": [156.80, 159.40, 162.10],
        "pivot_point": 152.30,
        "support_1": 149.60,
        "support_2": 146.90,
        "resistance_1": 154.70,
        "resistance_2": 157.40
      }
    },
    "confidence": 0.82
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

### Trend Indicators
- **Moving Averages**: SMA (20, 50, 200), EMA (12, 26)
- **MACD**: MACD line, Signal line, Histogram
- **Bollinger Bands**: Upper, Middle, Lower bands with 2 standard deviations

### Momentum Indicators
- **RSI**: 14-period Relative Strength Index
- **Stochastic**: %K and %D oscillators (14-period)
- **Williams %R**: 14-period Williams Percent Range
- **ATR**: 14-period Average True Range for volatility

### Volume Indicators
- **Volume SMA**: 20-period volume moving average
- **Volume Ratio**: Current volume vs average volume
- **OBV**: On-Balance Volume for volume-price relationship
- **VPT**: Volume Price Trend indicator
- **A/D Line**: Accumulation/Distribution line

### Support & Resistance
- **Pivot Points**: Classic pivot point calculations
- **Support Levels**: S1, S2 and dynamic support levels
- **Resistance Levels**: R1, R2 and dynamic resistance levels
- **Local Extremes**: Recent swing highs and lows

## Timeframe Analysis

### Data Sources by Timeframe
- **1D**: 5-minute intraday data (last trading day)
- **1W**: Daily data (last 30 days)
- **1M**: Daily data (last 3 months)
- **3M**: Daily data (last 6 months)
- **6M**: Daily data (last 1 year)
- **1Y**: Daily data (last 2 years)

### Timeframe-Specific Adjustments
- **Short-term (1D, 1W)**: Higher weight on momentum indicators
- **Medium-term (1M, 3M)**: Balanced trend and momentum analysis
- **Long-term (6M, 1Y)**: Higher weight on trend indicators

## Scoring Algorithm

### Score Calculation (0-100)
- **Trading Context**: Full weight for technical factors
- **Investment Context**: 0.9x multiplier for longer-term focus
- **Timeframe Adjustment**: Short-term analysis gets 1.2x weight multiplier
- Weighted average of positive/negative factors with confidence adjustment

### Factor Generation
Factors are generated based on:
- **Trend Alignment**: Price vs moving averages, MA crossovers
- **Momentum Extremes**: RSI overbought/oversold, stochastic levels
- **Volume Confirmation**: Volume spikes, volume-price divergence
- **Support/Resistance**: Price proximity to key levels
- **Pattern Recognition**: Bollinger Band squeezes, MACD signals

### Confidence Calculation
Confidence is reduced for:
- Limited historical data (< 50 periods)
- Very short timeframes (1D analysis)
- Data quality issues (zero volume, invalid prices)
- Inconsistent price patterns

## External API Integration

### Data Sources
- **Financial Modeling Prep API**: Primary source for price data
- **Historical Data**: Daily OHLCV data with up to 2 years history
- **Intraday Data**: 5-minute intervals for short-term analysis

### API Endpoints Used
- `/api/v3/historical-price-full/{ticker}`: Historical daily data
- `/api/v3/historical-chart/5min/{ticker}`: Intraday 5-minute data

### Error Handling
- **Rate Limiting**: Handles 429 responses with retry-after headers
- **API Errors**: Graceful handling of 4xx/5xx responses
- **Retry Logic**: Exponential backoff with jitter (up to 3 retries)
- **Timeout Protection**: 30-second timeout for external calls

## Technical Indicator Calculations

### Moving Averages
```typescript
// Simple Moving Average
SMA = (P1 + P2 + ... + Pn) / n

// Exponential Moving Average
EMA = (Price * Multiplier) + (Previous EMA * (1 - Multiplier))
// where Multiplier = 2 / (Period + 1)
```

### RSI (Relative Strength Index)
```typescript
RS = Average Gain / Average Loss
RSI = 100 - (100 / (1 + RS))
```

### MACD (Moving Average Convergence Divergence)
```typescript
MACD = EMA(12) - EMA(26)
Signal = EMA(9) of MACD
Histogram = MACD - Signal
```

### Bollinger Bands
```typescript
Middle Band = SMA(20)
Upper Band = Middle Band + (2 * Standard Deviation)
Lower Band = Middle Band - (2 * Standard Deviation)
```

### Stochastic Oscillator
```typescript
%K = ((Current Close - Lowest Low) / (Highest High - Lowest Low)) * 100
%D = SMA(3) of %K
```

## Error Codes

- `MISSING_PARAMETER` (400): Required parameter missing
- `INVALID_TICKER` (400): Invalid ticker symbol format
- `INVALID_API_KEY` (400): Invalid Google API key format
- `INVALID_PARAMETER` (400): Invalid analysis context or timeframe
- `PROCESSING_ERROR` (500): Insufficient data or calculation failure
- `EXTERNAL_API_ERROR` (502): External API failure
- `RATE_LIMIT_EXCEEDED` (429): API rate limit exceeded
- `METHOD_NOT_ALLOWED` (405): HTTP method not allowed

## Usage Example

```bash
curl -X POST https://your-project.supabase.co/functions/v1/technical-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "ticker_symbol": "AAPL",
    "api_key": "AIzaSyDxVlAabc123def456ghi789jkl012mno345",
    "analysis_context": "trading",
    "trading_timeframe": "1D"
  }'
```

## Internal Usage

This function is primarily used by the main analysis orchestrator:

```typescript
// Example usage in analyze-ticker function
const { data, error } = await supabase.functions.invoke('technical-analysis', {
  body: {
    ticker_symbol: 'AAPL',
    api_key: decryptedApiKey,
    analysis_context: 'trading',
    trading_timeframe: '1D'
  }
});

if (data) {
  const technicalResult = data as TechnicalAnalysisOutput;
  // Use in synthesis engine
}
```

## Testing

Run the unit tests:

```bash
deno test supabase/functions/technical-analysis/technical-analysis.test.ts --allow-all
```

## Performance

- **Average Analysis Time**: 1-3 seconds (depending on API response times)
- **Memory Usage**: ~3-8MB per analysis
- **Concurrent Requests**: Supported (stateless operation)
- **External API Calls**: 1-2 requests per analysis (depending on timeframe)
- **Caching**: Recommended for production (5-minute cache for market data)

## Environment Variables

### Required
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key

### Optional
- `EXTERNAL_API_TIMEOUT`: API timeout in ms (default: 30000)
- `MAX_RETRIES`: Maximum retry attempts (default: 3)
- `BASE_RETRY_DELAY`: Base retry delay in ms (default: 1000)
- `MARKET_DATA_CACHE_TIMEOUT`: Cache timeout in ms (default: 300000)

## Security Considerations

1. **API Key Validation**: Validates Google API key format
2. **Input Sanitization**: Validates and sanitizes all inputs
3. **Rate Limiting**: Respects external API rate limits
4. **Error Handling**: Doesn't expose sensitive API details
5. **Timeout Protection**: Prevents hanging requests
6. **Logging**: Logs analysis attempts without sensitive data

## Monitoring

The function logs the following events:
- Analysis start/completion with ticker, context, and timeframe
- External API call attempts and failures
- Technical indicator calculations and factor generation
- Score and confidence calculations
- Processing errors and timeouts
- Request metadata and timing

## Limitations

1. **Data Dependency**: Relies on external API data availability
2. **Market Hours**: Real-time data limited to market hours
3. **Historical Depth**: Limited by external API historical data
4. **Indicator Accuracy**: Technical indicators are lagging by nature
5. **API Costs**: External API usage may incur costs
6. **Rate Limits**: Subject to external API rate limiting

## Related Functions

- [`analyze-ticker`](../analyze-ticker/README.md): Main orchestrator that calls this function
- [`fundamental-analysis`](../fundamental-analysis/README.md): Fundamental analysis counterpart
- [`esg-analysis`](../esg-analysis/README.md): ESG analysis counterpart
- [`synthesis-engine`](../synthesis-engine/README.md): Combines all analysis results

## Troubleshooting

### Common Issues

1. **"Insufficient price data for technical analysis"**
   - Check if ticker has sufficient trading history
   - Verify ticker symbol is correct and actively traded
   - Try a longer timeframe for more data

2. **"External API error"**
   - Check API key validity and quotas
   - Verify external API service status
   - Check network connectivity

3. **"Invalid ticker symbol format"**
   - Ensure ticker is 1-5 uppercase letters
   - Verify ticker exists on the exchange

4. **Low confidence scores**
   - Check data quality and completeness
   - Consider using longer timeframes
   - Verify sufficient trading volume

5. **Rate limit exceeded**
   - Implement request throttling
   - Consider upgrading API plan
   - Use caching to reduce API calls