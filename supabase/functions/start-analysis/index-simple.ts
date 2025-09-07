// Simplified Start Analysis Edge Function for debugging
// Minimal version to test if the function can start

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createRequestHandler,
  createSuccessHttpResponse,
  createErrorHttpResponse,
  generateRequestId
} from '../_shared/index.ts';

/**
 * Simple test handler
 */
const handleStartAnalysisRequest = async (request: Request, requestId: string): Promise<Response> => {
  try {
    console.log('Start analysis function is working!', { requestId });

    // Simple response to test if function works
    const response = {
      message: 'Start analysis function is working',
      job_id: generateRequestId(),
      status: 'test',
      timestamp: new Date().toISOString()
    };

    return createSuccessHttpResponse(response, requestId);

  } catch (error) {
    console.error('Start analysis request failed', { error, requestId });
    return createErrorHttpResponse(error instanceof Error ? error : new Error(String(error)), requestId);
  }
};

// Create and serve the request handler
const handler = createRequestHandler(handleStartAnalysisRequest, ['POST']);

serve(handler);