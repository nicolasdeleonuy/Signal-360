import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Types for request/response
interface TickerSearchRequest {
  query: string;
}

interface TickerSuggestion {
  ticker: string;
  name: string;
  exchange?: string;
  type?: string;
}

interface TickerSearchResponse {
  success: boolean;
  data?: TickerSuggestion[];
  error?: {
    code: string;
    message: string;
  };
  requestId?: string;
}

// Finnhub API response types
interface FinnhubSearchResult {
  count: number;
  result: Array<{
    description: string;
    displaySymbol: string;
    symbol: string;
    type: string;
  }>;
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // Max 30 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Security headers
const securityHeaders = {
  ...corsHeaders,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

// Generate unique request ID for tracking
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get client IP address for rate limiting
function getClientIP(req: Request): string {
  // Try various headers that might contain the real IP
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  // Fallback to a default if no IP can be determined
  return 'unknown';
}

// Rate limiting check
function checkRateLimit(clientIP: string, requestId: string): boolean {
  const now = Date.now();
  const clientData = rateLimitMap.get(clientIP);
  
  if (!clientData || now > clientData.resetTime) {
    // First request or window expired, reset counter
    rateLimitMap.set(clientIP, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    console.log(`[${requestId}] Rate limit initialized for IP: ${clientIP}`);
    return true;
  }
  
  if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
    console.log(`[${requestId}] Rate limit exceeded for IP: ${clientIP} (${clientData.count}/${RATE_LIMIT_MAX_REQUESTS})`);
    return false;
  }
  
  // Increment counter
  clientData.count++;
  console.log(`[${requestId}] Rate limit check passed for IP: ${clientIP} (${clientData.count}/${RATE_LIMIT_MAX_REQUESTS})`);
  return true;
}

// Clean up expired rate limit entries periodically
function cleanupRateLimit() {
  const now = Date.now();
  for (const [ip, data] of rateLimitMap.entries()) {
    if (now > data.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}

// Log request for monitoring
function logRequest(requestId: string, method: string, clientIP: string, query?: string) {
  const timestamp = new Date().toISOString();
  console.log(`[${requestId}] ${timestamp} - ${method} request from ${clientIP}${query ? ` - Query: "${query}"` : ''}`);
}

// Error response helper
function createErrorResponse(
  code: string, 
  message: string, 
  requestId: string,
  statusCode: number = 400
): Response {
  const errorResponse: TickerSearchResponse = {
    success: false,
    error: { code, message },
    requestId
  };
  
  // Log error for monitoring
  console.error(`[${requestId}] Error response: ${code} - ${message}`);
  
  return new Response(
    JSON.stringify(errorResponse),
    {
      status: statusCode,
      headers: { 
        ...securityHeaders, 
        'Content-Type': 'application/json' 
      }
    }
  );
}

// Success response helper
function createSuccessResponse(
  data: TickerSuggestion[], 
  requestId: string
): Response {
  const successResponse: TickerSearchResponse = {
    success: true,
    data,
    requestId
  };
  
  // Log successful response for monitoring
  console.log(`[${requestId}] Success response: ${data.length} suggestions returned`);
  
  return new Response(
    JSON.stringify(successResponse),
    {
      status: 200,
      headers: { 
        ...securityHeaders, 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
      }
    }
  );
}

// Input validation and sanitization
function validateAndSanitizeQuery(query: string): string | null {
  if (!query || typeof query !== 'string') {
    return null;
  }
  
  // Trim whitespace
  const trimmed = query.trim();
  
  // Check minimum length
  if (trimmed.length < 1) {
    return null;
  }
  
  // Check maximum length
  if (trimmed.length > 10) {
    return null;
  }
  
  // Allow only alphanumeric characters, spaces, hyphens, and dots
  const validPattern = /^[a-zA-Z0-9\s\-\.]+$/;
  if (!validPattern.test(trimmed)) {
    return null;
  }
  
  // Remove any potentially harmful characters and limit length
  return trimmed.slice(0, 10).replace(/[^a-zA-Z0-9\s\-\.]/g, '');
}

// Transform Finnhub response to our format
function transformFinnhubResponse(data: FinnhubSearchResult): TickerSuggestion[] {
  if (!data || !data.result || !Array.isArray(data.result)) {
    return [];
  }
  
  return data.result
    .slice(0, 10) // Limit to 10 results
    .map(item => ({
      ticker: item.symbol || '',
      name: item.description || '',
      exchange: item.displaySymbol !== item.symbol ? 'Multiple' : 'US',
      type: item.type || 'Unknown'
    }))
    .filter(item => item.ticker && item.name); // Filter out invalid entries
}

// Fetch ticker suggestions from Finnhub API
async function fetchTickerSuggestions(
  query: string, 
  apiKey: string, 
  requestId: string
): Promise<TickerSuggestion[]> {
  const finnhubUrl = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${apiKey}`;
  
  console.log(`[${requestId}] Calling Finnhub API for query: "${query}"`);
  
  try {
    const response = await fetch(finnhubUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Signal-360/1.0'
      },
      // Set timeout to 10 seconds
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.error(`[${requestId}] Finnhub API error: ${response.status} ${response.statusText}`);
      throw new Error(`Finnhub API returned ${response.status}: ${response.statusText}`);
    }
    
    const data: FinnhubSearchResult = await response.json();
    console.log(`[${requestId}] Finnhub API returned ${data.count} results`);
    
    return transformFinnhubResponse(data);
    
  } catch (error) {
    console.error(`[${requestId}] Error calling Finnhub API:`, error);
    
    if (error.name === 'TimeoutError') {
      throw new Error('API request timed out');
    }
    
    throw error;
  }
}

serve(async (req) => {
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);
  
  // Clean up rate limit entries periodically (every 100 requests)
  if (Math.random() < 0.01) {
    cleanupRateLimit();
  }
  
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: securityHeaders });
    }

    // Log the request
    logRequest(requestId, req.method, clientIP);

    // Validate HTTP method - only POST allowed
    if (req.method !== 'POST') {
      return createErrorResponse(
        'INVALID_METHOD',
        'Only POST method is allowed',
        requestId,
        405
      );
    }

    // Check rate limiting
    if (!checkRateLimit(clientIP, requestId)) {
      return createErrorResponse(
        'RATE_LIMIT_EXCEEDED',
        'Too many requests. Please try again in a moment.',
        requestId,
        429
      );
    }

    // Validate content type
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return createErrorResponse(
        'INVALID_CONTENT_TYPE',
        'Content-Type must be application/json',
        requestId,
        415
      );
    }

    // Check request size (limit to 1KB)
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 1024) {
      return createErrorResponse(
        'REQUEST_TOO_LARGE',
        'Request body too large',
        requestId,
        413
      );
    }

    // Parse request body with timeout
    let requestBody: TickerSearchRequest;
    try {
      // Add timeout for JSON parsing to prevent hanging
      const parseTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('JSON parse timeout')), 5000)
      );
      
      requestBody = await Promise.race([
        req.json(),
        parseTimeout
      ]) as TickerSearchRequest;
      
    } catch (error) {
      if (error.message === 'JSON parse timeout') {
        return createErrorResponse(
          'REQUEST_TIMEOUT',
          'Request processing timed out',
          requestId,
          408
        );
      }
      
      return createErrorResponse(
        'INVALID_JSON',
        'Invalid JSON in request body',
        requestId,
        400
      );
    }

    // Validate and sanitize query
    const sanitizedQuery = validateAndSanitizeQuery(requestBody.query);
    if (!sanitizedQuery) {
      return createErrorResponse(
        'INVALID_INPUT',
        'Query must be 1-10 characters and contain only letters, numbers, spaces, hyphens, and dots',
        requestId,
        400
      );
    }

    // Log the sanitized query
    logRequest(requestId, 'SEARCH', clientIP, sanitizedQuery);

    // Get Finnhub API key from environment
    const finnhubApiKey = Deno.env.get('FINNHUB_API_KEY');
    if (!finnhubApiKey) {
      console.error(`[${requestId}] FINNHUB_API_KEY environment variable not set`);
      return createErrorResponse(
        'CONFIGURATION_ERROR',
        'Search service is not properly configured',
        requestId,
        503
      );
    }

    // Validate API key format (basic check)
    if (finnhubApiKey.length < 10 || !/^[a-zA-Z0-9]+$/.test(finnhubApiKey)) {
      console.error(`[${requestId}] Invalid FINNHUB_API_KEY format`);
      return createErrorResponse(
        'CONFIGURATION_ERROR',
        'Search service is not properly configured',
        requestId,
        503
      );
    }

    // Fetch suggestions from Finnhub API
    try {
      const suggestions = await fetchTickerSuggestions(sanitizedQuery, finnhubApiKey, requestId);
      return createSuccessResponse(suggestions, requestId);
      
    } catch (error) {
      console.error(`[${requestId}] Error fetching suggestions:`, error);
      
      // Handle specific error types with appropriate status codes
      if (error.message.includes('timed out') || error.name === 'TimeoutError') {
        return createErrorResponse(
          'TIMEOUT_ERROR',
          'Search request timed out. Please try again.',
          requestId,
          504
        );
      }
      
      if (error.message.includes('401') || error.message.includes('403')) {
        return createErrorResponse(
          'API_AUTH_ERROR',
          'Search service authentication failed',
          requestId,
          503
        );
      }
      
      if (error.message.includes('429')) {
        return createErrorResponse(
          'RATE_LIMIT_ERROR',
          'External API rate limit exceeded. Please try again in a moment.',
          requestId,
          503
        );
      }
      
      if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
        return createErrorResponse(
          'EXTERNAL_SERVICE_ERROR',
          'External search service is temporarily unavailable.',
          requestId,
          503
        );
      }
      
      // Generic API error
      return createErrorResponse(
        'API_ERROR',
        'Unable to fetch search results. Please try again.',
        requestId,
        502
      );
    }

  } catch (error) {
    // Log unexpected errors with full details for debugging
    console.error(`[${requestId}] Unexpected error:`, {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred. Please try again.',
      requestId,
      500
    );
  }
})