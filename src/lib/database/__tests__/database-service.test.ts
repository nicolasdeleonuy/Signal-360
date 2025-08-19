// Unit tests for DatabaseService
// Tests centralized database operations and error handling

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseService } from '../database-service';
import { ProfileService } from '../profile-service';
import { AnalysisService } from '../analysis-service';
import { ValidationService } from '../validation';
import { 
  Profile, 
  Analysis, 
  CreateAnalysisInput,
  AnalysisFilters 
} from '../../../types/database';

// Mock dependencies
vi.mock('../profile-service');
vi.mock('../analysis-service');
vi.mock('../validation');
vi.mock('../../supabase');

describe('DatabaseService', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockProfile: Profile = {
    id: mockUserId,
    encrypted_google_api_key: 'encrypted_key_123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockAnalysis: Analysis = {
    id: 1,
    user_id: mockUserId,
    created_at: '2024-01-01T00:00:00Z',
    ticker_symbol: 'AAPL',
    analysis_context: 'investment',
    trading_timeframe: null,
    synthesis_score: 75,
    convergence_factors: [],
    divergence_factors: [],
    full_report: { summary: 'Test analysis' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initializeUser', () => {
    it('should create new user profile', async () => {
      (ProfileService.getProfile as any).mockResolvedValue(null);
      (ProfileService.createProfile as any).mockResolvedValue(mockProfile);

      const result = await DatabaseService.initializeUser(mockUserId);

      expect(ProfileService.getProfile).toHaveBeenCalledWith(mockUserId);
      expect(ProfileService.createProfile).toHaveBeenCalledWith({ id: mockUserId });
      expect(result).toEqual(mockProfile);
    });

    it('should return existing profile if already exists', async () => {
      (ProfileService.getProfile as any).mockResolvedValue(mockProfile);

      const result = await DatabaseService.initializeUser(mockUserId);

      expect(ProfileService.getProfile).toHaveBeenCalledWith(mockUserId);
      expect(ProfileService.createProfile).not.toHaveBeenCalled();
      expect(result).toEqual(mockProfile);
    });

    it('should throw error if user ID is missing', async () => {
      await expect(DatabaseService.initializeUser('')).rejects.toThrow(
        'Failed to initialize user: User ID is required'
      );
    });
  });

  describe('getUserData', () => {
    it('should get complete user data with analyses', async () => {
      const mockStats = {
        total_analyses: 5,
        investment_analyses: 3,
        trading_analyses: 2,
        unique_tickers: 3,
        avg_synthesis_score: 75,
      };

      (ProfileService.getProfile as any).mockResolvedValue(mockProfile);
      (AnalysisService.getRecentAnalyses as any).mockResolvedValue([mockAnalysis]);
      (AnalysisService.getAnalysisStats as any).mockResolvedValue(mockStats);

      const result = await DatabaseService.getUserData(mockUserId, true);

      expect(result.profile).toEqual(mockProfile);
      expect(result.recentAnalyses).toEqual([mockAnalysis]);
      expect(result.analysisStats).toEqual(mockStats);
    });

    it('should get user data without analyses', async () => {
      (ProfileService.getProfile as any).mockResolvedValue(mockProfile);

      const result = await DatabaseService.getUserData(mockUserId, false);

      expect(result.profile).toEqual(mockProfile);
      expect(result.recentAnalyses).toEqual([]);
      expect(result.analysisStats).toBeNull();
      expect(AnalysisService.getRecentAnalyses).not.toHaveBeenCalled();
    });

    it('should throw error if profile not found', async () => {
      (ProfileService.getProfile as any).mockResolvedValue(null);

      await expect(DatabaseService.getUserData(mockUserId)).rejects.toThrow(
        'Failed to get user data: User profile not found'
      );
    });
  });

  describe('createAnalysisWithValidation', () => {
    const validInput: CreateAnalysisInput = {
      ticker_symbol: 'AAPL',
      analysis_context: 'investment',
      synthesis_score: 75,
      convergence_factors: [],
      divergence_factors: [],
      full_report: { summary: 'Test analysis summary with sufficient detail' },
    };

    it('should create analysis with validation', async () => {
      (ValidationService.validateAnalysisInput as any).mockReturnValue({ isValid: true });
      (ProfileService.getProfile as any).mockResolvedValue(mockProfile);
      (AnalysisService.createAnalysis as any).mockResolvedValue(mockAnalysis);

      const result = await DatabaseService.createAnalysisWithValidation(mockUserId, validInput);

      expect(ValidationService.validateAnalysisInput).toHaveBeenCalledWith(validInput);
      expect(ProfileService.getProfile).toHaveBeenCalledWith(mockUserId);
      expect(AnalysisService.createAnalysis).toHaveBeenCalledWith(mockUserId, validInput);
      expect(result).toEqual(mockAnalysis);
    });

    it('should throw error for invalid input', async () => {
      (ValidationService.validateAnalysisInput as any).mockReturnValue({
        isValid: false,
        error: 'Invalid ticker symbol',
      });

      await expect(
        DatabaseService.createAnalysisWithValidation(mockUserId, validInput)
      ).rejects.toThrow('Failed to create analysis: Validation failed: Invalid ticker symbol');
    });

    it('should throw error if profile not found', async () => {
      (ValidationService.validateAnalysisInput as any).mockReturnValue({ isValid: true });
      (ProfileService.getProfile as any).mockResolvedValue(null);

      await expect(
        DatabaseService.createAnalysisWithValidation(mockUserId, validInput)
      ).rejects.toThrow('Failed to create analysis: User profile not found');
    });
  });

  describe('getAnalysisSecure', () => {
    it('should get analysis with ownership verification', async () => {
      (AnalysisService.getAnalysis as any).mockResolvedValue(mockAnalysis);

      const result = await DatabaseService.getAnalysisSecure(1, mockUserId);

      expect(AnalysisService.getAnalysis).toHaveBeenCalledWith(1, mockUserId);
      expect(result).toEqual(mockAnalysis);
    });

    it('should return null if analysis not found', async () => {
      (AnalysisService.getAnalysis as any).mockResolvedValue(null);

      const result = await DatabaseService.getAnalysisSecure(1, mockUserId);

      expect(result).toBeNull();
    });

    it('should throw error for missing parameters', async () => {
      await expect(DatabaseService.getAnalysisSecure(0, mockUserId)).rejects.toThrow(
        'Failed to get analysis: Analysis ID and User ID are required'
      );
    });
  });

  describe('getAnalysisDashboard', () => {
    it('should get complete dashboard data', async () => {
      const mockAnalyses = [mockAnalysis];
      const mockStats = {
        total_analyses: 1,
        investment_analyses: 1,
        trading_analyses: 0,
        unique_tickers: 1,
        avg_synthesis_score: 75,
      };

      (AnalysisService.getAnalyses as any).mockResolvedValue(mockAnalyses);
      (AnalysisService.getAnalysisStats as any).mockResolvedValue(mockStats);
      (AnalysisService.getRecentAnalyses as any).mockResolvedValue([mockAnalysis]);

      const result = await DatabaseService.getAnalysisDashboard(mockUserId);

      expect(result.analyses).toEqual(mockAnalyses);
      expect(result.stats).toEqual(mockStats);
      expect(result.recentAnalyses).toEqual([mockAnalysis]);
      expect(result.uniqueTickers).toEqual(['AAPL']);
      expect(result.averageScore).toBe(75);
      expect(result.totalAnalyses).toBe(1);
    });

    it('should apply filters to dashboard data', async () => {
      const filters: AnalysisFilters = {
        ticker_symbol: 'AAPL',
        analysis_context: 'investment',
      };

      (AnalysisService.getAnalyses as any).mockResolvedValue([mockAnalysis]);
      (AnalysisService.getAnalysisStats as any).mockResolvedValue({});
      (AnalysisService.getRecentAnalyses as any).mockResolvedValue([]);

      await DatabaseService.getAnalysisDashboard(mockUserId, filters);

      expect(AnalysisService.getAnalyses).toHaveBeenCalledWith(mockUserId, filters);
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile', async () => {
      const updateData = { google_api_key: 'new_api_key' };
      const updatedProfile = { ...mockProfile, updated_at: '2024-01-02T00:00:00Z' };

      (ProfileService.updateProfile as any).mockResolvedValue(updatedProfile);

      const result = await DatabaseService.updateUserProfile(mockUserId, updateData);

      expect(ProfileService.updateProfile).toHaveBeenCalledWith(mockUserId, updateData);
      expect(result).toEqual(updatedProfile);
    });

    it('should throw error for missing user ID', async () => {
      await expect(DatabaseService.updateUserProfile('', {})).rejects.toThrow(
        'Failed to update profile: User ID is required'
      );
    });
  });

  describe('deleteAnalysisSecure', () => {
    it('should delete analysis with verification', async () => {
      (AnalysisService.getAnalysis as any).mockResolvedValue(mockAnalysis);
      (AnalysisService.deleteAnalysis as any).mockResolvedValue(undefined);

      await DatabaseService.deleteAnalysisSecure(1, mockUserId);

      expect(AnalysisService.getAnalysis).toHaveBeenCalledWith(1, mockUserId);
      expect(AnalysisService.deleteAnalysis).toHaveBeenCalledWith(1, mockUserId);
    });

    it('should throw error if analysis not found', async () => {
      (AnalysisService.getAnalysis as any).mockResolvedValue(null);

      await expect(DatabaseService.deleteAnalysisSecure(1, mockUserId)).rejects.toThrow(
        'Failed to delete analysis: Analysis not found or access denied'
      );
    });
  });

  describe('getApiKeyStatus', () => {
    it('should return API key status', async () => {
      (ProfileService.getProfile as any).mockResolvedValue(mockProfile);

      const result = await DatabaseService.getApiKeyStatus(mockUserId);

      expect(result.hasApiKey).toBe(true);
      expect(result.isConfigured).toBe(true);
      expect(result.lastUpdated).toBe(mockProfile.updated_at);
    });

    it('should return false for missing API key', async () => {
      const profileWithoutKey = { ...mockProfile, encrypted_google_api_key: null };
      (ProfileService.getProfile as any).mockResolvedValue(profileWithoutKey);

      const result = await DatabaseService.getApiKeyStatus(mockUserId);

      expect(result.hasApiKey).toBe(false);
      expect(result.isConfigured).toBe(false);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      // Mock successful Supabase query
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      };

      // We need to mock the supabase import
      vi.doMock('../../supabase', () => ({
        supabase: mockSupabase,
      }));

      const result = await DatabaseService.healthCheck();

      expect(result.status).toBe('healthy');
      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.services.database).toBe('healthy');
    });
  });

  describe('validateConnection', () => {
    it('should validate connection successfully', async () => {
      // Mock successful connection
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      };

      vi.doMock('../../supabase', () => ({
        supabase: mockSupabase,
      }));

      const result = await DatabaseService.validateConnection();

      expect(result).toBe(true);
    });

    it('should return false for connection failure', async () => {
      // Mock failed connection
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ error: { message: 'Connection failed' } }),
          }),
        }),
      };

      vi.doMock('../../supabase', () => ({
        supabase: mockSupabase,
      }));

      const result = await DatabaseService.validateConnection();

      expect(result).toBe(false);
    });
  });
});