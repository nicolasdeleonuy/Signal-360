// Enhanced HTTP utilities for Edge Functions
// Provides standardized request/response handling with CORS support

import { generateRequestId, AppError, ERROR_CODES } from './errors.ts';
import { SuccessResponse, ErrorResponse } from './types.ts';

/**
 * CORS headers for cross-origin requests
 * Configured for development and production environments
 */
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*', // Allow all origins for development
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
};

/**
 * Success response interface
 */
export interface SuccessHttpResponse<T = any> {
  success: true;
  data: T;
  request_id: string;
  timestamp: string;
}

/**
 * Error response interface
 */
export interface ErrorHttpResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string;
    retry_after?: number;
  };
  request_id: string;
  timestamp: string;
}

/**
 * Parse JSON body from request with validation
 * @param request HTTP request object
 * @returns Promise<any> Parsed JSON body
 * @throws AppError if parsing fails
 */
export async function parseJsonBody(request: Request): Promise<any> {
  try {
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new AppError(
        ERROR_CODES.INVALID_REQUEST,
        'Content-Type must be application/json'
      );
    }

    const body = await request.text();
    if (!body || body.trim() === '') {
      throw new AppError(
        ERROR_CODES.INVALID_REQUEST,
        'Request body is required'
      );
    }

    return JSON.parse(body);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    if (error instanceof SyntaxError) {
      throw new AppError(
        ERROR_CODES.INVALID_REQUEST,
        'Invalid JSON in request body'
      );
    }
    
    throw new AppError(
      ERROR_CODES.INVALID_REQUEST,
      'Failed to parse request body',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Create success HTTP response
 * @param data Response data
 * @param requestId Request ID for tracking
 * @returns Response object
 */
export function createSuccessHttpResponse<T>(data: T, requestId: string): Response {
  const response: SuccessHttpResponse<T> = {
    success: true,
    data,
    request_id: requestId,
    timestamp: new Date().toISOString()
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS
    }
  });
}

/**
 * Create error HTTP response
 * @param error Error object or AppError
 * @param requestId Request ID for tracking
 * @returns Response object
 */
export function createErrorHttpResponse(error: Error | AppError, requestId: string): Response {
  let code = ERROR_CODES.INTERNAL_ERROR;
  let message = 'An unexpected error occurred';
  let details: string | undefined;
  let retryAfter: number | undefined;
  let statusCode = 500;

  if (error instanceof AppError) {
    code = error.code;
    message = error.message;
    details = error.details;
    retryAfter = error.retryAfter;
    statusCode = error.statusCode;
  } else {
    // Log unexpected errors for debugging
    console.error('Unexpected error:', error);
    details = process.env.NODE_ENV === 'development' ? error.message : undefined;
  }

  const response: ErrorHttpResponse = {
    success: false,
    error: {
      code,
      message,
      details,
      retry_after: retryAfter
    },
    request_id: requestId,
    timestamp: new Date().toISOString()
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...CORS_HEADERS
  };

  // Add retry-after header for rate limit errors
  if (retryAfter) {
    headers['Retry-After'] = retryAfter.toString();
  }

  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers
  });
}

/**
 * Handle CORS preflight requests
 * @returns Response for OPTIONS requests
 */
export function handleCorsPreflightRequest(): Response {
  return new Response(null, {
    status: 200,
    headers: CORS_HEADERS
  });
}

/**
 * Check if HTTP method is allowed
 * @param method HTTP method to check
 * @param allowedMethods Array of allowed methods
 * @returns boolean indicating if method is allowed
 */
export function isMethodAllowed(method: string, allowedMethods: string[]): boolean {
  return allowedMethods.includes(method.toUpperCase());
}

/**
 * Create method not allowed response
 * @param allowedMethods Array of allowed methods
 * @param requestId Request ID for tracking
 * @returns Response object
 */
export function createMethodNotAllowedResponse(allowedMethods: string[], requestId: string): Response {
  const error = new AppError(
    ERROR_CODES.INVALID_REQUEST,
    `Method not allowed. Allowed methods: ${allowedMethods.join(', ')}`
  );

  const headers = {
    'Allow': allowedMethods.join(', '),
    ...CORS_HEADERS
  };

  return new Response(JSON.stringify({
    success: false,
    error: {
      code: error.code,
      message: error.message
    },
    request_id: requestId,
    timestamp: new Date().toISOString()
  }), {
    status: 405,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
}

/**
 * Create standardized request handler
 * @param handler Main request handler function
 * @param allowedMethods Array of allowed HTTP methods
 * @returns Request handler function
 */
export function createRequestHandler(
  handler: (request: Request, requestId: string) => Promise<Response>,
  allowedMethods: string[] = ['GET', 'POST']
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    const requestId = generateRequestId();

    try {
      // Handle CORS preflight requests
      if (request.method === 'OPTIONS') {
        return handleCorsPreflightRequest();
      }

      // Check if method is allowed
      if (!isMethodAllowed(request.method, allowedMethods)) {
        return createMethodNotAllowedResponse(allowedMethods, requestId);
      }

      // Execute the main handler
      return await handler(request, requestId);

    } catch (error) {
      console.error(`Request handler error (${requestId}):`, error);
      return createErrorHttpResponse(error instanceof Error ? error : new Error(String(error)), requestId);
    }
  };
}

/**
 * Create success response object (for internal use)
 * @param data Response data
 * @param requestId Request ID for tracking
 * @returns SuccessResponse object
 */
export function createSuccessResponse<T>(data: T, requestId: string): SuccessResponse<T> {
  return {
    success: true,
    data,
    request_id: requestId,
    timestamp: new Date().toISOString()
  };
}

/**
 * Create error response object (for internal use)
 * @param error Error object or AppError
 * @param requestId Request ID for tracking
 * @returns ErrorResponse object
 */
export function createErrorResponse(error: Error | AppError, requestId: string): ErrorResponse {
  let code = ERROR_CODES.INTERNAL_ERROR;
  let message = 'An unexpected error occurred';
  let details: string | undefined;
  let retryAfter: number | undefined;

  if (error instanceof AppError) {
    code = error.code;
    message = error.message;
    details = error.details;
    retryAfter = error.retryAfter;
  } else {
    console.error('Unexpected error:', error);
    details = process.env.NODE_ENV === 'development' ? error.message : undefined;
  }

  return {
    success: false,
    error: {
      code,
      message,
      details,
      retry_after: retryAfter
    },
    request_id: requestId,
    timestamp: new Date().toISOString()
  };
}

/**
 * Legacy function for backward compatibility
 */
export async function createApiHttpResponse(
  req: Request,
  handler: (req: Request) => Promise<Response>
) {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  try {
    return await handler(req);
  } catch (error) {
    console.error(error);
    const errorResponse = {
      message: error instanceof Error ? error.message : 'An unexpected error occurred.',
      stack: error instanceof Error ? error.stack : undefined,
    };
    return new Response(JSON.stringify(errorResponse), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}

/**
 * Legacy function for backward compatibility
 */
export function serveWithOptions(handler: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    return await createApiHttpResponse(req, handler);
  };
}