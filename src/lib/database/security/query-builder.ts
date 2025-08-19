// Secure query builder with SQL injection prevention
// Provides parameterized queries and safe query construction

import { supabase } from '../../supabase';
import { InputValidator } from './input-validator';
import { DatabaseErrorHandler } from '../error-handler';
import { DatabaseError } from '../../../types/database';

/**
 * Secure query builder with SQL injection prevention
 * Provides parameterized queries and safe query construction
 */
export class SecureQueryBuilder {
  private tableName: string;
  private selectColumns: string[] = ['*'];
  private whereConditions: WhereCondition[] = [];
  private orderByClause: OrderByClause | null = null;
  private limitValue: number | null = null;
  private offsetValue: number | null = null;

  constructor(tableName: string) {
    this.tableName = this.validateTableName(tableName);
  }

  /**
   * Set columns to select
   * @param columns Columns to select
   * @returns SecureQueryBuilder
   */
  select(columns: string | string[]): SecureQueryBuilder {
    if (typeof columns === 'string') {
      this.selectColumns = columns === '*' ? ['*'] : [columns];
    } else {
      this.selectColumns = columns.map(col => this.validateColumnName(col));
    }
    return this;
  }

  /**
   * Add WHERE condition with parameterized values
   * @param column Column name
   * @param operator Comparison operator
   * @param value Value to compare
   * @returns SecureQueryBuilder
   */
  where(column: string, operator: ComparisonOperator, value: any): SecureQueryBuilder {
    this.whereConditions.push({
      column: this.validateColumnName(column),
      operator: this.validateOperator(operator),
      value: this.sanitizeValue(value),
    });
    return this;
  }

  /**
   * Add WHERE IN condition
   * @param column Column name
   * @param values Array of values
   * @returns SecureQueryBuilder
   */
  whereIn(column: string, values: any[]): SecureQueryBuilder {
    if (!Array.isArray(values) || values.length === 0) {
      throw this.createSecurityError('WHERE IN requires non-empty array');
    }

    this.whereConditions.push({
      column: this.validateColumnName(column),
      operator: 'in',
      value: values.map(v => this.sanitizeValue(v)),
    });
    return this;
  }

  /**
   * Add WHERE BETWEEN condition
   * @param column Column name
   * @param min Minimum value
   * @param max Maximum value
   * @returns SecureQueryBuilder
   */
  whereBetween(column: string, min: any, max: any): SecureQueryBuilder {
    this.whereConditions.push({
      column: this.validateColumnName(column),
      operator: 'gte',
      value: this.sanitizeValue(min),
    });
    this.whereConditions.push({
      column: this.validateColumnName(column),
      operator: 'lte',
      value: this.sanitizeValue(max),
    });
    return this;
  }

  /**
   * Add WHERE LIKE condition (safe pattern matching)
   * @param column Column name
   * @param pattern Search pattern
   * @returns SecureQueryBuilder
   */
  whereLike(column: string, pattern: string): SecureQueryBuilder {
    const sanitizedPattern = this.sanitizeLikePattern(pattern);
    this.whereConditions.push({
      column: this.validateColumnName(column),
      operator: 'ilike',
      value: sanitizedPattern,
    });
    return this;
  }

  /**
   * Add ORDER BY clause
   * @param column Column to order by
   * @param direction Sort direction
   * @returns SecureQueryBuilder
   */
  orderBy(column: string, direction: 'asc' | 'desc' = 'asc'): SecureQueryBuilder {
    this.orderByClause = {
      column: this.validateColumnName(column),
      direction: direction === 'desc' ? 'desc' : 'asc',
    };
    return this;
  }

  /**
   * Set LIMIT
   * @param limit Maximum number of rows
   * @returns SecureQueryBuilder
   */
  limit(limit: number): SecureQueryBuilder {
    if (!Number.isInteger(limit) || limit < 0) {
      throw this.createSecurityError('LIMIT must be a non-negative integer');
    }
    if (limit > 1000) {
      throw this.createSecurityError('LIMIT cannot exceed 1000 rows');
    }
    this.limitValue = limit;
    return this;
  }

  /**
   * Set OFFSET
   * @param offset Number of rows to skip
   * @returns SecureQueryBuilder
   */
  offset(offset: number): SecureQueryBuilder {
    if (!Number.isInteger(offset) || offset < 0) {
      throw this.createSecurityError('OFFSET must be a non-negative integer');
    }
    this.offsetValue = offset;
    return this;
  }

  /**
   * Execute SELECT query
   * @returns Promise<any[]> Query results
   */
  async execute(): Promise<any[]> {
    try {
      let query = supabase.from(this.tableName);

      // Apply SELECT
      if (this.selectColumns.length > 0 && this.selectColumns[0] !== '*') {
        query = query.select(this.selectColumns.join(', '));
      } else {
        query = query.select('*');
      }

      // Apply WHERE conditions
      for (const condition of this.whereConditions) {
        switch (condition.operator) {
          case 'eq':
            query = query.eq(condition.column, condition.value);
            break;
          case 'neq':
            query = query.neq(condition.column, condition.value);
            break;
          case 'gt':
            query = query.gt(condition.column, condition.value);
            break;
          case 'gte':
            query = query.gte(condition.column, condition.value);
            break;
          case 'lt':
            query = query.lt(condition.column, condition.value);
            break;
          case 'lte':
            query = query.lte(condition.column, condition.value);
            break;
          case 'like':
            query = query.like(condition.column, condition.value);
            break;
          case 'ilike':
            query = query.ilike(condition.column, condition.value);
            break;
          case 'in':
            query = query.in(condition.column, condition.value as any[]);
            break;
          case 'is':
            query = query.is(condition.column, condition.value);
            break;
          default:
            throw this.createSecurityError(`Unsupported operator: ${condition.operator}`);
        }
      }

      // Apply ORDER BY
      if (this.orderByClause) {
        query = query.order(this.orderByClause.column, {
          ascending: this.orderByClause.direction === 'asc',
        });
      }

      // Apply LIMIT and OFFSET
      if (this.limitValue !== null) {
        if (this.offsetValue !== null) {
          query = query.range(this.offsetValue, this.offsetValue + this.limitValue - 1);
        } else {
          query = query.limit(this.limitValue);
        }
      }

      const { data, error } = await query;

      if (error) {
        throw DatabaseErrorHandler.handleSupabaseError(error, 'Secure query execution');
      }

      return data || [];
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error; // Re-throw database errors
      }
      throw this.createSecurityError(`Query execution failed: ${error}`);
    }
  }

  /**
   * Execute COUNT query
   * @returns Promise<number> Row count
   */
  async count(): Promise<number> {
    try {
      let query = supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      // Apply WHERE conditions
      for (const condition of this.whereConditions) {
        switch (condition.operator) {
          case 'eq':
            query = query.eq(condition.column, condition.value);
            break;
          case 'neq':
            query = query.neq(condition.column, condition.value);
            break;
          case 'gt':
            query = query.gt(condition.column, condition.value);
            break;
          case 'gte':
            query = query.gte(condition.column, condition.value);
            break;
          case 'lt':
            query = query.lt(condition.column, condition.value);
            break;
          case 'lte':
            query = query.lte(condition.column, condition.value);
            break;
          case 'in':
            query = query.in(condition.column, condition.value as any[]);
            break;
          default:
            // Skip unsupported operators for count queries
            break;
        }
      }

      const { count, error } = await query;

      if (error) {
        throw DatabaseErrorHandler.handleSupabaseError(error, 'Secure count query');
      }

      return count || 0;
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw this.createSecurityError(`Count query failed: ${error}`);
    }
  }

  /**
   * Create secure INSERT query
   * @param data Data to insert
   * @returns Promise<any> Inserted record
   */
  async insert(data: Record<string, any>): Promise<any> {
    try {
      const sanitizedData = this.sanitizeInsertData(data);
      
      const { data: result, error } = await supabase
        .from(this.tableName)
        .insert(sanitizedData)
        .select()
        .single();

      if (error) {
        throw DatabaseErrorHandler.handleSupabaseError(error, 'Secure insert');
      }

      return result;
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw this.createSecurityError(`Insert failed: ${error}`);
    }
  }

  /**
   * Create secure UPDATE query
   * @param data Data to update
   * @returns Promise<any[]> Updated records
   */
  async update(data: Record<string, any>): Promise<any[]> {
    try {
      if (this.whereConditions.length === 0) {
        throw this.createSecurityError('UPDATE requires WHERE conditions');
      }

      const sanitizedData = this.sanitizeUpdateData(data);
      
      let query = supabase.from(this.tableName).update(sanitizedData);

      // Apply WHERE conditions
      for (const condition of this.whereConditions) {
        if (condition.operator === 'eq') {
          query = query.eq(condition.column, condition.value);
        }
      }

      const { data: result, error } = await query.select();

      if (error) {
        throw DatabaseErrorHandler.handleSupabaseError(error, 'Secure update');
      }

      return result || [];
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw this.createSecurityError(`Update failed: ${error}`);
    }
  }

  /**
   * Create secure DELETE query
   * @returns Promise<void>
   */
  async delete(): Promise<void> {
    try {
      if (this.whereConditions.length === 0) {
        throw this.createSecurityError('DELETE requires WHERE conditions');
      }

      let query = supabase.from(this.tableName).delete();

      // Apply WHERE conditions
      for (const condition of this.whereConditions) {
        if (condition.operator === 'eq') {
          query = query.eq(condition.column, condition.value);
        }
      }

      const { error } = await query;

      if (error) {
        throw DatabaseErrorHandler.handleSupabaseError(error, 'Secure delete');
      }
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw this.createSecurityError(`Delete failed: ${error}`);
    }
  }

  /**
   * Validate table name
   * @param tableName Table name to validate
   * @returns string Validated table name
   * @private
   */
  private validateTableName(tableName: string): string {
    if (!tableName || typeof tableName !== 'string') {
      throw this.createSecurityError('Table name is required');
    }

    // Allow only alphanumeric characters and underscores
    const validTableRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    if (!validTableRegex.test(tableName)) {
      throw this.createSecurityError('Invalid table name format');
    }

    return tableName;
  }

  /**
   * Validate column name
   * @param columnName Column name to validate
   * @returns string Validated column name
   * @private
   */
  private validateColumnName(columnName: string): string {
    if (!columnName || typeof columnName !== 'string') {
      throw this.createSecurityError('Column name is required');
    }

    // Allow only alphanumeric characters, underscores, and dots (for joins)
    const validColumnRegex = /^[a-zA-Z_][a-zA-Z0-9_.]*$/;
    if (!validColumnRegex.test(columnName)) {
      throw this.createSecurityError('Invalid column name format');
    }

    return columnName;
  }

  /**
   * Validate comparison operator
   * @param operator Operator to validate
   * @returns ComparisonOperator Validated operator
   * @private
   */
  private validateOperator(operator: string): ComparisonOperator {
    const validOperators: ComparisonOperator[] = [
      'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'in', 'is'
    ];

    if (!validOperators.includes(operator as ComparisonOperator)) {
      throw this.createSecurityError(`Invalid operator: ${operator}`);
    }

    return operator as ComparisonOperator;
  }

  /**
   * Sanitize value for query parameters
   * @param value Value to sanitize
   * @returns any Sanitized value
   * @private
   */
  private sanitizeValue(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      // Remove potential SQL injection patterns
      return value
        .replace(/[';]/g, '')
        .replace(/--/g, '')
        .replace(/\0/g, '')
        .trim();
    }

    if (typeof value === 'number' && !isNaN(value)) {
      return value;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    throw this.createSecurityError(`Unsupported value type: ${typeof value}`);
  }

  /**
   * Sanitize LIKE pattern
   * @param pattern Pattern to sanitize
   * @returns string Sanitized pattern
   * @private
   */
  private sanitizeLikePattern(pattern: string): string {
    if (typeof pattern !== 'string') {
      throw this.createSecurityError('LIKE pattern must be a string');
    }

    // Escape special characters and remove potential injection patterns
    return pattern
      .replace(/[';]/g, '')
      .replace(/--/g, '')
      .replace(/\0/g, '')
      .replace(/[\\]/g, '\\\\')
      .trim();
  }

  /**
   * Sanitize insert data
   * @param data Data to sanitize
   * @returns Record<string, any> Sanitized data
   * @private
   */
  private sanitizeInsertData(data: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      const validatedKey = this.validateColumnName(key);
      sanitized[validatedKey] = this.sanitizeValue(value);
    }

    return sanitized;
  }

  /**
   * Sanitize update data
   * @param data Data to sanitize
   * @returns Record<string, any> Sanitized data
   * @private
   */
  private sanitizeUpdateData(data: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      // Skip system columns that shouldn't be updated
      if (['id', 'created_at'].includes(key)) {
        continue;
      }

      const validatedKey = this.validateColumnName(key);
      sanitized[validatedKey] = this.sanitizeValue(value);
    }

    return sanitized;
  }

  /**
   * Create security error
   * @param message Error message
   * @returns DatabaseError Security error
   * @private
   */
  private createSecurityError(message: string): DatabaseError {
    return {
      code: 'SECURITY_VIOLATION',
      message: `Security violation: ${message}`,
      hint: 'Query contains potentially unsafe content',
    };
  }
}

/**
 * Comparison operators for WHERE clauses
 */
export type ComparisonOperator = 
  | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' 
  | 'like' | 'ilike' | 'in' | 'is';

/**
 * WHERE condition interface
 */
interface WhereCondition {
  column: string;
  operator: ComparisonOperator;
  value: any;
}

/**
 * ORDER BY clause interface
 */
interface OrderByClause {
  column: string;
  direction: 'asc' | 'desc';
}