// --- START OF REPLACEMENT CODE ---

import { GoogleGenerativeAI } from '@google/generative-ai';

// Precise TypeScript interfaces matching our schema
export interface AnalysisVerdict {
  synthesisProfile: string;
  synthesisScore: number;
  strategistVerdict: string;
  convergenceFactors: string[];
  divergenceFactors: string[];
}

export interface FundamentalAnalysis {
  businessModel: string;
  economicMoat: string;
  managementReview: string;
  keyFinancialRatios: {
    "Price/Earnings (P/E)": { value: string; explanation: string };
    "Return on Equity (ROE)": { value: string; explanation: string };
    "Debt-to-Equity": { value: string; explanation: string };
    "Net Profit Margin": { value: string; explanation: string };
  };
  dcfAnalysis: {
    intrinsicValuePerShare: number;
    assumptions: {
      revenueGrowthRate: string;
      ebitMargin: string;
      discountRate: string;
      perpetualGrowthRate: string;
      taxRate: string;
    };
  };
}

export interface SentimentAnalysis {
  sentimentScore: number;
  sentimentTrend: "Improving" | "Stable" | "Worsening";
  keyEchoes: Array<{
    source: string;
    summary: string;
    individualSentimentScore: number;
  }>;
}

export interface TechnicalAnalysis {
  overallTrend: "Uptrend" | "Downtrend" | "Sideways";
  technicalSummary: string;
  keyLevels: {
    support: string;
    resistance: string;
  };
}

export interface MarketData {
  companyName: string;
  currentPrice: number;
}

export interface InvestmentAnalysisResponse {
  verdict: AnalysisVerdict;
  fundamental: FundamentalAnalysis;
  sentiment: SentimentAnalysis;
  technical: TechnicalAnalysis;
  ticker: string;
  marketData: MarketData;
}

// Main interface for the service
export interface IAnalysisService {
  getInvestmentAnalysis(ticker: string): Promise<InvestmentAnalysisResponse>;
  getTradingAnalysis(ticker: string, timeframe: string): Promise<InvestmentAnalysisResponse>;
}

// The definitive schema that dictates the AI's output structure.
const ANALYSIS_RESPONSE_SCHEMA_V5 = {
  type: "object",
  properties: {
    verdict: {
      type: "object",
      description: "The final synthesized verdict from the Head of Strategy.",
      properties: {
        synthesisProfile: { type: "string", description: "A concise, compelling title for the investment thesis (e.g., 'Quality Compounder at a Fair Price')." },
        synthesisScore: { type: "number", description: "The final conviction score (0-100) based on the balance of convergence and divergence." },
        strategistVerdict: { type: "string", description: "The final narrative summary explaining the 'why' behind the thesis in clear, direct language." },
        convergenceFactors: { type: "array", items: { type: "string" }, description: "List of key points where fundamental, sentiment, and technical analyses align and support each other." },
        divergenceFactors: { type: "array", items: { type: "string" }, description: "List of key risks and red flags where the different analysis types conflict." }
      },
      required: ["synthesisProfile", "synthesisScore", "strategistVerdict", "convergenceFactors", "divergenceFactors"]
    },
    fundamental: {
      type: "object",
      description: "The deep fundamental analysis of the business quality and valuation.",
      properties: {
        businessModel: { type: "string" },
        economicMoat: { type: "string" },
        managementReview: { type: "string" },
        keyFinancialRatios: {
          type: "object",
          description: "Key ratios with explanations.",
          properties: {
            "Price/Earnings (P/E)": { 
              type: "object", 
              properties: { 
                "value": { type: "string" }, 
                "explanation": { type: "string" } 
              },
              required: ["value", "explanation"]
            },
            "Return on Equity (ROE)": { 
              type: "object", 
              properties: { 
                "value": { type: "string" }, 
                "explanation": { type: "string" } 
              },
              required: ["value", "explanation"]
            },
            "Debt-to-Equity": { 
              type: "object", 
              properties: { 
                "value": { type: "string" }, 
                "explanation": { type: "string" } 
              },
              required: ["value", "explanation"]
            },
            "Net Profit Margin": { 
              type: "object", 
              properties: { 
                "value": { type: "string" }, 
                "explanation": { type: "string" } 
              },
              required: ["value", "explanation"]
            }
          },
          required: ["Price/Earnings (P/E)", "Return on Equity (ROE)", "Debt-to-Equity", "Net Profit Margin"]
        },
        dcfAnalysis: {
          type: "object",
          description: "Discounted Cash Flow analysis results.",
          properties: {
            intrinsicValuePerShare: { type: "number" },
            assumptions: {
              type: "object",
              description: "The key assumptions used in the DCF model.",
              properties: {
                "revenueGrowthRate": { type: "string" },
                "ebitMargin": { type: "string" },
                "discountRate": { type: "string" },
                "perpetualGrowthRate": { type: "string" },
                "taxRate": { type: "string" }
              },
              required: ["revenueGrowthRate", "ebitMargin", "discountRate", "perpetualGrowthRate", "taxRate"]
            }
          },
          required: ["intrinsicValuePerShare", "assumptions"]
        }
      },
      required: ["businessModel", "economicMoat", "managementReview", "keyFinancialRatios", "dcfAnalysis"]
    },
    sentiment: {
      type: "object",
      description: "The analysis of market sentiment and news flow.",
      properties: {
        sentimentScore: { type: "number", description: "The overall market sentiment score (0-100)." },
        sentimentTrend: { type: "string", enum: ["Improving", "Stable", "Worsening"], description: "The current trend of the market sentiment." },
        keyEchoes: {
          type: "array",
          description: "The top 3 most relevant news or social media mentions.",
          items: {
            type: "object",
            properties: {
              source: { type: "string" },
              summary: { type: "string" },
              individualSentimentScore: { type: "number" }
            },
            required: ["source", "summary", "individualSentimentScore"]
          }
        }
      },
      required: ["sentimentScore", "sentimentTrend", "keyEchoes"]
    },
    technical: {
      type: "object",
      description: "The technical analysis for a long-term investor's entry point.",
      properties: {
        overallTrend: { type: "string", enum: ["Uptrend", "Downtrend", "Sideways"] },
        technicalSummary: { type: "string", description: "A narrative explaining the current technical posture for a long-term investor." },
        keyLevels: {
          type: "object",
          properties: {
            support: { type: "string" },
            resistance: { type: "string" }
          },
          required: ["support", "resistance"]
        }
      },
      required: ["overallTrend", "technicalSummary", "keyLevels"]
    },
    ticker: { type: "string" },
    marketData: {
      type: "object",
      properties: {
        companyName: { type: "string" },
        currentPrice: { type: "number" }
      },
      required: ["companyName", "currentPrice"]
    }
  },
  required: ["verdict", "fundamental", "sentiment", "technical", "ticker", "marketData"]
};

export class AnalysisService implements IAnalysisService {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async getInvestmentAnalysis(ticker: string): Promise<InvestmentAnalysisResponse> {
    try {
      const marketData = await this.getMarketData(ticker);
      const analysis = await this.performInvestmentAnalysis(ticker, marketData);
      return analysis;
    } catch (error) {
      console.error(`[AnalysisService] CRITICAL FAILURE in getInvestmentAnalysis for ${ticker}:`, error);
      if (error && typeof error === 'object' && 'message' in error) {
        console.error('[AnalysisService] Detailed Error Message:', (error as Error).message);
      }
      throw new Error(`[FRONTEND-VISIBLE ERROR] Analysis failed for ${ticker}. The new prompt may have issues.`);
    }
  }

  async getTradingAnalysis(ticker: string, timeframe: string): Promise<InvestmentAnalysisResponse> {
    // For now, trading analysis uses the same logic as investment analysis
    // In the future, this could have different prompts and schemas
    return this.getInvestmentAnalysis(ticker);
  }

  private async getMarketData(ticker: string): Promise<Record<string, any>> {
    // This function remains the same as before
    const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `You are a specialized, high-frequency financial data feed API...`; // Abridged for clarity, use the existing prompt
    const request = {
      contents: [{ role: 'user', parts: [{ text: this.buildMarketDataPrompt(ticker) }] }],
      tools: [{ google_search_retrieval: {} }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
    };

    try {
      // @ts-ignore
      const result = await model.generateContent(request);
      const responseText = result.response.text();
      const marketData = this.parseMarketData(responseText);
      if (marketData.currentPrice === -1 || marketData.priceTimestamp === null) {
        throw new Error(`Could not retrieve a live market price for ${ticker}.`);
      }
      return marketData;
    } catch (apiError) {
      console.error(`[AnalysisService] Gemini API call failed for ${ticker}:`, apiError);
      throw new Error(`Failed to fetch live market data: ${apiError instanceof Error ? apiError.message : 'Unknown API error'}`);
    }
  }

  private buildMarketDataPrompt(ticker: string): string {
    return `
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
  }

  private parseMarketData(jsonString: string): Record<string, any> {
    try {
      const jsonMatch = jsonString.match(/```json\n([\s\S]*?)\n```|(\{[\s\S]*\})/);
      if (!jsonMatch) throw new Error("No valid JSON object found in the AI response.");
      return JSON.parse(jsonMatch[1] || jsonMatch[2]);
    } catch (error) {
      console.error("Failed to parse market data:", error);
      throw new Error("Could not decode the market data JSON from the AI response.");
    }
  }

  private async performInvestmentAnalysis(ticker: string, marketData: Record<string, any>): Promise<InvestmentAnalysisResponse> {
    const model = this.genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: ANALYSIS_RESPONSE_SCHEMA_V5 as any
      }
    });

    const superPrompt = this.buildInvestmentPromptV5(ticker, marketData);

    const result = await model.generateContent(superPrompt);
    const responseText = result.response.text();

    return JSON.parse(responseText) as InvestmentAnalysisResponse;
  }

  private buildInvestmentPromptV5(ticker: string, marketData: Record<string, any>): string {
    // Super-Prompt v5 - "The Signal-360 Investment Committee"
    return `
You are a committee of four elite analysts working for "Signal-360". Your task is to produce a single, unified investment analysis report for ${ticker} (${marketData.companyName}).

**COMMITTEE CONSTITUTION - YOUR CORE PHILOSOPHY (MANDATORY):**
Your guiding philosophy is that of a "Skeptic Mechanic". You are not a salesperson. Your primary function is to find reasons NOT to invest, in order to protect the user's capital. You prioritize risk over return. You question every narrative and demand quantitative proof. A great company at a high price is a bad investment.

**INPUT DATA (AS OF ${marketData.priceTimestamp || 'A RECENT TIMESTAMP'}):**
- Company: ${marketData.companyName}
- Current Price: ${marketData.currentPrice} ${marketData.currency}

**MANDATORY ANALYSIS FRAMEWORK (EXECUTE IN ORDER AND FILL THE SCHEMA):**

**Part 1: The Value Investor's Report (Populate 'fundamental')**
As the 'Value Investor's Compass' expert, conduct a deep fundamental analysis.
- **Business & Moat:** Describe the business model and the durability of its economic moat.
- **Management:** Provide a qualitative review of the management team's effectiveness.
- **Financial Ratios:** Calculate and explain the P/E, ROE, Debt-to-Equity, and Net Profit Margin. The explanation for each ratio is mandatory.
- **DCF Valuation:** Perform a DCF analysis. State the final intrinsic value per share and list your key assumptions.

**Part 2: The Market Analyst's Report (Populate 'sentiment')**
As the 'Eco Corporativo' expert, measure the market's pulse.
- **Sentiment Score & Trend:** Provide an overall sentiment score (0-100) and a trend ('Improving', 'Stable', 'Worsening').
- **Key Echoes:** Identify the top 3 news or social media "echoes". For EACH echo, you must provide the source, a summary, and an individual sentiment score (-100 to 100).

**Part 3: The Technical Strategist's Report (Populate 'technical')**
As the 'QuantumLeap Speculator' expert, analyze the technicals for a LONG-TERM INVESTOR.
- **Overall Trend:** Determine the primary trend ('Uptrend', 'Downtrend', 'Sideways').
- **Key Levels:** Identify the most significant long-term support and resistance levels.
- **Technical Summary:** Write a narrative explaining if the current price action represents an opportune entry point, a risky one, or if patience is warranted.

**Part 4: The Head of Strategy's Verdict (Populate 'verdict')**
As the 'Strategic Synthesis' expert, your job is to synthesize the three reports above into a final, actionable verdict.
- **Synthesize:** Analyze the convergence (where reports agree) and divergence (where they conflict).
- **Synthesis Profile:** Write a compelling, concise title for the overall investment thesis.
- **Strategist Verdict:** Write the final narrative. Explain the balance of risks and rewards based on the synthesis.
- **Convergence/Divergence Factors:** List the specific points of agreement and disagreement between the reports.
- **Synthesis Score:** Calculate a final conviction score (0-100). Start at 50. High convergence and a large margin of safety add points. Significant divergence or high valuation risk subtracts major points.

Now, execute this entire, multi-expert process. Your final output must be ONLY the single JSON object that strictly conforms to the provided response schema. Do not add any text before or after the JSON.
`;
  }
}

// Factory function
export const createAnalysisService = (apiKey: string): IAnalysisService => {
  return new AnalysisService(apiKey);
};

// --- END OF REPLACEMENT CODE ---