# Signal-360 Deployment Guide

This guide provides comprehensive instructions for deploying the Signal-360 predictive ticker search system to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Production Deployment](#production-deployment)
4. [Verification](#verification)
5. [Monitoring](#monitoring)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools

- **Node.js** (v18 or higher)
- **npm** (v8 or higher)
- **Supabase CLI** (latest version)
- **jq** (for JSON processing)
- **curl** (for API testing)

### Installation Commands

```bash
# Install Node.js and npm (if not already installed)
# Visit https://nodejs.org/ or use a package manager

# Install Supabase CLI
npm install -g supabase

# Install jq
# macOS
brew install jq

# Ubuntu/Debian
sudo apt-get install jq

# Verify installations
node --version
npm --version
supabase --version
jq --version
```

### Supabase Setup

1. **Create Supabase Account**
   - Visit [supabase.com](https://supabase.com)
   - Create an account or sign in

2. **Create New Project**
   - Click "New Project"
   - Choose organization
   - Enter project name: "signal-360-production"
   - Set database password (save securely)
   - Select region closest to your users

3. **Get Project Credentials**
   - Go to Settings → API
   - Copy the following values:
     - Project URL
     - Project Reference ID
     - Anon (public) key
     - Service Role (secret) key

## Environment Configuration

### 1. Configure Supabase Secrets

Set the required secrets in your Supabase project:

```bash
# Login to Supabase CLI
supabase login

# Set project secrets
supabase secrets set FINNHUB_API_KEY="your-finnhub-api-key" --project-ref your-project-ref
supabase secrets set GOOGLE_API_KEY="your-google-api-key" --project-ref your-project-ref
supabase secrets set ENCRYPTION_KEY="your-32-character-encryption-key" --project-ref your-project-ref
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" --project-ref your-project-ref
```

### 2. API Key Setup

#### Finnhub API Key
1. Visit [finnhub.io](https://finnhub.io)
2. Create free account
3. Get API key from dashboard
4. Free tier provides 60 calls/minute

#### Google API Key
1. Visit [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable required APIs:
   - Custom Search JSON API
   - (Add other required APIs)
4. Create API key with appropriate restrictions

### 3. Environment Variables

Create production environment file:

```bash
# Copy example environment file
cp supabase/functions/.env.example supabase/functions/.env.production

# Edit with production values
nano supabase/functions/.env.production
```

Key production settings:

```bash
# Environment
ENVIRONMENT=production
LOG_LEVEL=WARN

# Performance
CACHE_ENABLED=true
RATE_LIMITING_ENABLED=true
RATE_LIMIT_REQUESTS_PER_MINUTE=100

# Security
CORS_ALLOWED_ORIGINS=https://yourdomain.com
SECURITY_HEADERS_ENABLED=true

# Monitoring
PERFORMANCE_MONITORING_ENABLED=true
ERROR_TRACKING_ENABLED=true
```

## Production Deployment

### 1. Pre-deployment Checks

Run the deployment script with dry-run to verify configuration:

```bash
# Navigate to project root
cd /path/to/signal-360

# Run dry-run deployment
./scripts/deploy.sh --environment production --dry-run --verbose
```

### 2. Run Tests

Ensure all tests pass before deployment:

```bash
# Run frontend tests
npm test

# Run Edge Function tests
cd supabase/functions
deno test --allow-env --allow-net --allow-read
```

### 3. Deploy to Production

```bash
# Deploy all functions to production
./scripts/deploy.sh --environment production --verbose

# Or deploy specific function
supabase functions deploy ticker-search --project-ref your-project-ref
```

### 4. Verify Deployment

The deployment script automatically verifies deployment, but you can manually test:

```bash
# Test ticker-search function
curl -X POST "https://your-project.supabase.co/functions/v1/ticker-search" \
  -H "Authorization: Bearer your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{"query": "AAPL"}'
```

Expected response:
```json
{
  "success": true,
  "data": [
    {
      "ticker": "AAPL",
      "name": "Apple Inc.",
      "exchange": "NASDAQ"
    }
  ]
}
```

## Frontend Deployment

### 1. Build Production Bundle

```bash
# Install dependencies
npm install

# Build for production
npm run build
```

### 2. Environment Configuration

Create production environment file:

```bash
# Create .env.production
cat > .env.production << EOF
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ENVIRONMENT=production
EOF
```

### 3. Deploy Frontend

Deploy the `dist` folder to your hosting provider:

#### Vercel
```bash
npm install -g vercel
vercel --prod
```

#### Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

#### Manual Upload
Upload the contents of the `dist` folder to your web server.

## Verification

### 1. Functional Testing

Test the complete user flow:

1. **Load Application**
   - Visit your production URL
   - Verify page loads without errors

2. **Test Ticker Search**
   - Type "AAPL" in search box
   - Verify suggestions appear
   - Click on a suggestion
   - Verify ticker is selected

3. **Test Caching**
   - Search for same ticker again
   - Verify results load instantly (cached)

4. **Test Error Handling**
   - Search for invalid ticker
   - Verify appropriate error message

### 2. Performance Testing

```bash
# Test API response times
curl -w "@curl-format.txt" -X POST \
  "https://your-project.supabase.co/functions/v1/ticker-search" \
  -H "Authorization: Bearer your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{"query": "AAPL"}'
```

Create `curl-format.txt`:
```
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
```

### 3. Security Testing

- Verify CORS headers are properly set
- Test rate limiting (make rapid requests)
- Verify API keys are not exposed in client
- Test with invalid authentication

## Monitoring

### 1. Supabase Dashboard

Monitor your functions in the Supabase dashboard:

1. Go to Edge Functions section
2. View logs and metrics
3. Monitor error rates and response times

### 2. Custom Monitoring

Set up alerts for:

- High error rates (>5%)
- Slow response times (>10s)
- High memory usage (>80%)
- API rate limit hits

### 3. Log Analysis

Key log patterns to monitor:

```bash
# Error patterns
grep "ERROR" /var/log/supabase/functions.log

# Performance patterns
grep "SLOW_OPERATION" /var/log/supabase/functions.log

# Rate limiting
grep "RATE_LIMIT_EXCEEDED" /var/log/supabase/functions.log
```

## Troubleshooting

### Common Issues

#### 1. Function Not Accessible

**Symptoms:** 404 errors when calling function

**Solutions:**
- Verify function deployed successfully
- Check function name matches exactly
- Verify project reference ID
- Check CORS configuration

#### 2. API Key Errors

**Symptoms:** "Invalid API key" or authentication errors

**Solutions:**
- Verify API keys are set in Supabase secrets
- Check API key format and validity
- Verify API key permissions
- Check rate limits on external APIs

#### 3. Slow Response Times

**Symptoms:** Requests taking >5 seconds

**Solutions:**
- Check external API response times
- Verify caching is enabled
- Monitor memory usage
- Check network connectivity

#### 4. CORS Errors

**Symptoms:** Browser blocks requests

**Solutions:**
- Update CORS_ALLOWED_ORIGINS in environment
- Verify domain matches exactly
- Check protocol (http vs https)
- Redeploy functions after CORS changes

### Debug Commands

```bash
# View function logs
supabase functions logs ticker-search --project-ref your-project-ref

# Test function locally
supabase functions serve ticker-search

# Check function status
supabase functions list --project-ref your-project-ref

# View project settings
supabase projects list
```

### Support Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Finnhub API Documentation](https://finnhub.io/docs/api)
- [Project GitHub Issues](https://github.com/your-org/signal-360/issues)

## Rollback Procedure

If deployment issues occur:

1. **Immediate Rollback**
   ```bash
   # Redeploy previous version
   git checkout previous-stable-tag
   ./scripts/deploy.sh --environment production --force
   ```

2. **Partial Rollback**
   ```bash
   # Rollback specific function
   supabase functions deploy ticker-search --project-ref your-project-ref
   ```

3. **Database Rollback**
   ```bash
   # If database changes were made
   supabase db reset --project-ref your-project-ref
   ```

## Maintenance

### Regular Tasks

- **Weekly:** Review error logs and performance metrics
- **Monthly:** Update dependencies and security patches
- **Quarterly:** Review and rotate API keys
- **Annually:** Review and update deployment procedures

### Updates

To deploy updates:

1. Test changes in development
2. Run full test suite
3. Deploy to staging first
4. Verify staging deployment
5. Deploy to production
6. Monitor for issues

---

For additional support, contact the development team or create an issue in the project repository.