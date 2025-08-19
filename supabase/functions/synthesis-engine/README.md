# Synthesis Engine Edge Function

This Edge Function combines fundamental, technical, and ESG analysis results using context-aware weighting to generate a unified investment recommendation. It's the core intelligence of the Signal-360 backend analysis system, identifying convergence and divergence patterns across different analysis types to produce actionable insights.

## Endpoint

```
POST /functions/v1/synthesis-engine
```

## Authentication

This function does not require user authentication as it's designed to be called internally by the main analysis orchestrator. It processes pre-validated analysis results from other Edge Functions.

## Request Format

```json
{
  "ticker_symbol": "AAPL",
  "analysis_context": "investment",
  "trading_timeframe": "1M",
  "fundamental_result": {
    "score": 75,
    "factors": [...],
    "details": {...},
    "confidence": 0.85
  },
  "technical_result": {
    "score": 68,
    "factors": [...],
    "details": {...},
    "confidence": 0.82
  },
  "esg_result": {
    "score": 78,
    "factors": [...],
    "details": {...},
    "confidence": 0.85
  }
}
```

### Request Parameters

- `ticker_symbol` (string, required): Stock ticker symbol
- `analysis_context` (string, required): Either "investment" or "trading"
- `trading_timeframe` (string, optional): Trading timeframe for context adjustments
- `fundamental_result` (object, required): Complete fundamental analysis output
- `technical_result` (object, required): Complete technical analysis output
- `esg_result` (object, required): Complete ESG analysis output

## Response Format

### Success Response (200)

```json
{
  "success": true,
  "data": {
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
    "divergence_factors": [
      {
        "category": "analysis_conflict",
        "description": "fundamental analysis significantly stronger than technical (7 point difference)",
        "weight": 0.07,
        "conflicting_analyses": ["fundamental", "technical"],
        "metadata": {
          "fundamental_score": 75,
          "technical_score": 68,
          "score_difference": 7,
          "stronger_analysis": "fundamental"
        }
      }
    ],
    "full_report": {
      "summary": "AAPL receives a synthesis score of 73/100 for investment, resulting in a BUY recommendation...",
      "recommendation": "buy",
      "fundamental": {...},
      "technical": {...},
      "esg": {...},
      "synthesis_methodology": "This analysis uses a weighted synthesis approach optimized for investment...",
      "limitations": [...],
      "metadata": {
        "analysis_timestamp": "2024-01-01T12:00:00.000Z",
        "data_sources": ["fundamental-analysis", "technical-analysis", "esg-analysis"],
        "api_version": "1.0.0"
      }
    },
    "confidence": 0.84
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
    "code": "INVALID_PARAMETER",
    "message": "Invalid analysis context",
    "details": "Additional error details if available"
  },
  "request_id": "req_1234567890_abcdef123",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Synthesis Algorithm

### Context-Aware Weighting

#### Investment Context (Long-term Focus)
- **Fundamental Analysis**: 50% weight
- **ESG Analysis**: 30% weight  
- **Technical Analysis**: 20% weight

#### Trading Context (Short-term Focus)
- **Technical Analysis**: 60% weight
- **Fundamental Analysis**: 25% weight
- **ESG Analysis**: 15% weight

### Timeframe Adjustments (Trading Context)

The system applies dynamic weight adjustments based on trading timeframe:

- **1D (Day Trading)**: Technical 1.3x, Fundamental 0.7x, ESG 0.5x
- **1W (Swing Trading)**: Technical 1.2x, Fundamental 0.8x, ESG 0.6x
- **1M (Short-term)**: Technical 1.1x, Fundamental 0.9x, ESG 0.8x
- **3M (Medium-term)**: Technical 1.0x, Fundamental 1.0x, ESG 0.9x
- **6M (Long-term)**: Technical 0.9x, Fundamental 1.1x, ESG 1.0x
- **1Y (Investment)**: Technical 0.8x, Fundamental 1.2x, ESG 1.1x

### Score Calculation Process

1. **Weighted Base Score**: Calculate weighted average of component scores
2. **Convergence/Divergence Adjustment**: Apply factor-based adjustments
3. **Context Adjustment**: Apply investment/trading context modifiers
4. **Timeframe Adjustment**: Apply timeframe-specific multipliers
5. **Boundary Enforcement**: Ensure final score is within 0-100 range

## Convergence Factor Analysis

### Strong Positive Convergence
- **Trigger**: All analysis scores ≥70 with average ≥75
- **Weight**: 0.9
- **Impact**: Significant positive adjustment to synthesis score

### Strong Negative Convergence  
- **Trigger**: All analysis scores ≤40 with average ≤35
- **Weight**: 0.8
- **Impact**: Significant negative adjustment to synthesis score

### Thematic Convergence
- **Growth Convergence**: Multiple analyses identify growth themes
- **Profitability Convergence**: Cross-analysis profitability agreement
- **Risk Convergence**: Consistent risk factor identification
- **Quality Convergence**: Management/governance quality agreement

### Score Alignment
- **Trigger**: Standard deviation ≤10 across all scores
- **Weight**: 0.6
- **Impact**: Confidence boost for aligned analyses

## Divergence Factor Analysis

### Score Divergence
- **Trigger**: Score range ≥30 points between analyses
- **Weight**: Proportional to divergence magnitude
- **Impact**: Highlights conflicting signals

### Analysis Conflicts
- **Fundamental vs Technical**: Long-term vs short-term signal conflicts
- **Time Horizon Conflicts**: Short-term technical vs long-term fundamentals
- **Confidence Conflicts**: Significant confidence variation between analyses

### Conflict Resolution
- **Context Priority**: Analysis context determines conflict resolution
- **Confidence Weighting**: Higher confidence analyses get more weight
- **Timeframe Alignment**: Timeframe-appropriate analysis prioritization

## Recommendation Scale

### Synthesis Score to Recommendation Mapping
- **80-100**: Strong Buy (Exceptional opportunity across all factors)
- **60-79**: Buy (Positive signals outweigh concerns)
- **40-59**: Hold (Mixed signals, neutral recommendation)
- **20-39**: Sell (Negative signals outweigh positives)
- **0-19**: Strong Sell (Significant concerns across all factors)

## Confidence Calculation

### Weighted Confidence
- Uses context-appropriate weighting of component confidences
- **Investment**: Fundamental (50%) + ESG (30%) + Technical (20%)
- **Trading**: Technical (60%) + Fundamental (25%) + ESG (15%)

### Consistency Penalty
- Reduces confidence for inconsistent component confidences
- **Penalty**: 0.2x confidence range across components
- **Example**: If confidences are [0.9, 0.6, 0.8], penalty = 0.2 × (0.9-0.6) = 0.06

### Final Confidence Range
- **Minimum**: 0.1 (always maintain some confidence)
- **Maximum**: 1.0 (perfect confidence)
- **Typical Range**: 0.6-0.9 for quality analyses

## Analysis Report Generation

### Summary Generation
- **Components**: Ticker, score, recommendation, key insights
- **Convergence Highlights**: Most significant positive factors
- **Divergence Warnings**: Most significant concerns
- **Component Scores**: Individual analysis scores

### Methodology Explanation
- **Weighting Strategy**: Context-specific weight explanation
- **Timeframe Adjustments**: Trading timeframe modifications
- **Factor Analysis**: Convergence/divergence methodology

### Limitations Identification
- **Confidence-based**: Low confidence warnings
- **Context-specific**: Trading timeframe limitations
- **Component-specific**: Individual analysis limitations
- **General**: Standard investment disclaimers

## Error Codes

- `MISSING_PARAMETER` (400): Required parameter missing
- `INVALID_PARAMETER` (400): Invalid parameter value or format
- `PROCESSING_ERROR` (500): Synthesis processing failure
- `METHOD_NOT_ALLOWED` (405): HTTP method not allowed

## Usage Example

```bash
curl -X POST https://your-project.supabase.co/functions/v1/synthesis-engine \
  -H "Content-Type: application/json" \
  -d '{
    "ticker_symbol": "AAPL",
    "analysis_context": "investment",
    "fundamental_result": {...},
    "technical_result": {...},
    "esg_result": {...}
  }'
```

## Internal Usage

This function is primarily used by the main analysis orchestrator:

```typescript
// Example usage in analyze-ticker function
const { data, error } = await supabase.functions.invoke('synthesis-engine', {
  body: {
    ticker_symbol: 'AAPL',
    analysis_context: 'investment',
    fundamental_result: fundamentalAnalysis,
    technical_result: technicalAnalysis,
    esg_result: esgAnalysis
  }
});

if (data) {
  const synthesisResult = data as SynthesisOutput;
  // Store final analysis result
}
```

## Testing

Run the unit tests:

```bash
deno test supabase/functions/synthesis-engine/synthesis-engine.test.ts --allow-all
```

## Performance

- **Average Processing Time**: 100-300ms (pure computation)
- **Memory Usage**: ~2-5MB per synthesis
- **Concurrent Requests**: Supported (stateless operation)
- **External Dependencies**: None (processes provided data)
- **Scalability**: Horizontally scalable

## Environment Variables

### Required
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key

### Analysis Weighting Configuration
- `INVESTMENT_FUNDAMENTAL_WEIGHT`: Investment fundamental weight (default: 0.5)
- `INVESTMENT_TECHNICAL_WEIGHT`: Investment technical weight (default: 0.2)
- `INVESTMENT_ESG_WEIGHT`: Investment ESG weight (default: 0.3)
- `TRADING_FUNDAMENTAL_WEIGHT`: Trading fundamental weight (default: 0.25)
- `TRADING_TECHNICAL_WEIGHT`: Trading technical weight (default: 0.6)
- `TRADING_ESG_WEIGHT`: Trading ESG weight (default: 0.15)

## Security Considerations

1. **Input Validation**: Validates all analysis results and parameters
2. **Score Validation**: Ensures all scores are within valid ranges (0-100)
3. **Context Validation**: Validates analysis context and timeframe parameters
4. **Error Handling**: Secure error messages without sensitive data exposure
5. **Logging**: Logs synthesis attempts without sensitive analysis data

## Monitoring

The function logs the following events:
- Synthesis start/completion with ticker and context
- Score calculations and weighting applications
- Convergence/divergence factor identification
- Final recommendation generation
- Processing errors and validation failures
- Request metadata and timing

## Algorithm Validation

### Weighting Validation
- All weights sum to 1.0 after normalization
- Timeframe adjustments maintain proportional relationships
- Context-specific weights align with investment/trading priorities

### Score Validation
- Synthesis scores always within 0-100 range
- Convergence factors provide positive score adjustments
- Divergence factors highlight conflicting signals appropriately

### Confidence Validation
- Confidence calculations use appropriate weighting
- Consistency penalties applied fairly
- Final confidence within valid range (0.1-1.0)

## Related Functions

- [`analyze-ticker`](../analyze-ticker/README.md): Main orchestrator that calls this function
- [`fundamental-analysis`](../fundamental-analysis/README.md): Provides fundamental analysis input
- [`technical-analysis`](../technical-analysis/README.md): Provides technical analysis input
- [`esg-analysis`](../esg-analysis/README.md): Provides ESG analysis input

## Troubleshooting

### Common Issues

1. **"Invalid analysis context"**
   - Ensure context is either "investment" or "trading"
   - Check parameter spelling and case sensitivity

2. **"Analysis scores must be between 0 and 100"**
   - Validate input analysis results have valid score ranges
   - Check for data corruption in analysis pipeline

3. **"Missing required parameter"**
   - Ensure all three analysis results are provided
   - Verify analysis result structure matches expected format

4. **Low synthesis confidence**
   - Check individual analysis confidence levels
   - Review convergence/divergence factors for conflicts
   - Consider data quality improvements

5. **Unexpected synthesis scores**
   - Review weighting configuration for context
   - Check timeframe adjustments for trading analysis
   - Validate convergence/divergence factor calculations