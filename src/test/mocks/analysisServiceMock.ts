import { vi } from 'vitest';
import { InvestmentAnalysisResponse, OpportunitySearchResponse } from '../../services/analysisService';

// Mock data that mimics real Gemini API responses
export const mockAnalysisResponse: InvestmentAnalysisResponse = {
  ticker: 'AAPL',
  marketData: {
    companyName: 'Apple Inc.',
    currentPrice: 175.50
  },
  verdict: {
    synthesisProfile: 'The Strategist',
    synthesisScore: 78,
    strategistVerdict: 'Apple demonstrates strong fundamentals with consistent innovation and robust financial performance. The company maintains a competitive moat through its ecosystem and brand loyalty.',
    convergenceFactors: [
      'Strong brand loyalty and ecosystem lock-in',
      'Consistent revenue growth and profitability',
      'Robust balance sheet with significant cash reserves'
    ],
    divergenceFactors: [
      'High valuation multiples compared to historical averages',
      'Increasing regulatory scrutiny in key markets',
      'Slowing growth in smartphone market'
    ]
  },
  fundamental: {
    businessModel: 'Apple operates a vertically integrated ecosystem of hardware, software, and services, generating revenue through device sales and recurring service subscriptions.',
    economicMoat: 'Strong brand loyalty, ecosystem lock-in effects, and superior user experience create significant switching costs for customers.',
    managementReview: 'Tim Cook has successfully navigated Apple through the post-Jobs era, maintaining innovation while expanding into services and new product categories.',
    keyFinancialRatios: {
      'Price/Earnings (P/E)': {
        value: '28.5',
        explanation: 'Trading at a premium to market average, reflecting strong growth prospects and market confidence.'
      },
      'Return on Equity (ROE)': {
        value: '147.4%',
        explanation: 'Exceptionally high ROE indicates efficient use of shareholder equity and strong profitability.'
      },
      'Debt-to-Equity': {
        value: '1.73',
        explanation: 'Moderate debt levels managed effectively with strong cash flow generation.'
      },
      'Net Profit Margin': {
        value: '25.3%',
        explanation: 'Industry-leading margins demonstrate pricing power and operational efficiency.'
      }
    },
    dcfAnalysis: {
      intrinsicValuePerShare: 185.20,
      assumptions: {
        revenueGrowthRate: '5.2%',
        ebitMargin: '30.1%',
        discountRate: '9.5%',
        perpetualGrowthRate: '2.5%',
        taxRate: '21.0%'
      }
    }
  },
  sentiment: {
    sentimentScore: 72,
    sentimentTrend: 'Stable',
    keyEchoes: [
      {
        source: 'Financial News',
        summary: 'Analysts remain optimistic about Apple\'s services growth and upcoming product launches.',
        individualSentimentScore: 15
      },
      {
        source: 'Social Media',
        summary: 'Mixed sentiment around new iPhone features but positive reception for Vision Pro.',
        individualSentimentScore: 8
      },
      {
        source: 'Analyst Reports',
        summary: 'Institutional investors maintain overweight positions despite valuation concerns.',
        individualSentimentScore: 12
      }
    ]
  },
  technical: {
    overallTrend: 'Uptrend',
    technicalSummary: 'AAPL is in a strong uptrend with support at $170 and resistance at $180. RSI indicates healthy momentum without being overbought.',
    keyLevels: {
      support: '$170.00',
      resistance: '$180.00'
    }
  }
};

export const mockOpportunityResponse: OpportunitySearchResponse = {
  opportunities: [
    {
      ticker: 'MSFT',
      companyName: 'Microsoft Corporation',
      opportunityThesis: 'Strong cloud growth and AI positioning with reasonable valuation. Consistent dividend growth and market-leading margins in enterprise software.'
    },
    {
      ticker: 'GOOGL',
      companyName: 'Alphabet Inc.',
      opportunityThesis: 'Dominant search position with growing cloud business. Trading at attractive valuation despite regulatory headwinds.'
    },
    {
      ticker: 'JNJ',
      companyName: 'Johnson & Johnson',
      opportunityThesis: 'Defensive healthcare play with strong pharmaceutical pipeline. Reliable dividend aristocrat with recession-resistant business model.'
    }
  ]
};

// Mock the entire analysis service module
export const mockAnalysisService = {
  getInvestmentAnalysis: vi.fn().mockResolvedValue(mockAnalysisResponse),
  getTradingAnalysis: vi.fn().mockResolvedValue(mockAnalysisResponse),
  findOpportunities: vi.fn().mockResolvedValue(mockOpportunityResponse)
};

// Mock the factory function
export const mockCreateAnalysisService = vi.fn().mockReturnValue(mockAnalysisService);