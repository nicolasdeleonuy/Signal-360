import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get job ID from request body
    const { jobId } = await req.json();
    if (!jobId) {
      throw new Error("Missing jobId in request body");
    }

    // Initialize Supabase client with Service Role Key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase URL or Service Role Key in function secrets");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Query the analysis job from database
    const { data: job, error: queryError } = await supabase
      .from('analysis_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (queryError) {
      if (queryError.code === 'PGRST116') { // No rows returned
        throw new Error('Analysis job not found');
      }
      throw new Error(`Database error: ${queryError.message}`);
    }

    if (!job) {
      throw new Error('Analysis job not found');
    }

    // Build response object
    const response = {
      success: true,
      job_id: job.id,
      status: job.status,
      progress_percentage: job.progress_percentage || 0,
      current_phase: job.current_phase || 'initializing',
      ticker: job.ticker_symbol,
      context: job.analysis_context,
      created_at: job.created_at,
      updated_at: job.updated_at
    };

    // Add optional fields
    if (job.trading_timeframe) {
      response.trading_timeframe = job.trading_timeframe;
    }

    if (job.error_message) {
      response.error_message = job.error_message;
    }

    // Add estimated completion time for pending/in-progress jobs
    if (job.status === 'pending' || job.status === 'in_progress') {
      const jobAge = Date.now() - new Date(job.created_at).getTime();
      const typicalDuration = 60000; // 60 seconds
      const remainingTime = Math.max(0, typicalDuration - jobAge);
      response.estimated_completion_time = new Date(Date.now() + remainingTime).toISOString();
    }

    // Include results if completed
    if (job.status === 'completed' && job.result_data) {
      response.result = job.result_data;
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Analysis status request failed:", error.message);
    return new Response(
      JSON.stringify({
        success: false,
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