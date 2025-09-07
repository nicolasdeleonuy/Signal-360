// Analysis Engine - Core orchestrator for managing analysis job lifecycle
// Handles the complete analysis workflow from job initialization to completion

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AnalysisResult } from './types.ts';

/**
 * Job interface representing a row from the analysis_jobs table
 */
interface AnalysisJob {
  id: string;
  user_id: string;
  ticker_symbol: string;
  analysis_context: 'investment' | 'trading';
  trading_timeframe?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress_percentage: number;
  current_phase: string;
  error_message?: string;
  result_data?: any;
  created_at: string;
  updated_at: string;
}

/**
 * Placeholder function for fundamental analysis
 * This will be implemented in the next task
 */
async function runFundamentalAnalysis(job: AnalysisJob): Promise<AnalysisResult> {
  // TODO: This will be implemented in Task 4 - FundamentalEngine
  console.log(`[PLACEHOLDER] Running fundamental analysis for ${job.ticker_symbol}`);
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Return placeholder result
  return {
    score: 75,
    confidence: 0.8,
    factors: [
      {
        type: 'positive',
        category: 'financial_health',
        description: 'Strong revenue growth and healthy profit margins',
        weight: 0.7,
        confidence: 0.9
      },
      {
        type: 'positive',
        category: 'valuation',
        description: 'Trading at reasonable P/E ratio compared to sector',
        weight: 0.6,
        confidence: 0.8
      }
    ],
    metadata: {
      engineVersion: '1.0.0-placeholder',
      dataSource: 'mock_data',
      processingTime: 2000,
      dataQuality: 0.8
    },
    timestamp: new Date().toISOString(),
    status: 'success'
  };
}

/**
 * Main analysis orchestrator function
 * Manages the complete lifecycle of an analysis job
 * 
 * @param job - Analysis job object from the database
 */
export async function performAnalysis(job: AnalysisJob): Promise<void> {
  console.log(`[AnalysisEngine] Starting analysis for job ${job.id} - ${job.ticker_symbol} (${job.analysis_context})`);
  
  // Initialize Supabase client with service role key
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase URL or Service Role Key in function environment');
  }
  
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  
  try {
    // Update job status to in_progress and set initial progress
    console.log(`[AnalysisEngine] Updating job ${job.id} status to in_progress`);
    
    const { error: updateError } = await supabase
      .from('analysis_jobs')
      .update({
        status: 'in_progress',
        progress_percentage: 10,
        current_phase: 'fundamental_analysis',
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);
    
    if (updateError) {
      throw new Error(`Failed to update job status: ${updateError.message}`);
    }
    
    console.log(`[AnalysisEngine] Job ${job.id} status updated to in_progress`);
    
    // Execute Fundamental Analysis
    console.log(`[AnalysisEngine] Starting fundamental analysis for ${job.ticker_symbol}`);
    
    let fundamentalResult: AnalysisResult;
    
    try {
      fundamentalResult = await runFundamentalAnalysis(job);
      console.log(`[AnalysisEngine] Fundamental analysis completed successfully for ${job.ticker_symbol}`);
    } catch (analysisError) {
      console.error(`[AnalysisEngine] Fundamental analysis failed for ${job.ticker_symbol}:`, analysisError);
      throw analysisError;
    }
    
    // Handle Success - Update job to completed with results
    console.log(`[AnalysisEngine] Saving analysis results for job ${job.id}`);
    
    const analysisResults = {
      fundamental: fundamentalResult,
      technical: null, // Will be added in future tasks
      eco: null,       // Will be added in future tasks
      synthesis: null, // Will be added when synthesis engine is integrated
      completed_at: new Date().toISOString(),
      analysis_version: '1.0.0'
    };
    
    const { error: completionError } = await supabase
      .from('analysis_jobs')
      .update({
        status: 'completed',
        progress_percentage: 100,
        current_phase: 'completed',
        result_data: analysisResults,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);
    
    if (completionError) {
      throw new Error(`Failed to save analysis results: ${completionError.message}`);
    }
    
    console.log(`[AnalysisEngine] Analysis completed successfully for job ${job.id} - ${job.ticker_symbol}`);
    
  } catch (error) {
    // Handle Failure - Update job to failed with error message
    console.error(`[AnalysisEngine] Analysis failed for job ${job.id}:`, error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred during analysis';
    
    try {
      const { error: failureError } = await supabase
        .from('analysis_jobs')
        .update({
          status: 'failed',
          progress_percentage: 100,
          current_phase: 'failed',
          error_message: errorMessage,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);
      
      if (failureError) {
        console.error(`[AnalysisEngine] Failed to update job failure status:`, failureError);
      } else {
        console.log(`[AnalysisEngine] Job ${job.id} marked as failed with error: ${errorMessage}`);
      }
    } catch (updateError) {
      console.error(`[AnalysisEngine] Critical error updating job failure status:`, updateError);
    }
    
    // Re-throw the original error
    throw error;
  }
}

/**
 * Utility function to validate job object
 */
export function validateJob(job: any): job is AnalysisJob {
  if (!job || typeof job !== 'object') {
    return false;
  }
  
  const requiredFields = ['id', 'user_id', 'ticker_symbol', 'analysis_context'];
  for (const field of requiredFields) {
    if (!job[field]) {
      return false;
    }
  }
  
  if (!['investment', 'trading'].includes(job.analysis_context)) {
    return false;
  }
  
  return true;
}

/**
 * Utility function to create error response for job processing
 */
export function createJobError(jobId: string, message: string, originalError?: Error): Error {
  const errorMessage = `Job ${jobId} failed: ${message}`;
  if (originalError) {
    console.error(`[AnalysisEngine] Original error:`, originalError);
  }
  return new Error(errorMessage);
}