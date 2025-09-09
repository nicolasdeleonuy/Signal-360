// --- START OF REPLACEMENT CODE ---

import { GoogleGenerativeAI } from '@google/generative-ai';

// Types for the analysis response
// Note: priceTimestamp is now included for data freshness verification
export interface MarketData {
  companyName: string;
  currentPrice: number;
  currency: string;
  sharesOutstanding: number;
  marketCap: number;
  sector: string;
  industry: string;
  exchange: string;
  priceTimestamp?: string; // Inspired by Eco Corporativo for data freshness
}

export interface FundamentalAnalysis {
  businessModel: string;
  economicMoat: string;
  keyFinancialRatios: {
    peRatio: number;
    pbRatio: number;
    debtToEquity: number;
    roe: number;
    roic: number;
    currentRatio: number;
  };
  dcfAssumptions: {
    growthRate: number;
    discountRate: number;
    terminalGrowthRate: number;
    intrinsicValue: number;
  };
  fundamentalScore: number;
  strengths: string[];
  weaknesses: string[];
}

export interface SentimentAnalysis {
  marketPulse: string;
  newsEchoes: string[];
  socialMediaSentiment: string;
  analystRatings: {
    buy: number;
    hold: number;
    sell: number;
    averageTarget: number;
  };
  sentimentScore: number;
  keyDrivers: string[];
}

export interface TechnicalAnalysis {
  trend: 'uptrend' | 'downtrend' | 'sideways';
  support: number;
  resistance: number;
  technicalIndicators: {
    rsi: number;
    macd: string;
    movingAverages: {
      sma20: number;
      sma50: number;
      sma200: number;
    };
  };
  technicalScore: number;
  timingConfirmation: string;
}

export interface AnalysisVerdict {
  finalScore: number;
  recommendation: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';
  convergenceFactors: string[];
  divergenceFactors: string[];
  riskLevel: 'Low' | 'Medium' | 'High';
  timeHorizon: string;
  keyInsights: string[];
}

export interface InvestmentAnalysisResponse {
  ticker: string;
  marketData: MarketData;
  fundamental: FundamentalAnalysis;
  sentiment: SentimentAnalysis;
  technical: TechnicalAnalysis;
  verdict: AnalysisVerdict;
  analysisTimestamp: string;
}

// JSON Schema for Gemini's structured response (now includes priceTimestamp)
const ANALYSIS_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    ticker: { type: "string" },
    marketData: {
      type: "object",
      properties: {
        companyName: { type: "string" },
        currentPrice: { type: "number" },
        currency: { type: "string" },
        sharesOutstanding: { type: "number" },
        marketCap: { type: "number" },
        sector: { type: "string" },
        industry: { type: "string" },
        exchange: { type: "string" },
        priceTimestamp: { type: "string", format: "date-time" } // Added field
      },
      required: ["companyName", "currentPrice", "currency", "sharesOutstanding", "marketCap", "sector", "industry", "exchange"]
    },
    fundamental: {
      type: "object",
      properties: {
        businessModel: { type: "string" },
        economicMoat: { type: "string" },
        keyFinancialRatios: {
          type: "object",
          properties: {
            peRatio: { type: "number" },
            pbRatio: { type: "number" },
            debtToEquity: { type: "number" },
            roe: { type: "number" },
            roic: { type: "number" },
            currentRatio: { type: "number" }
          },
          required: ["peRatio", "pbRatio", "debtToEquity", "roe", "roic", "currentRatio"]
        },
        dcfAssumptions: {
          type: "object",
          properties: {
            growthRate: { type: "number" },
            discountRate: { type: "number" },
            terminalGrowthRate: { type: "number" },
            intrinsicValue: { type: "number" }
          },
          required: ["growthRate", "discountRate", "terminalGrowthRate", "intrinsicValue"]
        },
        fundamentalScore: { type: "number" },
        strengths: { type: "array", items: { type: "string" } },
        weaknesses: { type: "array", items: { type: "string" } }
      },
      required: ["businessModel", "economicMoat", "keyFinancialRatios", "dcfAssumptions", "fundamentalScore", "strengths", "weaknesses"]
    },
    sentiment: {
      type: "object",
      properties: {
        marketPulse: { type: "string" },
        newsEchoes: { type: "array", items: { type: "string" } },
        socialMediaSentiment: { type: "string" },
        analystRatings: {
          type: "object",
          properties: {
            buy: { type: "number" },
            hold: { type: "number" },
            sell: { type: "number" },
            averageTarget: { type: "number" }
          },
          required: ["buy", "hold", "sell", "averageTarget"]
        },
        sentimentScore: { type: "number" },
        keyDrivers: { type: "array", items: { type: "string" } }
      },
      required: ["marketPulse", "newsEchoes", "socialMediaSentiment", "analystRatings", "sentimentScore", "keyDrivers"]
    },
    technical: {
      type: "object",
      properties: {
        trend: { type: "string", enum: ["uptrend", "downtrend", "sideways"] },
        support: { type: "number" },
        resistance: { type: "number" },
        technicalIndicators: {
          type: "object",
          properties: {
            rsi: { type: "number" },
            macd: { type: "string" },
            movingAverages: {
              type: "object",
              properties: {
                sma20: { type: "number" },
                sma50: { type: "number" },
                sma200: { type: "number" }
              },
              required: ["sma20", "sma50", "sma200"]
            }
          },
          required: ["rsi", "macd", "movingAverages"]
        },
        technicalScore: { type: "number" },
        timingConfirmation: { type: "string" }
      },
      required: ["trend", "support", "resistance", "technicalIndicators", "technicalScore", "timingConfirmation"]
    },
    verdict: {
      type: "object",
      properties: {
        finalScore: { type: "number" },
        recommendation: { type: "string", enum: ["Strong Buy", "Buy", "Hold", "Sell", "Strong Sell"] },
        convergenceFactors: { type: "array", items: { type: "string" } },
        divergenceFactors: { type: "array", items: { type: "string" } },
        riskLevel: { type: "string", enum: ["Low", "Medium", "High"] },
        timeHorizon: { type: "string" },
        keyInsights: { type: "array", items: { type: "string" } }
      },
      required: ["finalScore", "recommendation", "convergenceFactors", "divergenceFactors", "riskLevel", "timeHorizon", "keyInsights"]
    },
    analysisTimestamp: { type: "string" }
  },
  required: ["ticker", "marketData", "fundamental", "sentiment", "technical", "verdict", "analysisTimestamp"]
};

export class AnalysisService {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async getInvestmentAnalysis(ticker: string): Promise<InvestmentAnalysisResponse> {
    try {
      console.log(`[AnalysisService] Starting investment analysis for ${ticker}...`);
      const marketData = await this.getMarketData(ticker);
      console.log(`[AnalysisService] Market data received for ${ticker}.`, marketData);
      const analysis = await this.performInvestmentAnalysis(ticker, marketData);
      console.log(`[AnalysisService] Full analysis received for ${ticker}.`, analysis);
      return analysis;
    } catch (error) {
      // --- ENHANCED ERROR LOGGING ---
      console.error(`[AnalysisService] CRITICAL FAILURE in getInvestmentAnalysis for ${ticker}:`, error);

      // Check if the error is from Gemini API and log details if possible
      if (error && typeof error === 'object' && 'message' in error) {
        console.error('[AnalysisService] Detailed Error Message:', (error as Error).message);
        if ('stack' in error) {
          console.error('[AnalysisService] Error Stack:', (error as Error).stack);
        }
      }

      throw new Error(`[FRONTEND-VISIBLE ERROR] Analysis failed for ${ticker}. Check console for details.`);
    }
  }

  async getTradingAnalysis(ticker: string, timeframe: string): Promise<InvestmentAnalysisResponse> {
    try {
      const marketData = await this.getMarketData(ticker);
      const analysis = await this.performTradingAnalysis(ticker, marketData, timeframe);
      return analysis;
    } catch (error) {
      console.error('Trading analysis failed:', error);
      throw new Error(`Failed to analyze ${ticker} for trading: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getMarketData(ticker: string): Promise<MarketData> {
    const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // --- CERBERUS PROMPT v1.0 ---
    // This prompt synthesizes techniques from Value Investor's Compass, Eco Corporativo, and QuantumLeap Speculator.
    const prompt = `
You are a specialized, high-frequency financial data feed API. Your sole function is to execute a real-time web search to fetch the most current, live trading price and associated data for the stock ticker "${ticker}".

**CRITICAL DIRECTIVES:**
1.  **NO CACHE:** You MUST NOT use your internal knowledge base or any cached data. Your only source is a live web search executed at this exact moment.
2.  **VERIFY SOURCE:** The data must come from a primary financial source (e.g., Google Finance, Yahoo Finance, a major exchange). Do not use prices from news articles.
3.  **STRICT OUTPUT:** Your response MUST BE ONLY the raw JSON object. Do not include any text, apologies, or markdown formatting before or after the JSON.
4.  **FAILURE CONDITION:** If you cannot definitively locate a live price, you MUST return a value of -1 for "currentPrice" and "null" for "priceTimestamp".

The JSON object you return must conform to the following structure. The instructions within the descriptions are MANDATORY.

{
  "companyName": "The full, official company name.",
  "currentPrice": "CRITICAL: Execute a live Google Search right now to find the most up-to-the-minute market price. The validity of the entire analysis depends on this data point. DO NOT use cached knowledge. If a live price is absolutely unavailable, return -1.",
  "currency": "The currency of the price (e.g., 'USD').",
  "sharesOutstanding": "The latest reported number for shares outstanding.",
  "marketCap": "The real-time market capitalization.",
  "sector": "The company's primary sector.",
  "industry": "The company's primary industry.",
  "exchange": "The primary stock exchange where the ticker is traded (e.g., 'NASDAQ').",
  "priceTimestamp": "CRITICAL: The exact timestamp of the price quote you just retrieved. Must be in strict ISO 8601 format with timezone. If a live price is unavailable, return null."
}`;

    // Configure the request with the correct tool name and optimal settings
    const request = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools: [{
        google_search_retrieval: {}, // Correct tool name as specified by the API
      }],
      generationConfig: {
        temperature: 0.1, // Low temperature for factual data retrieval
        maxOutputTokens: 2048, // Sufficient for JSON response
      }
    };

    try {
      console.log(`[AnalysisService] Executing live web search for ${ticker}...`);

      // @ts-ignore - Using correct API structure that may not be fully reflected in current SDK types
      const result = await model.generateContent(request);

      const responseText = result.response.text();
      console.log('Raw Market Data Response (Cerberus v1.3 - Live Search Enabled):', responseText);

      if (!responseText || responseText.trim().length === 0) {
        throw new Error('Empty response from Gemini API');
      }

      // Parse the market data from the response
      const marketData = this.parseMarketData(responseText);

      // Validate that we received live data
      if (marketData.currentPrice === -1 || marketData.priceTimestamp === null) {
        throw new Error(`[DATA_FETCH_FAILURE] Could not retrieve a live market price for ${ticker}. The data feed reported it as UNAVAILABLE.`);
      }

      console.log(`[AnalysisService] Successfully retrieved live market data for ${ticker}:`, {
        price: marketData.currentPrice,
        currency: marketData.currency,
        timestamp: marketData.priceTimestamp
      });

      return marketData;

    } catch (apiError) {
      console.error(`[AnalysisService] Gemini API call failed for ${ticker}:`, apiError);
      throw new Error(`Failed to fetch live market data: ${apiError instanceof Error ? apiError.message : 'Unknown API error'}`);
    }
  }

  private parseMarketData(jsonString: string): MarketData {
    try {
      // Robust regex to extract JSON from markdown or other text
      const jsonMatch = jsonString.match(/```json\n([\s\S]*?)\n```|(\{[\s\S]*\})/);
      if (!jsonMatch) {
        throw new Error("No valid JSON object found in the AI response.");
      }
      const cleanedJsonString = jsonMatch[1] || jsonMatch[2];
      return JSON.parse(cleanedJsonString);
    } catch (error) {
      console.error("Failed to parse market data:", error);
      throw new Error("Could not decode the market data JSON from the AI response.");
    }
  }

  private async performInvestmentAnalysis(ticker: string, marketData: MarketData): Promise<InvestmentAnalysisResponse> {
    const model = this.genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      generationConfig: {
        temperature: 0.2, // Lower temperature for more factual responses
        responseMimeType: "application/json",
        responseSchema: ANALYSIS_RESPONSE_SCHEMA
      }
    });

    // NEW "SUPER-PROMPT" integrating all our new intelligence
    const superPrompt = this.buildInvestmentPrompt(ticker, marketData);

    const result = await model.generateContent(superPrompt);
    const responseText = result.response.text();
    console.log('Raw AI Investment Analysis Response:', responseText);

    const analysisResponse = JSON.parse(responseText) as InvestmentAnalysisResponse;

    return {
      ...analysisResponse,
      analysisTimestamp: new Date().toISOString()
    };
  }

  private async performTradingAnalysis(ticker: string, marketData: MarketData, timeframe: string): Promise<InvestmentAnalysisResponse> {
    // This will be implemented in the next step, for now it can call the investment analysis as a fallback
    console.warn(`Trading analysis not fully implemented. Using investment analysis as a fallback for ${ticker}.`);
    return this.performInvestmentAnalysis(ticker, marketData);
  }

  private buildInvestmentPrompt(ticker: string, marketData: MarketData): string {
    // Super-Prompt v2 - "The Skeptic"
    return `
You are "The Skeptic", a world-class, deeply critical investment analyst. Your sole purpose is to identify risks and puncture inflated narratives. Your reputation is built on avoiding bad investments, not just finding good ones. You will analyze ${ticker} (${marketData.companyName}) with extreme prejudice.

**AI CONSTITUTION - YOUR CORE DIRECTIVES:**
1.  **Skepticism First:** Your default stance is disbelief. Every positive claim must be backed by multiple, quantifiable data points.
2.  **Data Over Narrative:** Ignore market hype. Your analysis must be grounded in the provided market data and verifiable financial metrics obtained via your search tool.
3.  **Valuation is King:** A great company at a terrible price is a terrible investment. Valuation risk is the most critical factor.
4.  **No Perfect Scores:** A score of 100 is theoretical and unattainable. A score above 85 implies a generational opportunity with almost no discernible risks, a situation you have likely never seen. A score of 50 represents a fairly valued, average-risk company.

**MARKET DATA CONTEXT (AS OF ${marketData.priceTimestamp || 'A RECENT TIMESTAMP'}):**
- Company: ${marketData.companyName}
- Current Price: ${marketData.currentPrice} ${marketData.currency}
- Market Cap: ${marketData.marketCap}

**MANDATORY ANALYSIS FRAMEWORK (EXECUTE IN THIS ORDER):**

**STEP 1: FUNDAMENTAL ANALYSIS (Weight: 60%)**
- **Business Model & Moat (Qualitative):** Briefly describe the business. Identify the economic moat type and critically assess its durability against specific, named competitors. Is the moat widening or narrowing? Provide evidence.
- **Financial Health (Quantitative):** Using your search tool, find and analyze these key ratios: P/E, P/S, P/FCF, Debt/Equity, and ROIC. For each, state the number and compare it to the 5-year average and the industry average.
- **Valuation (DCF - Internal Thought Process):** Generate a conservative DCF. Explicitly state your assumptions for growth rate, discount rate, and terminal rate. Justify them. The resulting intrinsic value is a key input for your final verdict.
- **Strengths & Weaknesses:** List 2-3 specific, data-backed strengths and weaknesses. Avoid generic statements.
- **Calculate Fundamental Score (0-100):** Start at 50. Add/subtract points based on a strict rubric. For example: High ROIC (>15%) adds points, high Debt/Equity (>1.0) subtracts points, P/E over 30 subtracts significant points. Show your work in the 'fundamentalScore' field.

**STEP 2: SENTIMENT ANALYSIS (Weight: 20%)**
- **Pulse Check:** Analyze recent news headlines and social media chatter. Is the sentiment euphoric (a warning sign) or fearful (a potential opportunity)?
- **Analyst Ratings:** Summarize the consensus of professional analysts. Note the ratio of buy/hold/sell ratings.
- **Calculate Sentiment Score (0-100):** A score of 50 is neutral. Widespread euphoria should result in a LOWER score due to contrarian risk.

**STEP 3: TECHNICAL ANALYSIS (Weight: 20%)**
- **Long-Term Trend:** Is the stock in a long-term uptrend, downtrend, or range-bound based on the 50 and 200-day moving averages?
- **Key Levels:** Identify the nearest major long-term support and resistance levels.
- **Calculate Technical Score (0-100):** A score of 50 is neutral. A strong, confirmed uptrend scores higher. A stock below its 200-day MA should be penalized.

**STEP 4: FINAL SYNTHESIS & VERDICT**
- **Calculate Final Score:** Use this precise, weighted formula: (Fundamental Score * 0.6) + (Sentiment Score * 0.2) + (Technical Score * 0.2). The result is the 'finalScore'.
- **Identify Convergence/Divergence:** What factors from the three analyses align? Where do they conflict? (e.g., "Strong fundamentals conflict with bearish technicals").
- **Determine Recommendation:** Base the 'recommendation' strictly on the 'finalScore' and the relationship between 'currentPrice' and your calculated 'intrinsicValue'. If price is well above intrinsic value, a 'Sell' or 'Hold' is mandatory, regardless of other factors.
- **Define Risk Level:** Assess the primary risks (valuation, competition, regulatory, etc.) and assign a 'riskLevel'.

Now, execute this entire process for ${ticker} and return ONLY the JSON object conforming to the required schema. Do not add any text before or after the JSON.
`;
  }

  private buildTradingPrompt(ticker: string, marketData: MarketData, timeframe: string): string {
    // Placeholder for the next step, will be upgraded with QuantumLeap logic
    return this.buildInvestmentPrompt(ticker, marketData);
  }
}

// Factory function
export const createAnalysisService = (apiKey: string): AnalysisService => {
  return new AnalysisService(apiKey);
};

// --- END OF REPLACEMENT CODE ---