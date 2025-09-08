import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as djwt from "https://deno.land/x/djwt@v2.8/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Helper function to create a CryptoKey from a string secret
async function createCryptoKey(secret: string): Promise<CryptoKey> {
  const keyBuf = new TextEncoder().encode(secret);
  return await crypto.subtle.importKey(
    "raw",
    keyBuf,
    { name: "HMAC", hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- Manual Authentication ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error("Missing or invalid Authorization header");
    }
    const jwt = authHeader.split(' ')[1];

    const jwtSecret = Deno.env.get('JWT_SECRET');
    if (!jwtSecret) throw new Error("JWT_SECRET is not set in function secrets");

    const key = await createCryptoKey(jwtSecret);
    const payload = await djwt.verify(jwt, key);
    const userId = payload.sub;

    if (!userId || typeof userId !== 'string') {
      throw new Error("Invalid JWT payload: missing or invalid 'sub' claim");
    }

    // --- Application Logic ---
    // Extract all required fields from request body, including optional trading_timeframe
    const { ticker, context, trading_timeframe } = await req.json();
    if (!ticker || !context) {
      throw new Error("Missing ticker or context in request body");
    }

    // --- FIXED: Correct environment variable names for deployed functions ---
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase URL or Service Role Key in function secrets");
    }

    // Initialize the client with Service Role Key for admin-level access
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check for existing recent jobs
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: existingJobs, error: checkError } = await supabase
      .from('analysis_jobs')
      .select('id')
      .eq('user_id', userId)
      .eq('ticker_symbol', ticker)
      .in('status', ['pending', 'in_progress'])
      .gte('created_at', fiveMinutesAgo)
      .limit(1);

    if (checkError) throw new Error(`Database check failed: ${checkError.message}`);

    if (existingJobs && existingJobs.length > 0) {
      // FIXED: Standardized success response for existing job
      return new Response(
        JSON.stringify({ success: true, jobId: existingJobs[0].id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jobId = `job_${crypto.randomUUID()}`;

    const { error: insertError } = await supabase
      .from('analysis_jobs')
      .insert({
        id: jobId,
        user_id: userId,
        ticker_symbol: ticker.toUpperCase(),
        analysis_context: context,
        ...(trading_timeframe && { trading_timeframe }),
        status: 'pending',
      });

    if (insertError) throw new Error(`Failed to create job: ${insertError.message}`);

    // Asynchronously trigger the analyze-ticker function (fire-and-forget)
    supabase.functions.invoke('analyze-ticker', {
      body: {
        jobId: jobId,
        ticker_symbol: ticker.toUpperCase(),
        analysis_context: context,
        ...(trading_timeframe && { trading_timeframe })
      }
    }).catch(async (invocationError) => {
      // Log the error for debugging
      console.error(`Failed to invoke analyze-ticker for job ${jobId}:`, invocationError);
      
      // Update the job status to failed to prevent it from being stuck in pending
      try {
        await supabase
          .from('analysis_jobs')
          .update({
            status: 'failed',
            error_message: `Failed to start analysis: ${invocationError.message || 'Unknown error'}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);
        
        console.log(`Job ${jobId} marked as failed due to invocation error`);
      } catch (updateError) {
        console.error(`Failed to update job ${jobId} status to failed:`, updateError);
      }
    });

    // FIXED: Standardized success response for new job
    return new Response(
      JSON.stringify({ success: true, jobId: jobId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Request failed:", error.message);
    return new Response(
      JSON.stringify({
        code: 'REQUEST_FAILED',
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
