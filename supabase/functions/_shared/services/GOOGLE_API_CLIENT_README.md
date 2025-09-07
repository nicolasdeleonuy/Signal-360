# Google API Client Documentation

## Overview

The Enhanced Google API Client provides real financial data fetching capabilities for the Signal-360 platform. It integrates with multiple data sources including Google Custom Search API, Alpha Vantage, and Financial Modeling Prep to provide comprehensive fundamental analysis data.

## Features

- **Real Data Fetching**: Integrates with actual financial APIs
- **Multiple Data Sources**: Primary and fallback data sources for reliability
- **Comprehensive Analysis**: Company info, financial statements, ratios, and metrics
- **Error Handling**: Graceful fallback to mock data when APIs fail
- **Retry Logic**: Automatic retry with exponential backoff
- **Data Validation**: Ensures data quality and consistency
- **Performance Optimization**: Efficient API calls and data processing

## Usage

### Basic Usage

```typescript
import { createGoogleApiClient } from './googleApiService.ts';

// Create client with API key
const client = createGoogleApiClient(apiKey, logger);

// Test connection
const isConnected = await client.testConnection();

// Get comprehensive fundamental data
const fundamentalData = await client.getFundamentalData('AAPL');
```

### Fundamental Analysis Data

```typescript
const data = await client.getFundamentalData('AAPL');

console.log('Company:', data.companyInfo.name);
console.log('Sector:', data.companyInfo.sector);
console.log('Market Cap:', data.companyInfo.marketCap);

console.log('Financial Ratios:');
console.log('- ROE:', data.financialRatios.profitability.roe);
console.log('- Current Ratio:', data.financialRatios.liquidity.currentRatio);
console.log('- Debt/Equity:', data.financialRatios.leverage.debtToEquity);

console.log('Growth Metrics:');
console.log('- Revenue Growth:', data.growthMetrics.revenueGrowth);
console.log('- Earnings Growth:', data.growthMetrics.earningsGrowth);

console.log('Data Sources:', data.dataSources);
```

### Individual Components

```typescript
// Get company information only
const companyInfo = await client.getCompanyInfo('AAPL');

// Get financial statements only
const statements = await client.getFinancialStatements('AAPL');
```

## Data Sources

### Primary Sources

1. **Google Custom Search API**
   - Company information and profile data
   - Market sentiment and news
   - Requires Google API key

2. **Alpha Vantage (Free Tier)**
   - Financial statements (Income, Balance Sheet, Cash Flow)
   - Company overview and key metrics
   - Market data and ratios

### Fallback Sources

3. **Financial Modeling Prep**
   - Alternative financial statements
   - Market data and ratios
   - Company profiles

4. **Generated Mock Data**
   - Consistent, realistic financial data
   - Used when all APIs fail
   - Seeded random generation for consistency

## Data Structure

### FundamentalAnalysisData

```typescript
interface FundamentalAnalysisData {
    ticker: string;
    companyInfo: CompanyInfo;
    financialStatements: FinancialStatement[];
    financialRatios: FinancialRatios;
    growthMetrics: GrowthMetrics;
    qualityIndicators: QualityIndicators;
    dataSources: string[];
    lastUpdated: string;
}
```

### CompanyInfo

```typescript
interface CompanyInfo {
    name: string;
    sector: string;
    industry: string;
    marketCap: number;
    sharesOutstanding: number;
    currentPrice: number;
    peRatio: number;
    pbRatio: number;
    dividendYield: number;
    beta: number;
    description?: string;
    website?: string;
    employees?: number;
}
```

### FinancialRatios

```typescript
interface FinancialRatios {
    profitability: {
        roe: number;           // Return on Equity
        roa: number;           // Return on Assets
        netMargin: number;     // Net Profit Margin
        grossMargin: number;   // Gross Profit Margin
        operatingMargin: number; // Operating Margin
    };
    liquidity: {
        currentRatio: number;  // Current Assets / Current Liabilities
        quickRatio: number;    // Quick Assets / Current Liabilities
        cashRatio: number;     // Cash / Current Liabilities
    };
    leverage: {
        debtToEquity: number;      // Total Debt / Shareholder Equity
        debtRatio: number;         // Total Debt / Total Assets
        equityRatio: number;       // Shareholder Equity / Total Assets
        timesInterestEarned: number; // EBIT / Interest Expense
    };
    efficiency: {
        assetTurnover: number;     // Revenue / Total Assets
        inventoryTurnover: number; // COGS / Average Inventory
        receivablesTurnover: number; // Revenue / Average Receivables
    };
    valuation: {
        peRatio: number;       // Price / Earnings
        pbRatio: number;       // Price / Book Value
        psRatio: number;       // Price / Sales
        pegRatio: number;      // P/E / Growth Rate
        evToEbitda: number;    // Enterprise Value / EBITDA
    };
}
```

## Error Handling

### GoogleApiError Class

```typescript
try {
    const data = await client.getFundamentalData('AAPL');
} catch (error) {
    if (error instanceof GoogleApiError) {
        console.log('Status Code:', error.statusCode);
        console.log('User Message:', error.getUserMessage());
        console.log('Is Retryable:', error.isRetryable());
    }
}
```

### Common Error Scenarios

1. **Invalid API Key (401/403)**
   - User message: "Invalid or expired Google API key"
   - Action: Redirect user to update API key

2. **Rate Limit Exceeded (429)**
   - User message: "Google API rate limit exceeded"
   - Action: Retry after delay or queue request

3. **Service Unavailable (500/502/503/504)**
   - User message: "Google API service temporarily unavailable"
   - Action: Use fallback data sources

4. **Network Errors**
   - Automatic retry with exponential backoff
   - Fallback to alternative data sources
   - Generate mock data as last resort

## Configuration

### API Client Configuration

```typescript
const config = {
    apiKey: 'your-google-api-key',
    customSearchEngineId: '017576662512468239146:omuauf_lfve',
    timeout: 30000,
    retryAttempts: 3,
    rateLimitDelay: 1000
};
```

### Environment Variables

```bash
# Required for Google API integration
GOOGLE_API_KEY=your-api-key-here
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=your-search-engine-id

# Optional fallback API keys
ALPHA_VANTAGE_API_KEY=demo
FINANCIAL_MODELING_PREP_API_KEY=demo
```

## Performance Considerations

### API Call Optimization

- **Parallel Requests**: Company info and financial statements fetched concurrently
- **Connection Reuse**: HTTP connections reused for multiple requests
- **Timeout Management**: 30-second timeout with retry logic
- **Rate Limiting**: Built-in delays to respect API limits

### Data Processing

- **Efficient Calculations**: Financial ratios calculated in single pass
- **Memory Management**: Large datasets processed in chunks
- **Caching**: Results cached to avoid repeated API calls
- **Lazy Loading**: Data fetched only when needed

## Integration with Analysis Pipeline

### Fundamental Analysis Integration

```typescript
// In fundamental-analysis function
const { createGoogleApiClient } = await import('../_shared/services/googleApiService.ts');
const googleApiClient = createGoogleApiClient(apiKey, logger);

const fundamentalData = await googleApiClient.getFundamentalData(ticker);

// Use real data for analysis
const score = calculateAnalysisScore(fundamentalData);
const factors = generateAnalysisFactors(fundamentalData);
```

### Asynchronous Analysis Integration

```typescript
// In start-analysis function
import { getValidatedApiKey } from '../_shared/analysis-orchestrator.ts';

const apiKey = await getValidatedApiKey(userId, requestId);
const client = createGoogleApiClient(apiKey);

// Progress tracking
updateProgress(25, 'data_fetching');
const data = await client.getFundamentalData(ticker);

updateProgress(75, 'analysis_processing');
// Process the real data...
```

## Testing

### Unit Tests
```bash
deno test supabase/functions/_shared/services/__tests__/googleApiService.test.ts
```

### Integration Tests
```bash
deno test supabase/functions/_shared/services/__tests__/integration.test.ts
```

### Test Coverage

- ✅ API key validation and format checking
- ✅ Client creation and configuration
- ✅ Fundamental data structure validation
- ✅ Financial ratio calculations
- ✅ Growth metrics computation
- ✅ Error handling and fallback mechanisms
- ✅ Mock data consistency
- ✅ Multiple ticker support
- ✅ Performance characteristics

## Security

### API Key Protection

- **No Logging**: API keys never logged in plain text
- **Memory Safety**: Keys cleared after use
- **Validation**: Format and functionality validation
- **Error Sanitization**: Error messages don't expose keys

### Data Privacy

- **User Isolation**: Each user's data kept separate
- **Audit Trail**: API usage tracked without sensitive data
- **Secure Transmission**: All API calls over HTTPS
- **Data Retention**: Temporary caching only

## Troubleshooting

### Common Issues

1. **"API key is required"**
   - Ensure API key is provided to createGoogleApiClient
   - Check API key is not empty or null

2. **"Invalid API key format"**
   - Verify key starts with 'AIza' and is 39 characters
   - Check for extra spaces or characters

3. **"Google API service temporarily unavailable"**
   - Check Google API status page
   - Verify network connectivity
   - Try again after a few minutes

4. **"No fundamental data available"**
   - All data sources failed
   - Using generated mock data as fallback
   - Check API quotas and limits

### Debug Information

```typescript
// Enable debug logging
const client = createGoogleApiClient(apiKey, debugLogger);

// Test API connection
const isConnected = await client.testConnection();
console.log('API Connected:', isConnected);

// Check data sources used
const data = await client.getFundamentalData('AAPL');
console.log('Data Sources:', data.dataSources);
```

## Future Enhancements

- **Real-time Data**: WebSocket connections for live updates
- **More Data Sources**: Additional financial data providers
- **Advanced Caching**: Redis-based distributed caching
- **Machine Learning**: AI-powered data quality assessment
- **Custom Metrics**: User-defined financial ratios and indicators