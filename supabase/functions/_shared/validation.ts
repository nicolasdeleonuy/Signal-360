// CORREGIDO: Se eliminó un bloque de código duplicado y huérfano que causaba un error de sintaxis.
// Se consolidaron funciones duplicadas y se reestructuró para mayor claridad.

import { AnalysisRequest, IdeaGenerationRequest, EncryptionRequest, DecryptionRequest } from './types.ts';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedData?: any;
}

/**
 * Validation schema definition
 */
export interface ValidationSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean';
    required?: boolean;
    pattern?: RegExp;
    enum?: string[];
    min?: number;
    max?: number;
  };
}

// --- SCHEMAS ---

const ANALYSIS_REQUEST_SCHEMA: ValidationSchema = {
  ticker_symbol: { type: 'string', required: true, pattern: /^[A-Z.]{1,6}$/i },
  analysis_context: { type: 'string', required: true, enum: ['investment', 'trading'] },
  trading_timeframe: { type: 'string', required: false, pattern: /^(1D|1W|1M|3M|6M|1Y)$/ }
};

const IDEA_GENERATION_SCHEMA: ValidationSchema = {
  context: { type: 'string', required: true, enum: ['investment_idea', 'trade_idea'] },
  timeframe: { type: 'string', required: false, pattern: /^(1D|1W|1M|3M|6M|1Y)$/ }
};

const ENCRYPTION_REQUEST_SCHEMA: ValidationSchema = {
  api_key: { type: 'string', required: true, pattern: /^AIza[0-9A-Za-z-_]{35}$/ }
};

const DECRYPTION_REQUEST_SCHEMA: ValidationSchema = {
  encrypted_key: { type: 'string', required: true }
};

// --- CORE VALIDATION LOGIC ---

/**
 * Generic validation function
 */
function validateData(data: any, schema: ValidationSchema): ValidationResult {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Request body must be a valid JSON object' };
  }

  const sanitizedData: any = {};
  const errors: string[] = [];
  const expectedFields = Object.keys(schema);
  const actualFields = Object.keys(data);

  for (const fieldName of expectedFields) {
    const rules = schema[fieldName];
    const value = data[fieldName];

    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`'${fieldName}' is required`);
      continue;
    }

    if (!rules.required && (value === undefined || value === null)) {
      continue;
    }

    if (typeof value !== rules.type) {
      errors.push(`'${fieldName}' must be a ${rules.type}`);
      continue;
    }

    if (rules.type === 'string') {
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`'${fieldName}' format is invalid`);
      }
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`'${fieldName}' must be one of: ${rules.enum.join(', ')}`);
      }
    }

    if (rules.type === 'number') {
        if (rules.min !== undefined && value < rules.min) {
            errors.push(`'${fieldName}' must be at least ${rules.min}`);
        }
        if (rules.max !== undefined && value > rules.max) {
            errors.push(`'${fieldName}' must be no more than ${rules.max}`);
        }
    }
    
    sanitizedData[fieldName] = value;
  }
  
  for (const fieldName of actualFields) {
      if (!expectedFields.includes(fieldName)) {
          errors.push(`Unexpected field: '${fieldName}'`);
      }
  }

  if (errors.length > 0) {
    return { isValid: false, error: errors.join('; ') };
  }

  // Special business logic validation
  if (schema === ANALYSIS_REQUEST_SCHEMA && data.analysis_context === 'trading' && !data.trading_timeframe) {
      return { isValid: false, error: "'trading_timeframe' is required when analysis_context is 'trading'" };
  }
  if (schema === IDEA_GENERATION_SCHEMA && data.context === 'trade_idea' && !data.timeframe) {
      return { isValid: false, error: "'timeframe' is required when context is 'trade_idea'" };
  }

  return { isValid: true, sanitizedData };
}

// --- PUBLIC VALIDATION FUNCTIONS ---

export function validateAnalysisRequest(data: any): ValidationResult {
  return validateData(data, ANALYSIS_REQUEST_SCHEMA);
}

export function validateIdeaGenerationRequest(data: any): ValidationResult {
  return validateData(data, IDEA_GENERATION_SCHEMA);
}

export function validateEncryptionRequest(data: any): ValidationResult {
  return validateData(data, ENCRYPTION_REQUEST_SCHEMA);
}

export function validateDecryptionRequest(data: any): ValidationResult {
  return validateData(data, DECRYPTION_REQUEST_SCHEMA);
}

// --- UTILITY VALIDATORS ---

export function isValidTicker(ticker: string): boolean {
    return /^[A-Z.]{1,6}$/i.test(ticker);
}
  
export function isValidGoogleApiKey(apiKey: string): boolean {
    return /^AIza[0-9A-Za-z-_]{35}$/.test(apiKey);
}

export async function parseRequestBody(request: Request): Promise<any> {
    try {
      const contentType = request.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Content-Type must be application/json');
      }
      const body = await request.text();
      if (!body || body.trim() === '') {
        throw new Error('Request body is required');
      }
      return JSON.parse(body);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON in request body');
      }
      throw error;
    }
}