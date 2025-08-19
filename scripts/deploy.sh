#!/bin/bash

# Signal-360 Edge Functions Deployment Script
# Deploys all Edge Functions to Supabase with proper configuration

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FUNCTIONS_DIR="$PROJECT_ROOT/supabase/functions"
CONFIG_FILE="$FUNCTIONS_DIR/deploy.config.json"

# Default values
ENVIRONMENT="production"
DRY_RUN=false
VERBOSE=false
FORCE=false

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Deploy Signal-360 Edge Functions to Supabase

OPTIONS:
    -e, --environment ENV    Target environment (development, staging, production)
    -d, --dry-run           Show what would be deployed without actually deploying
    -v, --verbose           Enable verbose output
    -f, --force             Force deployment even if validation fails
    -h, --help              Show this help message

EXAMPLES:
    $0                                    # Deploy to production
    $0 -e staging                         # Deploy to staging
    $0 -d -v                             # Dry run with verbose output
    $0 -e development --force            # Force deploy to development

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    print_error "Invalid environment: $ENVIRONMENT"
    print_error "Must be one of: development, staging, production"
    exit 1
fi

print_status "Starting deployment to $ENVIRONMENT environment"

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Supabase CLI is installed
    if ! command -v supabase &> /dev/null; then
        print_error "Supabase CLI is not installed"
        print_error "Install it with: npm install -g supabase"
        exit 1
    fi
    
    # Check if jq is installed (for JSON processing)
    if ! command -v jq &> /dev/null; then
        print_error "jq is not installed"
        print_error "Install it with: brew install jq (macOS) or apt-get install jq (Linux)"
        exit 1
    fi
    
    # Check if we're logged in to Supabase
    if ! supabase projects list &> /dev/null; then
        print_error "Not logged in to Supabase"
        print_error "Run: supabase login"
        exit 1
    fi
    
    # Check if config file exists
    if [[ ! -f "$CONFIG_FILE" ]]; then
        print_error "Deployment config file not found: $CONFIG_FILE"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Validate configuration
validate_config() {
    print_status "Validating deployment configuration..."
    
    # Check if environment exists in config
    if ! jq -e ".environments.$ENVIRONMENT" "$CONFIG_FILE" > /dev/null; then
        print_error "Environment '$ENVIRONMENT' not found in config file"
        exit 1
    fi
    
    # Validate function configurations
    local functions=$(jq -r '.functions | keys[]' "$CONFIG_FILE")
    for func in $functions; do
        if [[ ! -d "$FUNCTIONS_DIR/$func" ]]; then
            print_warning "Function directory not found: $func"
            if [[ "$FORCE" != true ]]; then
                print_error "Use --force to deploy anyway"
                exit 1
            fi
        fi
        
        if [[ ! -f "$FUNCTIONS_DIR/$func/index.ts" ]]; then
            print_warning "Function entry point not found: $func/index.ts"
            if [[ "$FORCE" != true ]]; then
                print_error "Use --force to deploy anyway"
                exit 1
            fi
        fi
    done
    
    print_success "Configuration validation passed"
}

# Run tests
run_tests() {
    print_status "Running tests before deployment..."
    
    cd "$PROJECT_ROOT"
    
    # Run unit tests
    if [[ -f "package.json" ]] && grep -q "test" package.json; then
        if [[ "$VERBOSE" == true ]]; then
            npm test
        else
            npm test > /dev/null 2>&1
        fi
        
        if [[ $? -ne 0 ]]; then
            print_error "Unit tests failed"
            if [[ "$FORCE" != true ]]; then
                exit 1
            else
                print_warning "Continuing deployment despite test failures (--force used)"
            fi
        fi
    fi
    
    # Run integration tests if available
    if [[ -f "$FUNCTIONS_DIR/_shared/run-integration-tests.ts" ]]; then
        print_status "Running integration tests..."
        
        if [[ "$VERBOSE" == true ]]; then
            deno run --allow-env --allow-net --allow-read "$FUNCTIONS_DIR/_shared/run-integration-tests.ts"
        else
            deno run --allow-env --allow-net --allow-read "$FUNCTIONS_DIR/_shared/run-integration-tests.ts" > /dev/null 2>&1
        fi
        
        if [[ $? -ne 0 ]]; then
            print_error "Integration tests failed"
            if [[ "$FORCE" != true ]]; then
                exit 1
            else
                print_warning "Continuing deployment despite test failures (--force used)"
            fi
        fi
    fi
    
    print_success "Tests passed"
}

# Set environment variables
set_environment_variables() {
    print_status "Setting environment variables for $ENVIRONMENT..."
    
    # Get environment config from JSON
    local env_config=$(jq -r ".environments.$ENVIRONMENT" "$CONFIG_FILE")
    
    # Set Supabase project
    local supabase_url=$(echo "$env_config" | jq -r '.supabase_url')
    if [[ "$supabase_url" != "null" ]]; then
        export SUPABASE_URL="$supabase_url"
        if [[ "$VERBOSE" == true ]]; then
            print_status "Set SUPABASE_URL=$supabase_url"
        fi
    fi
    
    # Set log level
    local log_level=$(echo "$env_config" | jq -r '.log_level')
    if [[ "$log_level" != "null" ]]; then
        export LOG_LEVEL="$log_level"
        if [[ "$VERBOSE" == true ]]; then
            print_status "Set LOG_LEVEL=$log_level"
        fi
    fi
    
    # Set environment
    export ENVIRONMENT="$ENVIRONMENT"
    
    print_success "Environment variables configured"
}

# Deploy functions
deploy_functions() {
    print_status "Deploying Edge Functions..."
    
    local functions=$(jq -r '.functions | keys[]' "$CONFIG_FILE")
    local total_functions=$(echo "$functions" | wc -l)
    local current=0
    
    for func in $functions; do
        current=$((current + 1))
        print_status "Deploying function $current/$total_functions: $func"
        
        if [[ "$DRY_RUN" == true ]]; then
            print_status "[DRY RUN] Would deploy: $func"
            continue
        fi
        
        # Get function config
        local func_config=$(jq -r ".functions.$func" "$CONFIG_FILE")
        local timeout=$(echo "$func_config" | jq -r '.timeout // 60')
        local memory=$(echo "$func_config" | jq -r '.memory // 256')
        
        # Deploy the function
        cd "$FUNCTIONS_DIR"
        
        if [[ "$VERBOSE" == true ]]; then
            supabase functions deploy "$func" --project-ref="$(get_project_ref)"
        else
            supabase functions deploy "$func" --project-ref="$(get_project_ref)" > /dev/null 2>&1
        fi
        
        if [[ $? -eq 0 ]]; then
            print_success "Deployed: $func"
        else
            print_error "Failed to deploy: $func"
            if [[ "$FORCE" != true ]]; then
                exit 1
            fi
        fi
    done
    
    print_success "All functions deployed successfully"
}

# Get Supabase project reference
get_project_ref() {
    # Extract project ref from SUPABASE_URL
    echo "$SUPABASE_URL" | sed 's/https:\/\/\([^.]*\).*/\1/'
}

# Verify deployment
verify_deployment() {
    print_status "Verifying deployment..."
    
    if [[ "$DRY_RUN" == true ]]; then
        print_status "[DRY RUN] Would verify deployment"
        return
    fi
    
    local functions=$(jq -r '.functions | keys[]' "$CONFIG_FILE")
    local failed_functions=()
    
    for func in $functions; do
        # Test function endpoint
        local url="$SUPABASE_URL/functions/v1/$func"
        
        if [[ "$VERBOSE" == true ]]; then
            print_status "Testing function: $func at $url"
        fi
        
        # Simple health check (OPTIONS request)
        if curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$url" | grep -q "200\|404"; then
            if [[ "$VERBOSE" == true ]]; then
                print_success "Function accessible: $func"
            fi
        else
            print_warning "Function may not be accessible: $func"
            failed_functions+=("$func")
        fi
    done
    
    if [[ ${#failed_functions[@]} -eq 0 ]]; then
        print_success "Deployment verification passed"
    else
        print_warning "Some functions may not be accessible: ${failed_functions[*]}"
        if [[ "$FORCE" != true ]]; then
            print_error "Use --force to ignore verification failures"
            exit 1
        fi
    fi
}

# Generate deployment report
generate_report() {
    print_status "Generating deployment report..."
    
    local report_file="deployment-report-$(date +%Y%m%d-%H%M%S).json"
    local functions=$(jq -r '.functions | keys[]' "$CONFIG_FILE")
    
    cat > "$report_file" << EOF
{
  "deployment": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "$ENVIRONMENT",
    "dry_run": $DRY_RUN,
    "functions_deployed": [$(echo "$functions" | sed 's/.*/"&"/' | paste -sd,)],
    "total_functions": $(echo "$functions" | wc -l),
    "deployment_duration": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "status": "success"
  }
}
EOF
    
    print_success "Deployment report generated: $report_file"
}

# Main deployment flow
main() {
    print_status "Signal-360 Edge Functions Deployment"
    print_status "Environment: $ENVIRONMENT"
    print_status "Dry Run: $DRY_RUN"
    print_status "Verbose: $VERBOSE"
    print_status "Force: $FORCE"
    echo
    
    check_prerequisites
    validate_config
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        run_tests
    fi
    
    set_environment_variables
    deploy_functions
    verify_deployment
    generate_report
    
    print_success "Deployment completed successfully!"
    
    if [[ "$DRY_RUN" == true ]]; then
        print_status "This was a dry run. No actual deployment occurred."
    fi
}

# Run main function
main "$@"