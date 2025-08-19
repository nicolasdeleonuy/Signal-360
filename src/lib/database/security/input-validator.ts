// Input validation and sanitization utilities
// Provides comprehensive input validation and SQL injection prevention

import { ValidationService } from '../validation';
import { DatabaseError } from '../../../types/database';

/**
 * Input validator for database operations
 * Provides comprehensive input validation and sanitization
 */
export class InputValidator {
  /**
   * Validate and sanitize user ID
   * @param userId User ID to validate
   * @returns string Validated user ID
   * @throws DatabaseError if validation fails
   */
  static validateUserId(userId: any): string {
    if (!userId) {
      throw this.createValidationError('User ID is required');
    }

    if (typeof userId !== 'string') {
      throw this.createValidationError('User ID must be a string');
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      throw this.createValidationError('User ID must be a valid UUID');
    }

    return userId;
  }

  /**
   * Validate and sanitize analysis ID
   * @param analysisId Analysis ID to validate
   * @returns number Validated analysis ID
   * @throws DatabaseError if validation fails
   */
  static validateAnalysisId(analysisId: any): number {
    if (analysisId === null || analysisId === undefined) {
      throw this.createValidationError('Analysis ID is required');
    }

    const numericId = Number(analysisId);
    if (isNaN(numericId) || !Number.isInteger(numericId) || numericId <= 0) {
      throw this.createValidationError('Analysis ID must be a positive integer');
    }

    return numericId;
  }

  /**
   * Validate and sanitize ticker symbol
   * @param ticker Ticker symbol to validate
   * @returns string Validated ticker symbol
   * @throws DatabaseError if validation fails
   */
  static validateTickerSymbol(ticker: any): string {
    if (!ticker) {
      throw this.createValidationError('Ticker symbol is required');
    }

    if (typeof ticker !== 'string') {
      throw this.createValidationError('Ticker symbol must be a string');
    }

    const sanitized = ValidationService.sanitizeTickerSymbol(ticker);
    if (!ValidationService.isValidTickerSymbol(sanitized)) {
      throw this.createValidationError('Invalid ticker symbol format');
    }

    return sanitized;
  }

  /**
   * Validate and sanitize synthesis score
   * @param score Synthesis score to validate
   * @returns number Validated synthesis score
   * @throws DatabaseError if validation fails
   */
  static validateSynthesisScore(score: any): number {
    if (score === null || score === undefined) {
      throw this.createValidationError('Synthesis score is required');
    }

    const numericScore = Number(score);
    if (!ValidationService.isValidSynthesisScore(numericScore)) {
      throw this.createValidationError('Synthesis score must be between 0 and 100');
    }

    return ValidationService.sanitizeSynthesisScore(numericScore);
  }

  /**
   * Validate analysis context
   * @param context Analysis context to validate
   * @returns 'investment' | 'trading' Validated context
   * @throws DatabaseError if validation fails
   */
  static validateAnalysisContext(context: any): 'investment' | 'trading' {
    if (!context) {
      throw this.createValidationError('Analysis context is required');
    }

    if (!ValidationService.isValidAnalysisContext(context)) {
      throw this.createValidationError('Analysis context must be "investment" or "trading"');
    }

    return context;
  }

  /**
   * Validate trading timeframe
   * @param timeframe Trading timeframe to validate
   * @param required Whether timeframe is required
   * @returns string | null Validated timeframe
   * @throws DatabaseError if validation fails
   */
  static validateTradingTimeframe(timeframe: any, required: boolean = false): string | null {
    if (!timeframe) {
      if (required) {
        throw this.createValidationError('Trading timeframe is required');
      }
      return null;
    }

    if (typeof timeframe !== 'string') {
      throw this.createValidationError('Trading timeframe must be a string');
    }

    if (!ValidationService.isValidTradingTimeframe(timeframe)) {
      throw this.createValidationError('Invalid trading timeframe format');
    }

    return timeframe;
  }

  /**
   * Validate and sanitize text input
   * @param text Text to validate
   * @param options Validation options
   * @returns string Validated text
   * @throws DatabaseError if validation fails
   */
  static validateText(
    text: any,
    options: TextValidationOptions = {}
  ): string {
    const {
      required = false,
      minLength = 0,
      maxLength = 10000,
      allowEmpty = !required,
      sanitize = true,
    } = options;

    if (!text) {
      if (required) {
        throw this.createValidationError('Text input is required');
      }
      return allowEmpty ? '' : text;
    }

    if (typeof text !== 'string') {
      throw this.createValidationError('Text input must be a string');
    }

    let validatedText = sanitize ? this.sanitizeText(text) : text;

    if (validatedText.length < minLength) {
      throw this.createValidationError(`Text must be at least ${minLength} characters long`);
    }

    if (validatedText.length > maxLength) {
      throw this.createValidationError(`Text must be no more than ${maxLength} characters long`);
    }

    return validatedText;
  }

  /**
   * Validate JSON input
   * @param json JSON data to validate
   * @param schema Optional schema validation
   * @returns any Validated JSON
   * @throws DatabaseError if validation fails
   */
  static validateJSON(json: any, schema?: JSONSchema): any {
    if (json === null || json === undefined) {
      throw this.createValidationError('JSON input is required');
    }

    // If it's already an object, validate it
    if (typeof json === 'object') {
      return this.validateJSONObject(json, schema);
    }

    // If it's a string, try to parse it
    if (typeof json === 'string') {
      try {
        const parsed = JSON.parse(json);
        return this.validateJSONObject(parsed, schema);
      } catch (error) {
        throw this.createValidationError('Invalid JSON format');
      }
    }

    throw this.createValidationError('JSON input must be an object or valid JSON string');
  }

  /**
   * Validate array input
   * @param array Array to validate
   * @param options Validation options
   * @returns any[] Validated array
   * @throws DatabaseError if validation fails
   */
  static validateArray(
    array: any,
    options: ArrayValidationOptions = {}
  ): any[] {
    const {
      required = false,
      minLength = 0,
      maxLength = 1000,
      itemValidator,
    } = options;

    if (!array) {
      if (required) {
        throw this.createValidationError('Array input is required');
      }
      return [];
    }

    if (!Array.isArray(array)) {
      throw this.createValidationError('Input must be an array');
    }

    if (array.length < minLength) {
      throw this.createValidationError(`Array must have at least ${minLength} items`);
    }

    if (array.length > maxLength) {
      throw this.createValidationError(`Array must have no more than ${maxLength} items`);
    }

    // Validate each item if validator is provided
    if (itemValidator) {
      return array.map((item, index) => {
        try {
          return itemValidator(item);
        } catch (error) {
          throw this.createValidationError(
            `Invalid item at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      });
    }

    return array;
  }

  /**
   * Validate date input
   * @param date Date to validate
   * @param options Validation options
   * @returns string Validated ISO date string
   * @throws DatabaseError if validation fails
   */
  static validateDate(
    date: any,
    options: DateValidationOptions = {}
  ): string {
    const { required = false, minDate, maxDate } = options;

    if (!date) {
      if (required) {
        throw this.createValidationError('Date is required');
      }
      return new Date().toISOString();
    }

    let dateObj: Date;

    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (typeof date === 'number') {
      dateObj = new Date(date);
    } else {
      throw this.createValidationError('Date must be a Date object, string, or number');
    }

    if (isNaN(dateObj.getTime())) {
      throw this.createValidationError('Invalid date format');
    }

    if (minDate && dateObj < new Date(minDate)) {
      throw this.createValidationError(`Date must be after ${minDate}`);
    }

    if (maxDate && dateObj > new Date(maxDate)) {
      throw this.createValidationError(`Date must be before ${maxDate}`);
    }

    return dateObj.toISOString();
  }

  /**
   * Prevent SQL injection by validating query parameters
   * @param params Query parameters to validate
   * @returns Record<string, any> Validated parameters
   * @throws DatabaseError if validation fails
   */
  static validateQueryParams(params: Record<string, any>): Record<string, any> {
    const validated: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      // Validate parameter key
      if (!this.isValidParameterKey(key)) {
        throw this.createValidationError(`Invalid parameter key: ${key}`);
      }

      // Validate parameter value
      validated[key] = this.sanitizeParameterValue(value);
    }

    return validated;
  }

  /**
   * Sanitize text input to prevent XSS and injection attacks
   * @param text Text to sanitize
   * @returns string Sanitized text
   * @private
   */
  private static sanitizeText(text: string): string {
    return text
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/['"]/g, '') // Remove quotes that could break SQL
      .replace(/[;]/g, '') // Remove semicolons
      .replace(/--/g, '') // Remove SQL comment markers
      .replace(/\0/g, ''); // Remove null bytes
  }

  /**
   * Validate JSON object against schema
   * @param obj Object to validate
   * @param schema Optional schema
   * @returns any Validated object
   * @private
   */
  private static validateJSONObject(obj: any, schema?: JSONSchema): any {
    if (schema) {
      // Basic schema validation
      if (schema.required) {
        for (const field of schema.required) {
          if (!(field in obj)) {
            throw this.createValidationError(`Required field missing: ${field}`);
          }
        }
      }

      if (schema.properties) {
        for (const [key, value] of Object.entries(obj)) {
          if (!(key in schema.properties)) {
            throw this.createValidationError(`Unknown field: ${key}`);
          }
        }
      }
    }

    return obj;
  }

  /**
   * Check if parameter key is valid
   * @param key Parameter key to check
   * @returns boolean True if valid
   * @private
   */
  private static isValidParameterKey(key: string): boolean {
    // Allow only alphanumeric characters and underscores
    const validKeyRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    return validKeyRegex.test(key);
  }

  /**
   * Sanitize parameter value
   * @param value Parameter value to sanitize
   * @returns any Sanitized value
   * @private
   */
  private static sanitizeParameterValue(value: any): any {
    if (typeof value === 'string') {
      return this.sanitizeText(value);
    }

    if (typeof value === 'number' && !isNaN(value)) {
      return value;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (value === null || value === undefined) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map(item => this.sanitizeParameterValue(item));
    }

    if (typeof value === 'object') {
      const sanitized: Record<string, any> = {};
      for (const [key, val] of Object.entries(value)) {
        if (this.isValidParameterKey(key)) {
          sanitized[key] = this.sanitizeParameterValue(val);
        }
      }
      return sanitized;
    }

    throw this.createValidationError(`Invalid parameter value type: ${typeof value}`);
  }

  /**
   * Create validation error
   * @param message Error message
   * @returns DatabaseError Validation error
   * @private
   */
  private static createValidationError(message: string): DatabaseError {
    return {
      code: 'VALIDATION_ERROR',
      message: `Input validation failed: ${message}`,
      hint: 'Please check your input data and try again',
    };
  }
}

/**
 * Text validation options interface
 */
export interface TextValidationOptions {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  allowEmpty?: boolean;
  sanitize?: boolean;
}

/**
 * Array validation options interface
 */
export interface ArrayValidationOptions {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  itemValidator?: (item: any) => any;
}

/**
 * Date validation options interface
 */
export interface DateValidationOptions {
  required?: boolean;
  minDate?: string;
  maxDate?: string;
}

/**
 * JSON schema interface
 */
export interface JSONSchema {
  required?: string[];
  properties?: Record<string, any>;
}