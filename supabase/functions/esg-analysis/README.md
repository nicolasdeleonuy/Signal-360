# ESG Analysis Edge Function

This Edge Function performs comprehensive ESG (Environmental, Social, Governance) analysis of stocks by evaluating environmental impact, social responsibility, and governance practices. It's part of the Signal-360 backend analysis system and provides detailed insights into a company's sustainability profile and ESG risk factors.

## Endpoint

```
POST /functions/v1/esg-analysis
```

## Authentication

This function does not require user authentication as it's designed to be called internally by other Edge Functions. However, it requires a valid Google API key for external ESG data API calls.

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
    "score": 78,
    "factors": [
      {
        "category": "esg",
        "type": "positive",
        "description": "Strong ESG rating of AA (75/100)",
        "weight": 0.9,
        "confidence": 0.8
      },
      {
        "category": "esg",
        "type": "positive",
        "description": "High renewable energy adoption (78/100)",
        "weight": 0.7,
        "confidence": 0.7
      },
      {
        "category": "esg",
        "type": "positive",
        "description": "Comprehensive sustainability reporting and climate commitments",
        "weight": 0.6,
        "confidence": 0.8
      }
    ],
    "details": {
      "environmental_score": 78,
      "social_score": 72,
      "governance_score": 75,
      "sustainability_metrics": {
        "sustainability_reporting": 100,
        "climate_commitments": 100,
        "stakeholder_engagement": 68,
        "sustainability_innovation": 72,
        "regulatory_compliance": 85,
        "environmental_controversies": 1,
        "social_controversies": 0,
        "governance_controversies": 0
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

## ESG Analysis Components

### Environmental Factors (E)
- **Carbon Management**: Emissions, intensity, reduction targets
- **Energy Efficiency**: Renewable energy adoption, energy management
- **Resource Management**: Water usage, waste management practices
- **Biodiversity Impact**: Environmental footprint and conservation
- **Environmental Controversies**: Regulatory violations, incidents

### Social Factors (S)
- **Human Rights**: Labor standards, human rights policies
- **Employee Relations**: Safety, diversity & inclusion, working conditions
- **Community Impact**: Community relations, social investment
- **Product Responsibility**: Safety, quality, accessibility
- **Data Privacy**: Information security, privacy protection
- **Social Controversies**: Labor disputes, safety incidents

### Governance Factors (G)
- **Board Composition**: Independence, diversity, expertise
- **Executive Compensation**: Alignment with performance, transparency
- **Shareholder Rights**: Voting rights, minority protection
- **Business Ethics**: Anti-corruption, ethical business practices
- **Transparency**: Financial reporting, disclosure quality
- **Risk Management**: Internal controls, audit quality
- **Governance Controversies**: Regulatory issues, ethical violations

### Sustainability Metrics
- **Reporting Standards**: Sustainability reporting frameworks (GRI, SASB, TCFD)
- **Climate Commitments**: Net-zero targets, science-based targets
- **Sustainability Goals**: UN SDG alignment, ESG targets
- **Green Financing**: Green bonds, sustainable finance initiatives
- **Stakeholder Engagement**: Multi-stakeholder dialogue and partnerships
- **Innovation**: Sustainable product development, circular economy

## Scoring Algorithm

### ESG Score Calculation (0-100)
- **Base Score**: Composite of Environmental (33%), Social (33%), Governance (33%)
- **Controversy Adjustment**: Deductions for environmental, social, governance issues
- **Sustainability Bonus**: Additional points for strong sustainability commitments
- **Context Adjustment**: Investment context (1.0x), Trading context (0.8x + 20 base)

### Factor Generation
Factors are generated based on:
- **Strong ESG Performance**: Overall rating ≥70 (AAA, AA, A ratings)
- **Environmental Excellence**: Renewable energy ≥70, carbon management ≥70
- **Social Leadership**: Diversity & inclusion ≥70, employee safety ≥75
- **Governance Strength**: Board composition & transparency ≥70, business ethics ≥75
- **Sustainability Commitment**: Comprehensive reporting + climate commitments
- **Controversy Impact**: Environmental, social, governance issues

### ESG Rating Scale
- **AAA**: 80-100 (ESG Leader)
- **AA**: 70-79 (ESG Strong)
- **A**: 60-69 (ESG Good)
- **BBB**: 50-59 (ESG Average)
- **BB**: 40-49 (ESG Laggard)
- **B**: 30-39 (ESG Poor)
- **CCC**: 0-29 (ESG Critical)

### Confidence Calculation
Confidence is adjusted for:
- **Data Recency**: Higher confidence for recent ESG data (< 90 days)
- **Data Source Quality**: Real ESG ratings vs estimated scores
- **Sustainability Reporting**: Companies with formal ESG reporting
- **Industry Coverage**: Better coverage for large-cap, developed market companies

## Sector-Specific Adjustments

### Environmental Scoring
- **Technology**: 1.2x multiplier (generally cleaner operations)
- **Healthcare**: 1.1x multiplier (lower environmental impact)
- **Financial Services**: 1.15x multiplier (service-based business)
- **Energy**: 0.7x multiplier (high environmental impact sector)
- **Materials**: 0.75x multiplier (resource-intensive operations)
- **Utilities**: 0.8x multiplier (carbon-intensive sector)

### Social Scoring
- **Healthcare**: 1.2x multiplier (positive social impact)
- **Technology**: 1.1x multiplier (innovation and access)
- **Energy**: 0.85x multiplier (community and safety concerns)
- **Materials**: 0.9x multiplier (labor and safety risks)

### Governance Scoring
- **Country Adjustments**: Higher multipliers for countries with strong regulatory frameworks
- **Size Adjustments**: Large-cap companies often have better governance practices
- **Market Maturity**: Developed markets typically have stronger governance standards

## External API Integration

### Data Sources
- **Financial Modeling Prep API**: Primary source for ESG data
- **Company Profiles**: Sector, industry, country, size information
- **ESG Ratings**: When available from data providers

### API Endpoints Used
- `/api/v4/esg-environmental-social-governance-data`: ESG scores and ratings
- `/api/v3/profile/{ticker}`: Company profile for context

### Data Estimation
When real ESG data is unavailable, the system generates realistic estimates based on:
- **Sector Characteristics**: Industry-typical ESG performance patterns
- **Company Size**: Market cap influence on ESG practices
- **Geographic Location**: Country-specific governance and regulatory standards
- **Industry Benchmarks**: Peer comparison and industry averages

## Error Codes

- `MISSING_PARAMETER` (400): Required parameter missing
- `INVALID_TICKER` (400): Invalid ticker symbol format
- `INVALID_API_KEY` (400): Invalid Google API key format
- `INVALID_PARAMETER` (400): Invalid analysis context
- `PROCESSING_ERROR` (500): ESG analysis processing failure
- `EXTERNAL_API_ERROR` (502): External API failure
- `RATE_LIMIT_EXCEEDED` (429): API rate limit exceeded
- `METHOD_NOT_ALLOWED` (405): HTTP method not allowed

## Usage Example

```bash
curl -X POST https://your-project.supabase.co/functions/v1/esg-analysis \
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
const { data, error } = await supabase.functions.invoke('esg-analysis', {
  body: {
    ticker_symbol: 'AAPL',
    api_key: decryptedApiKey,
    analysis_context: 'investment'
  }
});

if (data) {
  const esgResult = data as ESGAnalysisOutput;
  // Use in synthesis engine
}
```

## Testing

Run the unit tests:

```bash
deno test supabase/functions/esg-analysis/esg-analysis.test.ts --allow-all
```

## Performance

- **Average Analysis Time**: 2-4 seconds (depending on API response times)
- **Memory Usage**: ~4-8MB per analysis
- **Concurrent Requests**: Supported (stateless operation)
- **External API Calls**: 2 requests per analysis (ESG data + company profile)
- **Caching**: Recommended for production (24-hour cache for ESG data)

## Environment Variables

### Required
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key

### Optional
- `EXTERNAL_API_TIMEOUT`: API timeout in ms (default: 30000)
- `MAX_RETRIES`: Maximum retry attempts (default: 3)
- `BASE_RETRY_DELAY`: Base retry delay in ms (default: 1000)
- `ESG_DATA_CACHE_TIMEOUT`: Cache timeout in ms (default: 86400000)

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
- ESG score calculations and factor generation
- Data source usage (real vs estimated ESG data)
- External API call attempts and failures
- Processing errors and timeouts
- Request metadata and timing

## Limitations

1. **Data Availability**: ESG data coverage varies by company and region
2. **Data Lag**: ESG ratings are typically updated quarterly or annually
3. **Estimation Quality**: Estimated scores are less accurate than real ESG data
4. **Sector Bias**: Some sectors inherently score lower on certain ESG factors
5. **Regional Differences**: ESG standards and reporting vary by country
6. **API Costs**: External ESG data APIs may incur significant costs

## ESG Data Providers

### Primary Sources (when available)
- **MSCI ESG Ratings**: Industry-leading ESG scores and research
- **Sustainalytics**: ESG risk ratings and controversy assessments
- **Refinitiv (LSEG)**: Comprehensive ESG data and scores
- **S&P Global ESG Scores**: Corporate sustainability assessments

### Fallback Estimation
When primary ESG data is unavailable, the system uses:
- **Sector-based modeling**: Industry-typical ESG performance patterns
- **Size-based adjustments**: Market cap correlation with ESG practices
- **Geographic factors**: Country-specific governance and regulatory standards
- **Public information**: News, regulatory filings, sustainability reports

## Related Functions

- [`analyze-ticker`](../analyze-ticker/README.md): Main orchestrator that calls this function
- [`fundamental-analysis`](../fundamental-analysis/README.md): Financial analysis counterpart
- [`technical-analysis`](../technical-analysis/README.md): Technical analysis counterpart
- [`synthesis-engine`](../synthesis-engine/README.md): Combines all analysis results

## Troubleshooting

### Common Issues

1. **"No ESG data available"**
   - Check if company is covered by ESG data providers
   - Verify ticker symbol is correct
   - Consider that smaller companies may have limited ESG coverage

2. **"Low confidence scores"**
   - ESG data may be outdated or estimated
   - Consider upgrading to premium ESG data sources
   - Check if company publishes sustainability reports

3. **"External API error"**
   - Check API key validity and quotas
   - Verify ESG data provider service status
   - Check network connectivity

4. **Inconsistent ESG scores**
   - ESG methodologies vary between providers
   - Scores may change with updated ESG assessments
   - Consider using multiple ESG data sources

5. **Sector bias in scoring**
   - Some industries (energy, materials) naturally score lower
   - Consider peer comparison within sector
   - Focus on improvement trends rather than absolute scores