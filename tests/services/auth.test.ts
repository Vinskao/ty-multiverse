import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { authService } from '../../src/services/auth';
import { storageService } from '../../src/services/storageService';

// Mock dependencies
vi.mock('../../src/services/storageService');
vi.mock('../../src/services/config');

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage mock
    (storageService.get as any).mockReturnValue(null);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Token Management', () => {
    it('should get current token from storage', () => {
      const mockToken = 'mock-jwt-token';
      (storageService.get as any).mockReturnValue(mockToken);

      const token = authService.getCurrentToken();

      expect(storageService.get).toHaveBeenCalledWith('token');
      expect(token).toBe(mockToken);
    });

    it('should check if token is valid', () => {
      (storageService.get as any).mockReturnValue('valid-token');
      expect(authService.hasValidToken()).toBe(true);

      (storageService.get as any).mockReturnValue(null);
      expect(authService.hasValidToken()).toBe(false);

      (storageService.get as any).mockReturnValue('');
      expect(authService.hasValidToken()).toBe(false);
    });
  });

  describe('API Endpoints', () => {
    const mockFetch = global.fetch as any;

    beforeEach(() => {
      mockFetch.mockClear();
    });

    describe('Admin Endpoint', () => {
      it('should test admin endpoint successfully', async () => {
        const mockResponse = {
          message: '你好 admin！',
          user: 'admin',
          authorities: ['ROLE_manage-users']
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await authService.testAdminEndpoint();

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/auth/admin'),
          expect.objectContaining({
            method: 'GET',
            headers: expect.any(Object),
          })
        );
        expect(result).toEqual(mockResponse);
      });

      it('should handle admin endpoint errors', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 403,
        });

        await expect(authService.testAdminEndpoint()).rejects.toThrow();
      });
    });

    describe('User Endpoint', () => {
      it('should test user endpoint successfully', async () => {
        const mockResponse = {
          message: '你好 user！',
          user: 'user',
          authorities: ['ROLE_user']
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await authService.testUserEndpoint();

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/auth/user'),
          expect.objectContaining({
            method: 'GET',
            headers: expect.any(Object),
          })
        );
        expect(result).toEqual(mockResponse);
      });
    });

    describe('Visitor Endpoint', () => {
      it('should test visitor endpoint successfully', async () => {
        const mockResponse = {
          message: '這是公開資訊。'
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await authService.testVisitorEndpoint();

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/auth/visitor'),
          expect.objectContaining({
            method: 'GET',
            headers: expect.any(Object),
          })
        );
        expect(result).toEqual(mockResponse);
      });
    });

    describe('Health Check', () => {
      it('should perform health check successfully', async () => {
        const mockResponse = {
          timestamp: Date.now(),
          service_available: true,
          authentication_exists: false,
          keycloak_status: 'CONFIGURED'
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await authService.healthCheck();

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/auth/health'),
          expect.objectContaining({
            method: 'GET',
            headers: expect.any(Object),
          })
        );
        expect(result).toEqual(mockResponse);
      });
    });

    describe('Auth Integration Test', () => {
      it('should perform auth integration test successfully', async () => {
        const mockResponse = {
          current_user: 'testuser',
          valid: true,
          introspect_result: { status: 200 }
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        (storageService.get as any).mockReturnValue('mock-token');

        const result = await authService.testAuthIntegration('mock-refresh-token');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/auth/test'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Authorization': 'Bearer mock-token',
              'Content-Type': 'application/x-www-form-urlencoded'
            }),
            body: 'refreshToken=mock-refresh-token'
          })
        );
        expect(result).toEqual(mockResponse);
      });

      it('should handle missing token gracefully', async () => {
        (storageService.get as any).mockReturnValue(null);

        await expect(authService.testAuthIntegration()).rejects.toThrow('Auth integration test failed: 401');
      });
    });

    describe('Logout Test', () => {
      it('should perform logout test successfully', async () => {
        const mockResponse = {
          user: 'testuser',
          logout_successful: true,
          security_context_cleared: true
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        (storageService.get as any).mockReturnValue('mock-token');

        const result = await authService.testLogout('mock-refresh-token');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/auth/logout-test'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Authorization': 'Bearer mock-token',
              'Content-Type': 'application/x-www-form-urlencoded'
            }),
            body: 'refreshToken=mock-refresh-token'
          })
        );
        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(authService.testAdminEndpoint()).rejects.toThrow('Network error');
    });

    it('should handle HTTP errors gracefully', async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(authService.testAdminEndpoint()).rejects.toThrow('HTTP error! status: 500');
    });
  });

  describe('Batch Testing', () => {
    it('should run all endpoint tests', async () => {
      const mockFetch = global.fetch as any;

      // Mock all API calls
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ timestamp: Date.now(), service_available: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: '公開資訊' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: '用戶資訊' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: '管理員資訊' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ valid: true, current_user: 'testuser' }),
        });

      (storageService.get as any).mockReturnValue('mock-token');

      const results = await authService.testAllEndpoints();

      expect(results).toHaveProperty('admin');
      expect(results).toHaveProperty('user');
      expect(results).toHaveProperty('visitor');
      expect(results).toHaveProperty('authTest');
      expect(results).toHaveProperty('healthCheck');
      expect(results.admin).toEqual({ message: '管理員資訊' });
      expect(results.user).toEqual({ message: '用戶資訊' });
      expect(results.visitor).toEqual({ message: '公開資訊' });
    });
  });
});

