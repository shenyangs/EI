/** @jest-environment node */

import { NextRequest } from 'next/server';

import {
  corsMiddleware,
  hashPassword,
  httpsRedirectMiddleware,
  rateLimitMiddleware,
  validateInput,
  verifyPassword
} from '@/lib/server/security';

function createRequest(url: string, init: { method?: string; headers?: Record<string, string> } = {}) {
  return new NextRequest(url, {
    method: init.method || 'GET',
    headers: init.headers
  });
}

describe('Security', () => {
  describe('Password Hashing', () => {
    it('should hash password correctly', async () => {
      const password = 'testPassword123';
      const hashedPassword = await hashPassword(password);

      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword).toContain('$2b$');
    });

    it('should verify correct password', async () => {
      const password = 'testPassword123';
      const hashedPassword = await hashPassword(password);

      const isValid = await verifyPassword(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'testPassword123';
      const hashedPassword = await hashPassword(password);

      const isValid = await verifyPassword('wrongPassword123', hashedPassword);
      expect(isValid).toBe(false);
    });
  });

  describe('Input Validation', () => {
    it('should remove script tags', () => {
      expect(validateInput('<script>alert("xss")</script>Hello World')).toBe('Hello World');
    });

    it('should remove complex XSS payloads', () => {
      const payload = '<script>alert(1)</script><iframe src="evil.com"></iframe>javascript:alert(2) Safe Content';
      expect(validateInput(payload)).toBe('Safe Content');
    });
  });

  describe('CORS Middleware', () => {
    it('should echo allowed origin', () => {
      const request = createRequest('http://localhost:3000/api/projects', {
        headers: { origin: 'http://localhost:3000' }
      });

      const response = corsMiddleware(request);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
    });

    it('should not add wildcard for unknown origin', () => {
      const request = createRequest('http://localhost:3000/api/projects', {
        headers: { origin: 'https://evil.example.com' }
      });

      const response = corsMiddleware(request);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });
  });

  describe('HTTPS Redirect Middleware', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
      (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
    });

    it('should redirect to HTTPS in production', () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';

      const request = createRequest('http://example.com/api/projects', {
        headers: {
          'x-forwarded-proto': 'http',
          host: 'example.com'
        }
      });

      const response = httpsRedirectMiddleware(request);
      expect(response.status).toBe(301);
      expect(response.headers.get('location')).toBe('https://example.com/api/projects');
    });

    it('should skip redirect for monitoring health endpoint', () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';

      const request = createRequest('http://example.com/api/monitoring/health', {
        headers: {
          'x-forwarded-proto': 'http',
          host: 'example.com'
        }
      });

      const response = httpsRedirectMiddleware(request);
      expect(response.status).toBe(200);
    });

    it('should not redirect localhost in production', () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';

      const request = createRequest('http://localhost:3000/api/projects', {
        headers: {
          'x-forwarded-proto': 'http',
          host: 'localhost:3000'
        }
      });

      const response = httpsRedirectMiddleware(request);
      expect(response.status).toBe(200);
    });

    it('should not redirect private network ip in production', () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';

      const request = createRequest('http://172.20.10.2:3000/api/projects', {
        headers: {
          'x-forwarded-proto': 'http',
          host: '172.20.10.2:3000'
        }
      });

      const response = httpsRedirectMiddleware(request);
      expect(response.status).toBe(200);
    });
  });

  describe('Rate Limit Middleware', () => {
    it('should allow requests within limit', () => {
      const request = createRequest('http://localhost:3000/api/projects', {
        method: 'GET',
        headers: { 'x-real-ip': '127.0.0.1' }
      });

      const response = rateLimitMiddleware(request);
      expect(response.status).toBe(200);
    });

    it('should block requests exceeding limit', () => {
      const request = createRequest('http://localhost:3000/api/projects', {
        method: 'GET',
        headers: { 'x-real-ip': '127.0.0.2' }
      });

      for (let index = 0; index < 60; index += 1) {
        rateLimitMiddleware(request);
      }

      const response = rateLimitMiddleware(request);
      expect(response.status).toBe(429);
    });
  });
});
