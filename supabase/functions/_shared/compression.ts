// Response compression utilities for Edge Functions
// Provides gzip compression and payload optimization for better performance

import { Logger } from './logging.ts';
import { PerformanceMetrics } from './performance.ts';

/**
 * Compression configuration
 */
export interface CompressionConfig {
  enableGzip: boolean;
  minSizeBytes: number;
  compressionLevel: number;
  excludeContentTypes: string[];
  maxSizeBytes: number;
}

/**
 * Compression result interface
 */
export interface CompressionResult {
  compressed: Uint8Array | string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  method: 'gzip' | 'none';
}

/**
 * Response compression manager
 */
export class ResponseCompressor {
  private config: CompressionConfig;
  private logger: Logger;

  constructor(config: Partial<CompressionConfig> = {}) {
    this.config = {
      enableGzip: true,
      minSizeBytes: 1024, // 1KB minimum
      compressionLevel: 6, // Default compression level
      excludeContentTypes: [
        'image/',
        'video/',
        'audio/',
        'application/zip',
        'application/gzip',
        'application/octet-stream'
      ],
      maxSizeBytes: 10 * 1024 * 1024, // 10MB maximum
      ...config
    };
    this.logger = new Logger('ResponseCompressor');
  }

  /**
   * Compress response data if beneficial
   */
  async compressResponse(
    data: any,
    contentType: string = 'application/json'
  ): Promise<CompressionResult> {
    const startTime = performance.now();
    
    try {
      // Convert data to string if needed
      const stringData = typeof data === 'string' ? data : JSON.stringify(data);
      const originalSize = new TextEncoder().encode(stringData).length;
      
      // Check if compression should be applied
      if (!this.shouldCompress(stringData, contentType, originalSize)) {
        PerformanceMetrics.record('compression_skipped', performance.now() - startTime);
        return {
          compressed: stringData,
          originalSize,
          compressedSize: originalSize,
          compressionRatio: 1.0,
          method: 'none'
        };
      }

      // Apply gzip compression
      const compressed = await this.gzipCompress(stringData);
      const compressedSize = compressed.length;
      const compressionRatio = compressedSize / originalSize;
      
      // Only use compression if it provides significant benefit
      if (compressionRatio > 0.9) {
        PerformanceMetrics.record('compression_ineffective', performance.now() - startTime);
        return {
          compressed: stringData,
          originalSize,
          compressedSize: originalSize,
          compressionRatio: 1.0,
          method: 'none'
        };
      }

      PerformanceMetrics.record('compression_applied', performance.now() - startTime);
      this.logger.debug(`Compressed response: ${originalSize} -> ${compressedSize} bytes (${(compressionRatio * 100).toFixed(1)}%)`);
      
      return {
        compressed,
        originalSize,
        compressedSize,
        compressionRatio,
        method: 'gzip'
      };

    } catch (error) {
      PerformanceMetrics.record('compression_error', performance.now() - startTime);
      this.logger.error('Compression failed:', error);
      
      // Fallback to uncompressed
      const stringData = typeof data === 'string' ? data : JSON.stringify(data);
      const originalSize = new TextEncoder().encode(stringData).length;
      
      return {
        compressed: stringData,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1.0,
        method: 'none'
      };
    }
  }

  /**
   * Create compressed HTTP response
   */
  createCompressedResponse(
    data: any,
    status: number = 200,
    headers: Record<string, string> = {},
    contentType: string = 'application/json'
  ): Promise<Response> {
    return this.compressResponse(data, contentType).then(result => {
      const responseHeaders = new Headers({
        'Content-Type': contentType,
        ...headers
      });

      if (result.method === 'gzip') {
        responseHeaders.set('Content-Encoding', 'gzip');
        responseHeaders.set('Content-Length', result.compressedSize.toString());
        responseHeaders.set('X-Original-Size', result.originalSize.toString());
        responseHeaders.set('X-Compression-Ratio', result.compressionRatio.toFixed(3));
      }

      // Add performance headers
      responseHeaders.set('X-Compression-Method', result.method);
      responseHeaders.set('X-Response-Size', result.compressedSize.toString());

      return new Response(result.compressed, {
        status,
        headers: responseHeaders
      });
    });
  }

  /**
   * Check if content should be compressed
   */
  private shouldCompress(data: string, contentType: string, size: number): boolean {
    // Check if compression is enabled
    if (!this.config.enableGzip) {
      return false;
    }

    // Check size limits
    if (size < this.config.minSizeBytes || size > this.config.maxSizeBytes) {
      return false;
    }

    // Check excluded content types
    for (const excludedType of this.config.excludeContentTypes) {
      if (contentType.startsWith(excludedType)) {
        return false;
      }
    }

    // Check if content is already compressed or binary
    if (this.isAlreadyCompressed(data)) {
      return false;
    }

    return true;
  }

  /**
   * Check if content is already compressed
   */
  private isAlreadyCompressed(data: string): boolean {
    // Simple heuristic: if data has low entropy, it might already be compressed
    const uniqueChars = new Set(data).size;
    const entropy = uniqueChars / data.length;
    
    // If entropy is very high, data might already be compressed
    return entropy > 0.8;
  }

  /**
   * Gzip compression using Deno's built-in compression
   */
  private async gzipCompress(data: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const inputData = encoder.encode(data);
    
    // Use Deno's compression stream
    const compressionStream = new CompressionStream('gzip');
    const writer = compressionStream.writable.getWriter();
    const reader = compressionStream.readable.getReader();
    
    // Write data to compression stream
    await writer.write(inputData);
    await writer.close();
    
    // Read compressed data
    const chunks: Uint8Array[] = [];
    let done = false;
    
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        chunks.push(value);
      }
    }
    
    // Combine chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result;
  }

  /**
   * Get compression statistics
   */
  getStats(): {
    totalCompressions: number;
    totalSavings: number;
    averageRatio: number;
  } {
    // This would be implemented with actual metrics collection
    return {
      totalCompressions: 0,
      totalSavings: 0,
      averageRatio: 0
    };
  }
}

/**
 * Payload optimization utilities
 */
export class PayloadOptimizer {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('PayloadOptimizer');
  }

  /**
   * Optimize JSON payload by removing unnecessary data
   */
  optimizeJSONPayload(data: any, options: {
    removeNulls?: boolean;
    removeEmptyArrays?: boolean;
    removeEmptyObjects?: boolean;
    maxDepth?: number;
    maxArrayLength?: number;
  } = {}): any {
    const startTime = performance.now();
    
    const config = {
      removeNulls: true,
      removeEmptyArrays: true,
      removeEmptyObjects: true,
      maxDepth: 10,
      maxArrayLength: 1000,
      ...options
    };

    try {
      const optimized = this.optimizeObject(data, config, 0);
      PerformanceMetrics.record('payload_optimization', performance.now() - startTime);
      return optimized;
    } catch (error) {
      this.logger.error('Payload optimization failed:', error);
      return data;
    }
  }

  /**
   * Recursively optimize object
   */
  private optimizeObject(obj: any, config: any, depth: number): any {
    if (depth > config.maxDepth) {
      return obj;
    }

    if (obj === null || obj === undefined) {
      return config.removeNulls ? undefined : obj;
    }

    if (Array.isArray(obj)) {
      const optimizedArray = obj
        .slice(0, config.maxArrayLength)
        .map(item => this.optimizeObject(item, config, depth + 1))
        .filter(item => item !== undefined);
      
      return config.removeEmptyArrays && optimizedArray.length === 0 ? undefined : optimizedArray;
    }

    if (typeof obj === 'object') {
      const optimizedObj: any = {};
      let hasProperties = false;

      for (const [key, value] of Object.entries(obj)) {
        const optimizedValue = this.optimizeObject(value, config, depth + 1);
        
        if (optimizedValue !== undefined) {
          optimizedObj[key] = optimizedValue;
          hasProperties = true;
        }
      }

      return config.removeEmptyObjects && !hasProperties ? undefined : optimizedObj;
    }

    return obj;
  }

  /**
   * Truncate large text fields
   */
  truncateTextFields(data: any, maxLength: number = 1000): any {
    if (typeof data === 'string') {
      return data.length > maxLength ? data.substring(0, maxLength) + '...' : data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.truncateTextFields(item, maxLength));
    }

    if (typeof data === 'object' && data !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(data)) {
        result[key] = this.truncateTextFields(value, maxLength);
      }
      return result;
    }

    return data;
  }

  /**
   * Remove sensitive fields from payload
   */
  sanitizePayload(data: any, sensitiveFields: string[] = ['api_key', 'password', 'token', 'secret']): any {
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizePayload(item, sensitiveFields));
    }

    if (typeof data === 'object' && data !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
          result[key] = '[REDACTED]';
        } else {
          result[key] = this.sanitizePayload(value, sensitiveFields);
        }
      }
      return result;
    }

    return data;
  }
}

/**
 * Global compression and optimization instances
 */
export const globalResponseCompressor = new ResponseCompressor();
export const globalPayloadOptimizer = new PayloadOptimizer();

/**
 * Helper function to create optimized and compressed response
 */
export async function createOptimizedResponse(
  data: any,
  status: number = 200,
  headers: Record<string, string> = {},
  options: {
    compress?: boolean;
    optimize?: boolean;
    sanitize?: boolean;
  } = {}
): Promise<Response> {
  const config = {
    compress: true,
    optimize: true,
    sanitize: false,
    ...options
  };

  let processedData = data;

  // Optimize payload
  if (config.optimize) {
    processedData = globalPayloadOptimizer.optimizeJSONPayload(processedData);
  }

  // Sanitize sensitive data
  if (config.sanitize) {
    processedData = globalPayloadOptimizer.sanitizePayload(processedData);
  }

  // Compress response
  if (config.compress) {
    return globalResponseCompressor.createCompressedResponse(
      processedData,
      status,
      headers,
      'application/json'
    );
  }

  // Return uncompressed response
  return new Response(JSON.stringify(processedData), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
}