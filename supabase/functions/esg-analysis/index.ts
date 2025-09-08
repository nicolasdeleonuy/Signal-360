// Edge Function for ESG (Environmental, Social, Governance) analysis of stocks
// AI-powered analysis using Google Gemini for real-time ESG and market sentiment evaluation

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createRequestHandler,
  parseJsonBody,
  createSuccessHttpResponse,
  createErrorHttpResponse,
  AppError,
  ERROR_CODES,
  ESGAnalysisInput,
  ESGAnalysisOutput,
  AnalysisFactor,
  createLogger,
  withRetryAndTimeout
} from '../_shared/index.ts';

/**
 * ESG Analysis Engine using Google Gemini AI
 */
class ESGAnalysisEngine {
  private apiKey: string;
  private logger: any;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.logger = createLogger('esg-analysis-engine');
  }

  /**
   * Perform AI-powered ESG and market sentiment analysis
   */
  async analyze(ticker_symbol: string, analysis_context: 'investment' | 'trading'): Promise<ESGAnalysisOutput> {
    try {
      this.logger.info(`Starting AI-powered ESG analysis for ${ticker_symbol} (${analysis_context})`);

      // Construct detailed prompt for Gemini AI
      const prompt = this.buildAnalysisPrompt(ticker_symbol, analysis_context);

      // Make API call to Google Gemini
      const geminiResponse = await this.callGeminiAPI(prompt);

      // Parse and validate the JSON response
      const analysisResult = this.parseGeminiResponse(geminiResponse);

      this.logger.info(`ESG analysis completed for ${ticker_symbol}`, {
        score: analysisResult.score,
        factorsCount: analysisResult.factors.length,
        confidence: analysisResult.confidence
      });

      return analysisResult;

    } catch (error) {
      this.logger.error(`ESG analysis failed for ${ticker_symbol}:`, error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(
        ERROR_CODES.PROCESSING_ERROR,
        'Failed to perform ESG analysis',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Build comprehensive analysis prompt for Gemini AI
   */
  private buildAnalysisPrompt(ticker_symbol: string, analysis_context: string): string {
    const jsonSchema = {
      type: "object",
      properties: {
        score: {
          type: "number",
          minimum: 0,
          maximum: 100,
          description: "Overall ESG score from 0-100"
        },
        factors: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: {
                type: "string",
                enum: ["esg"],
                description: "Must be 'esg'"
              },
              type: {
                type: "string",
                enum: ["positive", "negative"],
                description: "Whether this factor is positive or negative"
              },
              description: {
                type: "string",
                description: "Clear description of the ESG factor"
              },
              weight: {
                type: "number",
                minimum: 0,
                maximum: 1,
                description: "Importance weight from 0-1"
              },
              confidence: {
                type: "number",
                minimum: 0,
                maximum: 1,
                description: "Confidence level from 0-1"
              }
            },
            required: ["category", "type", "description", "weight", "confidence"]
          }
        },
        details: {
          type: "object",
          properties: {
            environmental_score: {
              type: "number",
              minimum: 0,
              maximum: 100,
              description: "Environmental pillar score"
            },
            social_score: {
              type: "number",
              minimum: 0,
              maximum: 100,
              description: "Social pillar score"
            },
            governance_score: {
              type: "number",
              minimum: 0,
              maximum: 100,
              description: "Governance pillar score"
            },
            sustainability_metrics: {
              type: "object",
              description: "Various sustainability metrics as numbers"
            }
          },
          required: ["environmental_score", "social_score", "governance_score", "sustainability_metrics"]
        },
        confidence: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "Overall analysis confidence from 0-1"
        }
      },
      required: ["score", "factors", "details", "confidence"]
    };

    return `You are an expert ESG and Market Sentiment Analyst. Your task is to perform a comprehensive analysis of ${ticker_symbol} for ${analysis_context} purposes.

INSTRUCTIONS:
1. Use your internal search capabilities to find recent information about ${ticker_symbol} including:
   - Recent news and press releases
   - Sustainability reports and ESG disclosures
   - Environmental initiatives and carbon footprint data
   - Social impact programs and diversity metrics
   - Governance structure and board composition
   - Recent controversies or positive developments
   - Market sentiment and analyst opinions
   - Regulatory compliance and legal issues

2. Analyze the company across three ESG pillars:
   - ENVIRONMENTAL: Climate impact, carbon emissions, renewable energy, waste management, water usage, biodiversity
   - SOCIAL: Employee relations, diversity & inclusion, community impact, product safety, human rights, labor practices
   - GOVERNANCE: Board structure, executive compensation, shareholder rights, transparency, ethics, risk management

3. Consider the analysis context:
   - For "investment": Focus on long-term ESG risks and opportunities, regulatory trends, sustainable competitive advantages
   - For "trading": Include short-term sentiment impacts, ESG-related news flow, regulatory announcements, activist campaigns

4. Return your complete analysis in this EXACT JSON format:

${JSON.stringify(jsonSchema, null, 2)}

CRITICAL REQUIREMENTS:
- Provide 5-8 specific, actionable factors with clear descriptions
- Environmental, social, and governance scores should reflect real research findings
- Overall score should be a weighted average considering all three pillars
- Include specific metrics in sustainability_metrics (use realistic numbers)
- Confidence should reflect data availability and recency
- All scores must be realistic and well-justified
- Focus on factual, research-based analysis

Return ONLY the JSON response, no additional text or formatting.`;
  }

  /**
   * Make API call to Google Gemini
   */
  private async callGeminiAPI(prompt: string): Promise<any> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;

    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.8,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };

    return await withRetryAndTimeout(
      async () => {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Signal-360/1.0'
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          if (response.status === 429) {
            throw new AppError(
              ERROR_CODES.RATE_LIMIT_EXCEEDED,
              'Google Gemini API rate limit exceeded',
              'Please try again later'
            );
          }
          
          if (response.status === 401 || response.status === 403) {
            throw new AppError(
              ERROR_CODES.INVALID_API_KEY,
              'Invalid or expired Google API key',
              'Please update your API key in profile settings'
            );
          }

          const errorText = await response.text();
          throw new AppError(
            ERROR_CODES.EXTERNAL_API_ERROR,
            `Gemini API error: ${response.status} ${response.statusText}`,
            errorText
          );
        }

        return await response.json();
      },
      30000, // 30 second timeout
      {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2,
        jitter: true
      },
      'Gemini API request'
    );
  }

  /**
   * Parse and validate Gemini API response
   */
  private parseGeminiResponse(geminiResponse: any): ESGAnalysisOutput {
    try {
      // Extract the generated text from Gemini response
      if (!geminiResponse.candidates || geminiResponse.candidates.length === 0) {
        throw new Error('No response candidates from Gemini API');
      }

      const candidate = geminiResponse.candidates[0];
      if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        throw new Error('No content in Gemini API response');
      }

      const generatedText = candidate.content.parts[0].text;
      if (!generatedText) {
        throw new Error('Empty response from Gemini API');
      }

      // Parse JSON from the generated text
      let analysisData;
      try {
        // Clean the response text (remove any markdown formatting)
        const cleanedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        analysisData = JSON.parse(cleanedText);
      } catch (parseError) {
        this.logger.error('Failed to parse Gemini JSON response:', { generatedText, parseError });
        throw new Error(`Invalid JSON response from Gemini API: ${parseError.message}`);
      }

      // Validate the structure matches ESGAnalysisOutput
      this.validateAnalysisOutput(analysisData);

      return analysisData as ESGAnalysisOutput;

    } catch (error) {
      this.logger.error('Failed to parse Gemini response:', error);
      throw new AppError(
        ERROR_CODES.PROCESSING_ERROR,
        'Failed to parse AI analysis response',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Validate the analysis output structure
   */
  private validateAnalysisOutput(data: any): void {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Analysis output must be an object');
    }

    // Validate required fields
    if (typeof data.score !== 'number' || data.score < 0 || data.score > 100) {
      throw new Error('Score must be a number between 0 and 100');
    }

    if (!Array.isArray(data.factors)) {
      throw new Error('Factors must be an array');
    }

    if (typeof data.confidence !== 'number' || data.confidence < 0 || data.confidence > 1) {
      throw new Error('Confidence must be a number between 0 and 1');
    }

    if (!data.details || typeof data.details !== 'object') {
      throw new Error('Details must be an object');
    }

    // Validate details structure
    const details = data.details;
    if (typeof details.environmental_score !== 'number' || details.environmental_score < 0 || details.environmental_score > 100) {
      throw new Error('Environmental score must be a number between 0 and 100');
    }

    if (typeof details.social_score !== 'number' || details.social_score < 0 || details.social_score > 100) {
      throw new Error('Social score must be a number between 0 and 100');
    }

    if (typeof details.governance_score !== 'number' || details.governance_score < 0 || details.governance_score > 100) {
      throw new Error('Governance score must be a number between 0 and 100');
    }

    if (!details.sustainability_metrics || typeof details.sustainability_metrics !== 'object') {
      throw new Error('Sustainability metrics must be an object');
    }

    // Validate factors
    for (const factor of data.factors) {
      if (factor.category !== 'esg') {
        throw new Error('All factors must have category "esg"');
      }

      if (!['positive', 'negative'].includes(factor.type)) {
        throw new Error('Factor type must be "positive" or "negative"');
      }

      if (typeof factor.description !== 'string' || factor.description.length === 0) {
        throw new Error('Factor description must be a non-empty string');
      }

      if (typeof factor.weight !== 'number' || factor.weight < 0 || factor.weight > 1) {
        throw new Error('Factor weight must be a number between 0 and 1');
      }

      if (typeof factor.confidence !== 'number' || factor.confidence < 0 || factor.confidence > 1) {
        throw new Error('Factor confidence must be a number between 0 and 1');
      }
    }
  }
}

/**
 * Main request handler for ESG analysis
 */
const handleESGAnalysis = async (request: Request, requestId: string): Promise<Response> => {
  try {
    // Parse and validate request body
    const body = await parseJsonBody(request);
    
    // Validate required fields
    if (!body.ticker_symbol || !body.api_key || !body.analysis_context) {
      throw new AppError(
        ERROR_CODES.MISSING_PARAMETER,
        'Missing required parameters: ticker_symbol, api_key, analysis_context'
      );
    }

    const { ticker_symbol, api_key, analysis_context } = body;

    // Validate analysis context
    if (!['investment', 'trading'].includes(analysis_context)) {
      throw new AppError(
        ERROR_CODES.INVALID_PARAMETER,
        'analysis_context must be either "investment" or "trading"'
      );
    }

    // Validate ticker format
    if (!/^[A-Z]{1,5}$/.test(ticker_symbol)) {
      throw new AppError(
        ERROR_CODES.INVALID_TICKER,
        'Invalid ticker symbol format'
      );
    }

    // Validate API key format (Google API keys start with AIza)
    if (!/^AIza[0-9A-Za-z-_]{35}$/.test(api_key)) {
      throw new AppError(
        ERROR_CODES.INVALID_API_KEY,
        'Invalid Google API key format'
      );
    }

    console.log(`Starting AI-powered ESG analysis for ${ticker_symbol} (${analysis_context}) - Request ${requestId}`);

    // Create ESG analysis engine and perform analysis
    const engine = new ESGAnalysisEngine(api_key);
    const analysisResult = await engine.analyze(ticker_symbol, analysis_context);

    console.log(`ESG analysis completed for ${ticker_symbol} - Score: ${analysisResult.score} - Request ${requestId}`);

    return createSuccessHttpResponse(analysisResult, requestId);

  } catch (error) {
    console.error(`ESG analysis failed for request ${requestId}:`, error);
    return createErrorHttpResponse(error, requestId);
  }
};

// Create and serve the request handler
const handler = createRequestHandler(handleESGAnalysis, ['POST']);

serve(handler);