#!/bin/bash

# Deploy Analysis Endpoints Script
# Deploys the new asynchronous analysis endpoints to Supabase

echo "🚀 Deploying Real-Time Financial Analysis Endpoints..."

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Deploy the start-analysis function
echo "📤 Deploying start-analysis function..."
supabase functions deploy start-analysis

if [ $? -eq 0 ]; then
    echo "✅ start-analysis function deployed successfully"
else
    echo "❌ Failed to deploy start-analysis function"
    exit 1
fi

# Deploy the analysis-status function
echo "📤 Deploying analysis-status function..."
supabase functions deploy analysis-status

if [ $? -eq 0 ]; then
    echo "✅ analysis-status function deployed successfully"
else
    echo "❌ Failed to deploy analysis-status function"
    exit 1
fi

# Deploy the updated signal-360-analysis function
echo "📤 Deploying updated signal-360-analysis function..."
supabase functions deploy signal-360-analysis

if [ $? -eq 0 ]; then
    echo "✅ signal-360-analysis function updated successfully"
else
    echo "❌ Failed to deploy signal-360-analysis function"
    exit 1
fi

echo ""
echo "🎉 All functions deployed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Run the database migration to create the analysis_jobs table"
echo "2. Test the endpoints with a sample request"
echo "3. Update the frontend to use the new asynchronous flow"
echo ""
echo "🔗 New endpoints available:"
echo "   POST /start-analysis - Start a new analysis job"
echo "   GET /analysis-status/{jobId} - Check analysis progress"
echo ""