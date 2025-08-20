// Signal-360 Analysis Edge Function
// Main orchestrator for comprehensive financial asset analysis
// Coordinates fundamental, technical, and ESG analysis with synthesis

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'zod';
import { createGoogleApiClient } from '../_shared/services/googleApiService.ts';

/**
 * Zod schema for validating analysis request body
 */
const AnalysisRequestSchema = z.object({
    ticker: z.string()
        .min(1, 'Ticker symbol is required')
        .max(5, 'Ticker symbol must be 5 characters or less')
        .transform(val => val.toUpperCase())
        .refine(val => /^[A-Z]+$/.test(val), {
            message: 'Ticker symbol must contain only letters'
        }),
    context: z.enum(['investment', 'trading'], {
        errorMap: () => ({ message: 'Context must be either "investment" or "trading"' })
    })
});

/**
 * Placeholder function for API key decryption
 * TODO: Replace with actual decryption logic using proper encryption service
 * @param encryptedKey - The encrypted API key from the database
 * @returns The decrypted API key
 */
function decryptApiKey(encryptedKey: string): string {
    // Placeholder implementation - currently returns the encrypted key as-is
    // In production, this should use proper decryption with the encryption service
    console.log('Decrypting API key (placeholder implementation)');
    return encryptedKey;
}

/**
 * CORS headers for cross-origin requests
 */
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Initialize Supabase admin client
 */
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

/**
 * Handle CORS preflight requests
 */
function handleCorsPreflightRequest(): Response {
    return new Response(null, {
        status: 200,
        headers: corsHeaders,
    });
}

/**
 * Main request handler for the signal-360-analysis Edge Function
 */
async function handleRequest(request: Request): Promise<Response> {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
        return handleCorsPreflightRequest();
    }

    // Only allow POST requests for analysis
    if (request.method !== 'POST') {
        return new Response(
            JSON.stringify({
                success: false,
                error: {
                    code: 'METHOD_NOT_ALLOWED',
                    message: 'Only POST requests are allowed for analysis',
                },
            }),
            {
                status: 405,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders,
                },
            }
        );
    }

    // Extract and validate Authorization header
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(
            JSON.stringify({
                success: false,
                error: {
                    code: 'MISSING_TOKEN',
                    message: 'Authorization header with Bearer token is required',
                },
            }),
            {
                status: 401,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders,
                },
            }
        );
    }

    // Extract JWT token from Authorization header
    const jwt = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!jwt) {
        return new Response(
            JSON.stringify({
                success: false,
                error: {
                    code: 'INVALID_TOKEN',
                    message: 'JWT token is required',
                },
            }),
            {
                status: 401,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders,
                },
            }
        );
    }

    // Validate JWT token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);

    if (authError || !user) {
        console.error('Authentication error:', authError);
        return new Response(
            JSON.stringify({
                success: false,
                error: {
                    code: 'INVALID_TOKEN',
                    message: 'Invalid or expired JWT token',
                },
            }),
            {
                status: 401,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders,
                },
            }
        );
    }

    try {
        // Log authenticated user ID
        console.log('Authenticated user:', user.id);

        // Parse incoming request as JSON
        const requestBody = await request.json();

        // Validate request body using Zod schema
        const validationResult = AnalysisRequestSchema.safeParse(requestBody);

        if (!validationResult.success) {
            const validationErrors = validationResult.error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
                code: err.code
            }));

            return new Response(
                JSON.stringify({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Request validation failed',
                        details: validationErrors
                    },
                }),
                {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders,
                    },
                }
            );
        }

        // Use validated and transformed data
        const validatedData = validationResult.data;

        console.log('Validated analysis request:', {
            ticker: validatedData.ticker,
            context: validatedData.context,
            userId: user.id
        });

        // Query the database for user's Google API key
        const { data: profileData, error: dbError } = await supabase
            .from('profiles')
            .select('encrypted_google_api_key')
            .eq('id', user.id)
            .single();

        // Handle database query errors
        if (dbError) {
            console.error('Database error while retrieving API key:', dbError);
            return new Response(
                JSON.stringify({
                    success: false,
                    error: {
                        code: 'DATABASE_ERROR',
                        message: 'Failed to retrieve user configuration',
                    },
                }),
                {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders,
                    },
                }
            );
        }

        // Handle missing or empty API key
        if (!profileData?.encrypted_google_api_key) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: {
                        code: 'API_KEY_NOT_CONFIGURED',
                        message: 'Google API key not configured. Please add your API key in the profile section to enable analysis.',
                    },
                }),
                {
                    status: 412,
                    headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders,
                    },
                }
            );
        }

        // Store the encrypted API key securely (do not log the actual key)
        const encryptedApiKey = profileData.encrypted_google_api_key;
        console.log('User API key retrieved successfully');

        // Decrypt the API key (placeholder implementation)
        const decryptedApiKey = decryptApiKey(encryptedApiKey);

        // Create Google API client with decrypted key
        const googleApi = createGoogleApiClient(decryptedApiKey);
        console.log('Google API client initialized successfully');

        // Execute all three analysis methods in parallel
        console.log(`Starting parallel analysis for ticker: ${validatedData.ticker}`);
        const analysisStartTime = Date.now();

        const analysisResults = await Promise.allSettled([
            googleApi.getFundamentalData(validatedData.ticker),
            googleApi.getTechnicalData(validatedData.ticker),
            googleApi.getESGData(validatedData.ticker)
        ]);

        const analysisEndTime = Date.now();
        const analysisExecutionTime = analysisEndTime - analysisStartTime;

        // Process results and separate successful from failed analyses
        const successfulAnalyses: any = {};
        const failedAnalyses: string[] = [];
        let isPartialResult = false;

        // Process fundamental analysis result
        if (analysisResults[0].status === 'fulfilled') {
            successfulAnalyses.fundamental = analysisResults[0].value;
            console.log('Fundamental analysis completed successfully');
        } else {
            console.error('Fundamental analysis failed:', analysisResults[0].reason);
            failedAnalyses.push('fundamental');
            isPartialResult = true;
        }

        // Process technical analysis result
        if (analysisResults[1].status === 'fulfilled') {
            successfulAnalyses.technical = analysisResults[1].value;
            console.log('Technical analysis completed successfully');
        } else {
            console.error('Technical analysis failed:', analysisResults[1].reason);
            failedAnalyses.push('technical');
            isPartialResult = true;
        }

        // Process ESG analysis result
        if (analysisResults[2].status === 'fulfilled') {
            successfulAnalyses.esg = analysisResults[2].value;
            console.log('ESG analysis completed successfully');
        } else {
            console.error('ESG analysis failed:', analysisResults[2].reason);
            failedAnalyses.push('esg');
            isPartialResult = true;
        }

        // Log overall analysis completion
        console.log(`Analysis completed in ${analysisExecutionTime}ms. Successful: ${Object.keys(successfulAnalyses).length}/3, Failed: ${failedAnalyses.length}/3`);

        // Construct final response with analysis results
        const response: any = {
            success: true,
            message: 'Financial analysis completed',
            timestamp: new Date().toISOString(),
            executionTime: analysisExecutionTime,
            ticker: validatedData.ticker,
            context: validatedData.context,
            data: successfulAnalyses
        };

        // Add partial flag if any analysis failed
        if (isPartialResult) {
            response.partial = true;
            response.failedAnalyses = failedAnalyses;
            console.warn(`Partial result returned. Failed analyses: ${failedAnalyses.join(', ')}`);
        }

        return new Response(JSON.stringify(response), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders,
            },
        });

    } catch (error) {
        console.error('Error processing request:', error);

        return new Response(
            JSON.stringify({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'An error occurred while processing the request',
                },
            }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders,
                },
            }
        );
    }
}

// Start the Edge Function server
serve(handleRequest);