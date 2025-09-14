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

// Opportunity interfaces
export interface Opportunity {
  ticker: string;
  companyName: string;
  reason: string;
}

export interface OpportunitySearchResponse {
  ideas: Opportunity[];
}

// Main interface for the service
export interface IAnalysisService {
  getInvestmentAnalysis(ticker: string): Promise<InvestmentAnalysisResponse>;
  getTradingAnalysis(ticker: string, timeframe: string): Promise<InvestmentAnalysisResponse>;
  findOpportunities(): Promise<OpportunitySearchResponse>;
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

  async getTradingAnalysis(ticker: string, _timeframe: string): Promise<InvestmentAnalysisResponse> {
    // For now, trading analysis uses the same logic as investment analysis
    // In the future, this could have different prompts and schemas
    return this.getInvestmentAnalysis(ticker);
  }

  async findOpportunities(): Promise<OpportunitySearchResponse> {
    try {
      const prompt = this.buildOpportunitiesPrompt();
      
      const model = this.genAI.getGenerativeModel({
        model: "gemini-1.5-pro",
      });

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        tools: [{ googleSearchRetrieval: {} }],
      });

      const response = result.response;
      const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!responseText) {
        throw new Error("Received an empty response from the AI model.");
      }

      // The response is expected to be a clean JSON string.
      const parsedResponse = this.parseJsonFromResponse(responseText);

      // Basic validation to ensure the response has the 'ideas' key.
      if (!parsedResponse || !Array.isArray(parsedResponse.ideas)) {
        throw new Error("Invalid JSON structure received from the AI. 'ideas' array is missing.");
      }

      return parsedResponse;
    } catch (error) {
      console.error('[AnalysisService] CRITICAL FAILURE in findOpportunities:', error);
      throw new Error('Opportunity search failed due to a technical issue with the AI model.');
    }
  }



  private buildOpportunitiesPrompt(): string {
    // "Master Prompt" for Value-First Opportunity Discovery
    return `
Act as an extremely rigorous and quantitative value investing analyst, following a fusion of the methodologies of Benjamin Graham, Warren Buffett, and Joel Greenblatt. Your goal is to find market "bargains": excellent companies at fair prices or fair companies at excellent prices.

Using your real-time search capabilities (Google Search), scan the US stock market (NYSE, NASDAQ) to identify 3 to 5 companies that meet the following STRICT and NON-NEGOTIABLE selection criteria. The company must meet AT LEAST 4 of the 5 quantitative criteria.

**Quantitative Selection Criteria (Mandatory):**
1.  **Low Valuation (Multiples):**
    *   Price-to-Earnings (P/E) Ratio < 15.
    *   AND/OR Price-to-Book (P/B) Ratio < 1.5.
2.  **Superior and Consistent Profitability:**
    *   Return on Invested Capital (ROIC) must be consistently > 10% over the last 5 years.
3.  **Financial Health (Low Leverage):**
    *   Debt-to-Equity Ratio < 0.5.
    *   Current Ratio > 1.5.
4.  **Cash Generation:**
    *   Price-to-Free-Cash-Flow (P/FCF) < 20.
5.  **Earnings Growth History:**
    *   Positive Earnings Per Share (EPS) growth in at least 3 of the last 5 years.

**Qualitative Analysis (Secondary Filter):**
For companies that pass the quantitative filter, perform a quick qualitative check:
*   **Economic Moat:** Does the company have a durable competitive advantage (e.g., strong brand, network effect, low costs, intangible assets)?
*   **Management Quality:** Are there any major red flags regarding the management team? (Quick review, not exhaustive).
*   **Sector Risks:** Does the company operate in a sector with insurmountable structural headwinds?

**Response Structure:**
Your ENTIRE response MUST be a single JSON object, with no introductory text, additional explanations, or markdown backticks like \`\`\`json. The JSON must have a single root key "ideas", which is an array of objects. Each object must represent a company and contain EXACTLY the following fields:

- "ticker": string (The uppercase stock symbol).
- "companyName": string (The full name of the company).
- "reason": string (A concise 2-3 sentence justification explaining WHY the company is an opportunity. Explicitly cite 2-3 of the strongest quantitative criteria it meets and briefly mention its economic moat. E.g., "Meets strict valuation criteria (P/E of 12, P/B of 1.1) and robust financial health (D/E of 0.3). The company benefits from a strong economic moat based on its globally recognized brand.").
`;
  }

  private async getMarketData(ticker: string): Promise<MarketData> {
    const MAX_RETRIES = 3;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[AnalysisService] getMarketData attempt ${attempt} for ${ticker}`);
        const prompt = `
You are a financial data API. Your only task is to fetch real-time market data for a specific stock ticker using your search tool.

**Ticker:** "${ticker}"

**MANDATORY EXECUTION PROTOCOL:**
1.  **Primary Search:** Execute a search for the exact ticker "${ticker} stock price".
2.  **CRITICAL FALLBACK:** If the primary search fails or returns ambiguous results (e.g., for tickers with special characters like '.B'), you MUST execute a second search using common variations. For example, if the ticker is "BRK.B", search for "BRK B stock price" or "Berkshire Hathaway Class B stock price".
3.  **Data Extraction:** From the most reliable search result, extract the following data points:
    *   companyName: The full official name of the company.
    *   currentPrice: The latest stock price, as a number.
    *   currency: The currency symbol (e.g., USD).
    *   priceTimestamp: The timestamp of the price data in ISO 8601 format.
4.  **Verification Step:** Before returning, verify that the 'companyName' you found is plausible for the ticker "${ticker}". If you are not confident in the data, you MUST return a 'currentPrice' of -1 to signal a failure.
5.  **Output Format:** Your final output must be ONLY the single, clean JSON object with the extracted data. Do not include any other text or markdown.
`;

        const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          tools: [{ googleSearchRetrieval: {} }],
        });

        const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!responseText) {
          throw new Error("Received empty response from market data call.");
        }

        const marketData = this.parseJsonFromResponse(responseText);

        if (marketData && typeof marketData.currentPrice === 'number' && marketData.currentPrice > 0) {
          console.log(`[AnalysisService] getMarketData successful for ${ticker} on attempt ${attempt}`);
          return marketData;
        }
                
        throw new Error(`Invalid price received for ${ticker}: ${marketData?.currentPrice}`);

      } catch (error) {
        console.warn(`[AnalysisService] getMarketData attempt ${attempt} for ${ticker} failed.`, error);
        if (attempt === MAX_RETRIES) {
          console.error(`[AnalysisService] CRITICAL FAILURE in getMarketData for ${ticker} after ${MAX_RETRIES} attempts.`);
          throw new Error(`Could not retrieve a live market price for ${ticker} after ${MAX_RETRIES} attempts.`);
        }
        // Wait a bit before retrying, e.g., exponential backoff or simple delay
        await new Promise(res => setTimeout(res, 500 * attempt));
      }
    }
    // This line should theoretically be unreachable
    throw new Error(`getMarketData failed for ${ticker} unexpectedly.`);
  }





  private parseJsonFromResponse(responseText: string): any {
    try {
      // Try to find JSON in markdown code blocks first
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      
      // Try to find raw JSON object
      const rawJsonMatch = responseText.match(/(\{[\s\S]*\})/);
      if (rawJsonMatch) {
        return JSON.parse(rawJsonMatch[1]);
      }
      
      // If no JSON found, try parsing the entire response
      return JSON.parse(responseText);
    } catch (error) {
      console.error("Failed to parse JSON from response:", error);
      throw new Error("Could not decode JSON from the AI response.");
    }
  }

  private async performInvestmentAnalysis(ticker: string, marketData: MarketData): Promise<InvestmentAnalysisResponse> {
    const model = this.genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: ANALYSIS_RESPONSE_SCHEMA_V5 as any
      }
    });

    const superPrompt = this.buildInvestmentPromptV6(ticker, marketData);

    const result = await model.generateContent(superPrompt);
    const responseText = result.response.text();

    return JSON.parse(responseText) as InvestmentAnalysisResponse;
  }

  private buildInvestmentPromptV6(ticker: string, marketData: MarketData): string {
    // Super-Prompt v6.2 - "Value Investor's Compass" (Hardened Verdict Logic)
    return `
You are a committee of three elite analysts and a Head of Strategy working for "Value Investor's Compass". Your task is to produce a single, unified investment analysis report for ${ticker} (${marketData.companyName}).

**COMMITTEE CONSTITUTION - YOUR CORE PHILOSOPHY (MANDATORY):**
Your guiding philosophy is that of a "Skeptic Mechanic" with a strict "Value-First" mandate. You prioritize risk over return. You question every narrative and demand quantitative proof. A great company at a high price is a bad investment.

**INPUT DATA:**
- Company: ${marketData.companyName}
- Current Price: ${marketData.currentPrice}

**MANDATORY ANALYSIS FRAMEWORK (EXECUTE IN ORDER AND FILL THE SCHEMA):**

**Part 1: The Value Investor's Report (The Protagonist)**
As the 'Value Investor's Compass' expert, conduct a deep fundamental analysis. This part is the most important.
- **Business & Moat:** Describe the business model and the durability of its economic moat.
- **Management:** Provide a qualitative review of the management team's effectiveness.
- **Financial Ratios:** Calculate and explain the P/E, ROE, Debt-to-Equity, and Net Profit Margin.
- **DCF Valuation:** Perform a DCF analysis. State the final intrinsic value per share and list your key assumptions.

**Part 2: The Market Analyst's Report (Contextual Advisor)**
As the 'Market Sentiment' expert, measure the market's pulse. Your findings will primarily be used to identify risks and supporting factors.
- **Sentiment Score & Trend:** Provide an overall sentiment score (0-100) and a trend ('Improving', 'Stable', 'Worsening').
- **Key Echoes:** Identify the top 3 news or social media "echoes" with source and summary.

**Part 3: The Technical Strategist's Report (Contextual Advisor)**
As the 'Technical Timing' expert, analyze the technicals for a LONG-TERM INVESTOR. Your findings will primarily be used to identify risks and supporting factors related to timing.
- **Overall Trend:** Determine the primary trend ('Uptrend', 'Downtrend', 'Sideways').
- **Key Levels:** Identify the most significant long-term support and resistance levels.
- **Technical Summary:** Write a narrative explaining if the current price represents an opportune entry point.

**Part 4: The Head of Strategy's Verdict (Value-First Algorithmic Synthesis)**
As the 'Strategic Synthesis' expert, your job is to synthesize all reports into a final verdict by following this **strict, non-negotiable algorithm:**

- **Step 1: Calculate Margin of Safety.** Take the 'intrinsicValue' from your DCF in Part 1 and the 'currentPrice'. Calculate the margin of safety as a percentage: ((intrinsicValue - currentPrice) / currentPrice) * 100. This is your single most important metric.
- **Step 2: Determine Recommendation based on Strict Rules.** Based *only* on the margin of safety, set the 'recommendation' field:
    - IF margin of safety > 20%: recommendation is "BUY".
    - IF margin of safety is between -10% and 20%: recommendation is "HOLD".
    - IF margin of safety < -10%: recommendation is "AVOID".
- **Step 3: Calculate Synthesis Score.** The score is primarily driven by the margin of safety, with a small influence from business quality.
    - Start with a base score derived from the margin of safety.
    - Add or subtract a maximum of 15 points based on the qualitative strength of the Moat and Management from Part 1.
    - **CRITICAL RULE:** A company with a negative margin of safety CANNOT have a synthesisScore above 50, regardless of its quality.
- **Step 4: Write the Final Narrative.** Now, write the 'strategistVerdict' and 'synthesisProfile' to explain the recommendation you determined in Step 2. Your narrative must be anchored in the quantitative reality of the valuation and **must be consistent with the recommendation.**

Your final output must be ONLY the single JSON object that strictly conforms to the provided response schema.
`;
  }


}

// Factory function
export const createAnalysisService = (apiKey: string): IAnalysisService => {
  return new AnalysisService(apiKey);
};

// --- END OF REPLACEMENT CODE ---