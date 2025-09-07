// Test script for synthesis engine
import { SynthesisInput } from '../_shared/types.ts';

// Mock test data
const mockSynthesisInput: SynthesisInput = {
  ticker_symbol: 'AAPL',
  analysis_context: 'investment',
  trading_timeframe: undefined,
  fundamental_result: {
    score: 75,
    factors: [
      {
        category: 'profitability',
        type: 'positive',
        description: 'Strong profit margins and ROE',
        weight: 0.8,
        confidence: 0.9
      }
    ],
    confidence: 0.85
  },
  technical_result: {
    score: 68,
    factors: [
      {
        category: 'momentum',
        type: 'positive',
        description: 'Upward trend with strong volume',
        weight: 0.7,
        confidence: 0.8
      }
    ],
    confidence: 0.8
  },
  esg_result: {
    score: 72,
    factors: [
      {
        category: 'governance',
        type: 'positive',
        description: 'Strong corporate governance practices',
        weight: 0.6,
        confidence: 0.75
      }
    ],
    confidence: 0.75
  }
};

console.log('Test data prepared for synthesis engine');
console.log('Input:', JSON.stringify(mockSynthesisInput, null, 2));