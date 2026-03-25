import { hashPassword, verifyPassword, validateInput, corsMiddleware, httpsRedirectMiddleware, rateLimitMiddleware } from '@/lib/server/security';
import { NextRequest, NextResponse } from 'next/server';

describe('Security', () => {
  describe('Password Hashing', () => {
    it('should hash password correctly', async () => {
      const password = 'testPassword123';
      const hashedPassword = await hashPassword(password);
      
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword).toContain('$2b$'); // bcrypt hash prefix
    });

    it('should verify correct password', async () => {
      const password = 'testPassword123';
      const hashedPassword = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword123';
      const hashedPassword = await hashPassword(password);
      
      const isValid = await verifyPassword(wrongPassword, hashedPassword);
      expect(isValid).toBe(false);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'testPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Input Validation', () => {
    it('should remove script tags', () => {
      const input = '<script>alert("xss")</script>Hello World';
      const result = validateInput(input);
      expect(result).toBe('Hello World');
    });

    it('should remove iframe tags', () => {
      const input = '<iframe src="evil.com"></iframe>Content';
      const result = validateInput(input);
      expect(result).toBe('Content');
    });

    it('should remove javascript protocol', () => {
      const input = 'javascript:alert("xss") Click here';
      const result = validateInput(input);
      expect(result).toBe(' Click here');
    });

    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      const result = validateInput(input);
      expect(result).toBe('Hello World');
    });

    it('should handle complex XSS attempts', () => {
      const input = '<script>alert("xss")</script><iframe src="evil.com"></iframe>javascript:alert("xss") Safe Content';
      const result = validateInput(input);
      expect(result).toBe('Safe Content');
    });
  });

  describe('CORS Middleware', () => {
    it('should set CORS headers', () => {
      const mockRequest = {} as NextRequest;
      const response = corsMiddleware(mockRequest);
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
    });
  });

  describe('HTTPS Redirect Middleware', () => {
    it('should redirect to HTTPS in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue('http')
        },
        nextUrl: {
          clone: jest.fn().mockReturnValue({
            protocol: 'http',
            href: 'http://example.com'
          })
        }
      } as unknown as NextRequest;
      
      const response = httpsRedirectMiddleware(mockRequest);
      
      expect(response.status).toBe(307); // Redirect status
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should not redirect in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue('http')
        }
      } as unknown as NextRequest;
      
      const response = httpsRedirectMiddleware(mockRequest);
      
      expect(response.status).toBe(200);
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Rate Limit Middleware', () => {
    it('should allow requests within limit', () => {
      const mockRequest = {
        ip: '127.0.0.1',
        headers: {
          get: jest.fn().mockReturnValue(null)
        }
      } as unknown as NextRequest;
      
      const response = rateLimitMiddleware(mockRequest);
      expect(response.status).toBe(200);
    });

    it('should block requests exceeding limit', () => {
      const mockRequest = {
        ip: '127.0.0.1',
        headers: {
          get: jest.fn().mockReturnValue(null)
        }
      } as unknown as NextRequest;
      
      // Make 61 requests (exceeding the limit of 60)
      for (let i = 0; i < 60; i++) {
        rateLimitMiddleware(mockRequest);
      }
      
      const response = rateLimitMiddleware(mockRequest);
      expect(response.status).toBe(429); // Too Many Requests
    });

    it('should reset limit after window', () => {
      jest.useFakeTimers();
      
      const mockRequest = {
        ip: '127.0.0.2',
        headers: {
          get: jest.fn().mockReturnValue(null)
        }
      } as unknown as NextRequest;
      
      // Make requests up to limit
      for (let i = 0; i < 60; i++) {
        rateLimitMiddleware(mockRequest);
      }
      
      // Advance time by more than 1 minute
      jest.advanceTimersByTime(61 * 1000);
      
      // Should be allowed again
      const response = rateLimitMiddleware(mockRequest);
      expect(response.status).toBe(200);
      
      jest.useRealTimers();
    });
  });
});
