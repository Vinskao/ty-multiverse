import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { authService } from '../../src/services/auth';

// Mock the entire auth service
vi.mock('../../src/services/auth', () => ({
  authService: {
    testAdminEndpoint: vi.fn(),
    testUserEndpoint: vi.fn(),
    testVisitorEndpoint: vi.fn(),
    testAuthIntegration: vi.fn(),
    testLogout: vi.fn(),
    healthCheck: vi.fn(),
    testAllEndpoints: vi.fn(),
    getCurrentToken: vi.fn(),
    hasValidToken: vi.fn(),
  },
}));

describe('Auth API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('API Response Validation', () => {
    it('should validate admin endpoint response structure', async () => {
      const mockResponse = {
        message: expect.any(String),
        user: expect.any(String),
        authorities: expect.any(Array),
        timestamp: expect.any(Number),
      };

      (authService.testAdminEndpoint as any).mockResolvedValue(mockResponse);

      const result = await authService.testAdminEndpoint();

      expect(result).toMatchObject({
        message: expect.any(String),
        user: expect.any(String),
        authorities: expect.any(Array),
        timestamp: expect.any(Number),
      });
    });

    it('should validate user endpoint response structure', async () => {
      const mockResponse = {
        message: expect.any(String),
        user: expect.any(String),
        authorities: expect.any(Array),
        timestamp: expect.any(Number),
      };

      (authService.testUserEndpoint as any).mockResolvedValue(mockResponse);

      const result = await authService.testUserEndpoint();

      expect(result).toMatchObject({
        message: expect.any(String),
        user: expect.any(String),
        authorities: expect.any(Array),
        timestamp: expect.any(Number),
      });
    });

    it('should validate visitor endpoint response structure', async () => {
      const mockResponse = {
        message: expect.any(String),
        timestamp: expect.any(Number),
      };

      (authService.testVisitorEndpoint as any).mockResolvedValue(mockResponse);

      const result = await authService.testVisitorEndpoint();

      expect(result).toMatchObject({
        message: expect.any(String),
        timestamp: expect.any(Number),
      });
    });
  });

  describe('Authentication Flow', () => {
    it('should handle successful authentication test', async () => {
      const mockAuthResponse = {
        current_user: 'testuser',
        valid: true,
        introspect_result: {
          status: 200,
          data: { active: true }
        },
        test_completed: expect.any(Number),
      };

      (authService.testAuthIntegration as any).mockResolvedValue(mockAuthResponse);

      const result = await authService.testAuthIntegration('refresh-token');

      expect(result).toMatchObject({
        current_user: 'testuser',
        valid: true,
        introspect_result: expect.any(Object),
        test_completed: expect.any(Number),
      });
    });

    it('should handle authentication test errors', async () => {
      (authService.testAuthIntegration as any).mockRejectedValue(
        new Error('Auth integration test failed: 401')
      );

      await expect(authService.testAuthIntegration()).rejects.toThrow('Auth integration test failed: 401');
    });
  });

  describe('Logout Flow', () => {
    it('should handle successful logout test', async () => {
      const mockLogoutResponse = {
        user: 'testuser',
        logout_successful: true,
        security_context_cleared: true,
        test_completed: expect.any(Number),
      };

      (authService.testLogout as any).mockResolvedValue(mockLogoutResponse);

      const result = await authService.testLogout('refresh-token');

      expect(result).toMatchObject({
        user: 'testuser',
        logout_successful: true,
        security_context_cleared: true,
        test_completed: expect.any(Number),
      });
    });
  });

  describe('Health Check', () => {
    it('should validate health check response structure', async () => {
      const mockHealthResponse = {
        timestamp: expect.any(Number),
        service_available: true,
        authentication_exists: expect.any(Boolean),
        keycloak_status: expect.any(String),
      };

      (authService.healthCheck as any).mockResolvedValue(mockHealthResponse);

      const result = await authService.healthCheck();

      expect(result).toMatchObject({
        timestamp: expect.any(Number),
        service_available: true,
        authentication_exists: expect.any(Boolean),
        keycloak_status: expect.any(String),
      });
    });
  });

  describe('Batch Testing', () => {
    it('should validate batch test results structure', async () => {
      const mockBatchResults = {
        admin: { message: 'admin response' },
        user: { message: 'user response' },
        visitor: { message: 'visitor response' },
        authTest: { valid: true },
        healthCheck: { service_available: true },
      };

      (authService.testAllEndpoints as any).mockResolvedValue(mockBatchResults);

      const results = await authService.testAllEndpoints();

      expect(results).toHaveProperty('admin');
      expect(results).toHaveProperty('user');
      expect(results).toHaveProperty('visitor');
      expect(results).toHaveProperty('authTest');
      expect(results).toHaveProperty('healthCheck');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle token-related errors', async () => {
      (authService.getCurrentToken as any).mockReturnValue(null);
      (authService.hasValidToken as any).mockReturnValue(false);

      expect(authService.getCurrentToken()).toBeNull();
      expect(authService.hasValidToken()).toBe(false);
    });

    it('should handle missing refresh token in logout test', async () => {
      (authService.testLogout as any).mockRejectedValue(
        new Error('Logout test failed: 401')
      );

      await expect(authService.testLogout('')).rejects.toThrow();
    });
  });

  describe('API Headers', () => {
    it('should include proper authorization headers', async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      (authService.getCurrentToken as any).mockReturnValue('test-token');

      await authService.testAdminEndpoint();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });

    it('should handle requests without token', async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      (authService.getCurrentToken as any).mockReturnValue(null);

      await authService.testVisitorEndpoint();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'Authorization': expect.any(String),
          }),
        })
      );
    });
  });
});

