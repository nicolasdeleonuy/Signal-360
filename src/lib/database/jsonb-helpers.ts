// JSONB helper utilities for analysis data
// Provides functions for working with JSONB columns in PostgreSQL

import {
  ConvergenceFactor,
  DivergenceFactor,
  AnalysisReport,
  Analysis,
} from '../../types/database';

/**
 * JSONB helper service for analysis data
 * Provides utilities for querying and manipulating JSONB data
 */
export class JsonbHelpers {
  /**
   * Extract factors by category from convergence factors
   * @param factors Array of convergence factors
   * @param category Category to filter by
   * @returns ConvergenceFactor[] Filtered factors
   */
  static getConvergenceFactorsByCategory(
    factors: ConvergenceFactor[],
    category: string
  ): ConvergenceFactor[] {
    if (!Array.isArray(factors)) {
      return [];
    }

    return factors.filter(factor => 
      factor.category && factor.category.toLowerCase() === category.toLowerCase()
    );
  }

  /**
   * Extract factors by category from divergence factors
   * @param factors Array of divergence factors
   * @param category Category to filter by
   * @returns DivergenceFactor[] Filtered factors
   */
  static getDivergenceFactorsByCategory(
    factors: DivergenceFactor[],
    category: string
  ): DivergenceFactor[] {
    if (!Array.isArray(factors)) {
      return [];
    }

    return factors.filter(factor => 
      factor.category && factor.category.toLowerCase() === category.toLowerCase()
    );
  }

  /**
   * Calculate total weight for factors by category
   * @param factors Array of factors
   * @param category Category to calculate weight for
   * @returns number Total weight
   */
  static getTotalWeightByCategory(
    factors: (ConvergenceFactor | DivergenceFactor)[],
    category: string
  ): number {
    if (!Array.isArray(factors)) {
      return 0;
    }

    return factors
      .filter(factor => factor.category && factor.category.toLowerCase() === category.toLowerCase())
      .reduce((total, factor) => total + (factor.weight || 0), 0);
  }

  /**
   * Get all unique categories from factors
   * @param convergenceFactors Convergence factors
   * @param divergenceFactors Divergence factors
   * @returns string[] Array of unique categories
   */
  static getUniqueCategories(
    convergenceFactors: ConvergenceFactor[],
    divergenceFactors: DivergenceFactor[]
  ): string[] {
    const allFactors = [
      ...(Array.isArray(convergenceFactors) ? convergenceFactors : []),
      ...(Array.isArray(divergenceFactors) ? divergenceFactors : []),
    ];

    const categories = allFactors
      .map(factor => factor.category)
      .filter(category => category && typeof category === 'string')
      .map(category => category.toLowerCase());

    return [...new Set(categories)];
  }

  /**
   * Calculate factor distribution by category
   * @param convergenceFactors Convergence factors
   * @param divergenceFactors Divergence factors
   * @returns object Distribution of factors by category
   */
  static getFactorDistribution(
    convergenceFactors: ConvergenceFactor[],
    divergenceFactors: DivergenceFactor[]
  ): Record<string, { convergence: number; divergence: number; total: number }> {
    const categories = this.getUniqueCategories(convergenceFactors, divergenceFactors);
    const distribution: Record<string, { convergence: number; divergence: number; total: number }> = {};

    categories.forEach(category => {
      const convergenceWeight = this.getTotalWeightByCategory(convergenceFactors, category);
      const divergenceWeight = this.getTotalWeightByCategory(divergenceFactors, category);

      distribution[category] = {
        convergence: convergenceWeight,
        divergence: divergenceWeight,
        total: convergenceWeight + divergenceWeight,
      };
    });

    return distribution;
  }

  /**
   * Extract report section by type
   * @param report Analysis report
   * @param sectionType Section type to extract
   * @returns object | null Report section or null if not found
   */
  static getReportSection(
    report: AnalysisReport,
    sectionType: 'fundamental' | 'technical' | 'esg'
  ): { score: number; factors: string[]; details: Record<string, any> } | null {
    if (!report || typeof report !== 'object') {
      return null;
    }

    const section = report[sectionType];
    if (!section || typeof section !== 'object') {
      return null;
    }

    return {
      score: section.score || 0,
      factors: Array.isArray(section.factors) ? section.factors : [],
      details: section.details || {},
    };
  }

  /**
   * Calculate weighted average score from report sections
   * @param report Analysis report
   * @param weights Optional weights for each section
   * @returns number Weighted average score
   */
  static calculateWeightedScore(
    report: AnalysisReport,
    weights: { fundamental?: number; technical?: number; esg?: number } = {}
  ): number {
    const defaultWeights = { fundamental: 0.4, technical: 0.4, esg: 0.2 };
    const finalWeights = { ...defaultWeights, ...weights };

    let totalScore = 0;
    let totalWeight = 0;

    ['fundamental', 'technical', 'esg'].forEach(sectionType => {
      const section = this.getReportSection(report, sectionType as any);
      if (section && typeof section.score === 'number') {
        const weight = finalWeights[sectionType as keyof typeof finalWeights] || 0;
        totalScore += section.score * weight;
        totalWeight += weight;
      }
    });

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  /**
   * Search factors by description text
   * @param factors Array of factors to search
   * @param searchText Text to search for
   * @returns Array of matching factors
   */
  static searchFactorsByDescription(
    factors: (ConvergenceFactor | DivergenceFactor)[],
    searchText: string
  ): (ConvergenceFactor | DivergenceFactor)[] {
    if (!Array.isArray(factors) || !searchText || typeof searchText !== 'string') {
      return [];
    }

    const searchLower = searchText.toLowerCase();
    return factors.filter(factor => 
      factor.description && 
      factor.description.toLowerCase().includes(searchLower)
    );
  }

  /**
   * Get top factors by weight
   * @param factors Array of factors
   * @param limit Number of top factors to return
   * @returns Array of top factors sorted by weight
   */
  static getTopFactorsByWeight(
    factors: (ConvergenceFactor | DivergenceFactor)[],
    limit: number = 5
  ): (ConvergenceFactor | DivergenceFactor)[] {
    if (!Array.isArray(factors)) {
      return [];
    }

    return factors
      .filter(factor => typeof factor.weight === 'number')
      .sort((a, b) => (b.weight || 0) - (a.weight || 0))
      .slice(0, limit);
  }

  /**
   * Merge analysis reports (useful for combining multiple analyses)
   * @param reports Array of analysis reports to merge
   * @returns AnalysisReport Merged report
   */
  static mergeAnalysisReports(reports: AnalysisReport[]): AnalysisReport {
    if (!Array.isArray(reports) || reports.length === 0) {
      return {
        summary: 'No reports to merge',
        metadata: {},
      };
    }

    if (reports.length === 1) {
      return reports[0];
    }

    const merged: AnalysisReport = {
      summary: reports.map(r => r.summary).join(' | '),
      metadata: {},
    };

    // Merge sections by averaging scores and combining factors
    ['fundamental', 'technical', 'esg'].forEach(sectionType => {
      const sections = reports
        .map(r => this.getReportSection(r, sectionType as any))
        .filter(s => s !== null);

      if (sections.length > 0) {
        const avgScore = Math.round(
          sections.reduce((sum, s) => sum + (s?.score || 0), 0) / sections.length
        );

        const allFactors = sections.flatMap(s => s?.factors || []);
        const uniqueFactors = [...new Set(allFactors)];

        const mergedDetails = sections.reduce((acc, s) => ({ ...acc, ...s?.details }), {});

        merged[sectionType as keyof AnalysisReport] = {
          score: avgScore,
          factors: uniqueFactors,
          details: mergedDetails,
        } as any;
      }
    });

    return merged;
  }

  /**
   * Create analysis summary from factors and report
   * @param analysis Complete analysis object
   * @returns object Analysis summary with key metrics
   */
  static createAnalysisSummary(analysis: Analysis): {
    ticker: string;
    context: string;
    score: number;
    topConvergenceFactors: ConvergenceFactor[];
    topDivergenceFactors: DivergenceFactor[];
    categoryDistribution: Record<string, { convergence: number; divergence: number; total: number }>;
    reportSummary: string;
  } {
    return {
      ticker: analysis.ticker_symbol,
      context: analysis.analysis_context,
      score: analysis.synthesis_score,
      topConvergenceFactors: this.getTopFactorsByWeight(analysis.convergence_factors, 3),
      topDivergenceFactors: this.getTopFactorsByWeight(analysis.divergence_factors, 3),
      categoryDistribution: this.getFactorDistribution(
        analysis.convergence_factors,
        analysis.divergence_factors
      ),
      reportSummary: analysis.full_report?.summary || 'No summary available',
    };
  }

  /**
   * Validate JSONB data structure
   * @param data JSONB data to validate
   * @param expectedStructure Expected structure description
   * @returns boolean True if structure is valid
   */
  static validateJsonbStructure(data: any, expectedStructure: 'factors' | 'report'): boolean {
    if (expectedStructure === 'factors') {
      return Array.isArray(data) && data.every(factor => 
        factor &&
        typeof factor === 'object' &&
        typeof factor.category === 'string' &&
        typeof factor.description === 'string' &&
        typeof factor.weight === 'number'
      );
    }

    if (expectedStructure === 'report') {
      return data &&
        typeof data === 'object' &&
        typeof data.summary === 'string';
    }

    return false;
  }
}