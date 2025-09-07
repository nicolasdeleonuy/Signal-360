// Base repository pattern implementation
// Provides common database operations and query optimization

import { supabase } from '../../supabaseClient';
import { DatabaseErrorHandler, DatabaseOperation } from '../error-handler';
import { QueryOptions } from '../../../types/database';

/**
 * Base repository class providing common database operations
 * Implements repository pattern with query optimization and error handling
 */
export abstract class BaseRepository<T, CreateInput, UpdateInput> {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  /**
   * Create a new record
   * @param data Record creation data
   * @returns Promise<T> Created record
   */
  async create(data: CreateInput): Promise<T> {
    return DatabaseOperation.execute(
      async () => {
        const { data: result, error } = await supabase
          .from(this.tableName)
          .insert(data as any)
          .select()
          .single();

        if (error) {
          throw DatabaseErrorHandler.handleSupabaseError(error, `Create ${this.tableName}`);
        }

        return result as T;
      },
      `Create ${this.tableName}`,
      { enableRetry: false } // Don't retry creates to avoid duplicates
    );
  }

  /**
   * Find record by ID
   * @param id Record ID
   * @returns Promise<T | null> Found record or null
   */
  async findById(id: string | number): Promise<T | null> {
    return DatabaseOperation.execute(
      async () => {
        const { data, error } = await supabase
          .from(this.tableName)
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            return null; // Record not found
          }
          throw DatabaseErrorHandler.handleSupabaseError(error, `Find ${this.tableName} by ID`);
        }

        return data as T;
      },
      `Find ${this.tableName} by ID`
    );
  }

  /**
   * Find records with filters and options
   * @param filters Filter conditions
   * @param options Query options
   * @returns Promise<T[]> Array of matching records
   */
  async find(filters: Record<string, any> = {}, options: QueryOptions = {}): Promise<T[]> {
    return DatabaseOperation.execute(
      async () => {
        let query = supabase.from(this.tableName).select('*');

        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });

        // Apply ordering
        if (options.order_by) {
          query = query.order(options.order_by, { 
            ascending: options.ascending ?? true 
          });
        }

        // Apply pagination - use range if offset is provided, otherwise use limit
        if (options.offset !== undefined) {
          const limit = options.limit || 50;
          query = query.range(options.offset, options.offset + limit - 1);
        } else if (options.limit) {
          query = query.limit(options.limit);
        }

        const { data, error } = await query;

        if (error) {
          throw DatabaseErrorHandler.handleSupabaseError(error, `Find ${this.tableName}`);
        }

        return data as T[];
      },
      `Find ${this.tableName}`
    );
  }

  /**
   * Update record by ID
   * @param id Record ID
   * @param data Update data
   * @returns Promise<T> Updated record
   */
  async update(id: string | number, data: Partial<UpdateInput>): Promise<T> {
    return DatabaseOperation.execute(
      async () => {
        const { data: result, error } = await supabase
          .from(this.tableName)
          .update(data as any)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          throw DatabaseErrorHandler.handleSupabaseError(error, `Update ${this.tableName}`);
        }

        return result as T;
      },
      `Update ${this.tableName}`,
      { enableRetry: false } // Don't retry updates to avoid race conditions
    );
  }

  /**
   * Delete record by ID
   * @param id Record ID
   * @returns Promise<void>
   */
  async delete(id: string | number): Promise<void> {
    return DatabaseOperation.execute(
      async () => {
        const { error } = await supabase
          .from(this.tableName)
          .delete()
          .eq('id', id);

        if (error) {
          throw DatabaseErrorHandler.handleSupabaseError(error, `Delete ${this.tableName}`);
        }
      },
      `Delete ${this.tableName}`,
      { enableRetry: false } // Don't retry deletes
    );
  }

  /**
   * Count records with filters
   * @param filters Filter conditions
   * @returns Promise<number> Record count
   */
  async count(filters: Record<string, any> = {}): Promise<number> {
    return DatabaseOperation.execute(
      async () => {
        let query = supabase
          .from(this.tableName)
          .select('*', { count: 'exact', head: true });

        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });

        const { count, error } = await query;

        if (error) {
          throw DatabaseErrorHandler.handleSupabaseError(error, `Count ${this.tableName}`);
        }

        return count || 0;
      },
      `Count ${this.tableName}`
    );
  }

  /**
   * Check if record exists
   * @param id Record ID
   * @returns Promise<boolean> True if record exists
   */
  async exists(id: string | number): Promise<boolean> {
    return DatabaseOperation.execute(
      async () => {
        const { data, error } = await supabase
          .from(this.tableName)
          .select('id')
          .eq('id', id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            return false; // Record not found
          }
          throw DatabaseErrorHandler.handleSupabaseError(error, `Check ${this.tableName} exists`);
        }

        return !!data;
      },
      `Check ${this.tableName} exists`
    );
  }

  /**
   * Find records with complex filters
   * @param filterBuilder Function to build complex filters
   * @param options Query options
   * @returns Promise<T[]> Array of matching records
   */
  async findWithComplexFilters(
    filterBuilder: (query: any) => any,
    options: QueryOptions = {}
  ): Promise<T[]> {
    return DatabaseOperation.execute(
      async () => {
        let query = supabase.from(this.tableName).select('*');

        // Apply complex filters
        query = filterBuilder(query);

        // Apply ordering
        if (options.order_by) {
          query = query.order(options.order_by, { 
            ascending: options.ascending ?? true 
          });
        }

        // Apply pagination - use range if offset is provided, otherwise use limit
        if (options.offset !== undefined) {
          const limit = options.limit || 50;
          query = query.range(options.offset, options.offset + limit - 1);
        } else if (options.limit) {
          query = query.limit(options.limit);
        }

        const { data, error } = await query;

        if (error) {
          throw DatabaseErrorHandler.handleSupabaseError(error, `Find ${this.tableName} with filters`);
        }

        return data as T[];
      },
      `Find ${this.tableName} with complex filters`
    );
  }

  /**
   * Batch create records
   * @param records Array of records to create
   * @returns Promise<T[]> Created records
   */
  async batchCreate(records: CreateInput[]): Promise<T[]> {
    return DatabaseOperation.execute(
      async () => {
        const { data, error } = await supabase
          .from(this.tableName)
          .insert(records as any[])
          .select();

        if (error) {
          throw DatabaseErrorHandler.handleSupabaseError(error, `Batch create ${this.tableName}`);
        }

        return data as T[];
      },
      `Batch create ${this.tableName}`,
      { enableRetry: false }
    );
  }

  /**
   * Batch update records
   * @param updates Array of update operations
   * @returns Promise<T[]> Updated records
   */
  async batchUpdate(updates: Array<{ id: string | number; data: Partial<UpdateInput> }>): Promise<T[]> {
    return DatabaseOperation.execute(
      async () => {
        // Note: Supabase doesn't support batch updates directly
        // This implementation updates records sequentially
        const results: T[] = [];

        for (const update of updates) {
          const result = await this.update(update.id, update.data);
          results.push(result);
        }

        return results;
      },
      `Batch update ${this.tableName}`,
      { enableRetry: false }
    );
  }

  /**
   * Get paginated results with metadata
   * @param filters Filter conditions
   * @param options Query options
   * @returns Promise<PaginatedResult<T>> Paginated results with metadata
   */
  async paginate(
    filters: Record<string, any> = {},
    options: QueryOptions = {}
  ): Promise<PaginatedResult<T>> {
    return DatabaseOperation.execute(
      async () => {
        const { limit = 20, offset = 0 } = options;

        // Get total count and data in parallel
        const [data, totalCount] = await Promise.all([
          this.find(filters, options),
          this.count(filters),
        ]);

        const totalPages = Math.ceil(totalCount / limit);
        const currentPage = Math.floor(offset / limit) + 1;
        const hasNextPage = currentPage < totalPages;
        const hasPreviousPage = currentPage > 1;

        return {
          data,
          pagination: {
            totalCount,
            totalPages,
            currentPage,
            limit,
            offset,
            hasNextPage,
            hasPreviousPage,
          },
        };
      },
      `Paginate ${this.tableName}`
    );
  }

  /**
   * Execute raw SQL query (use with caution)
   * @param query SQL query
   * @param params Query parameters
   * @returns Promise<any[]> Query results
   */
  protected async executeRawQuery(query: string, params: any[] = []): Promise<any[]> {
    return DatabaseOperation.execute(
      async () => {
        const { data, error } = await supabase.rpc('execute_sql', {
          query,
          params,
        });

        if (error) {
          throw DatabaseErrorHandler.handleSupabaseError(error, 'Execute raw query');
        }

        return data;
      },
      'Execute raw query'
    );
  }
}

/**
 * Paginated result interface
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    limit: number;
    offset: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}