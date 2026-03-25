import { setAuthToken, getAuthToken, removeAuthToken, isAuthenticated, setUserInfo, getUserInfo, removeUserInfo, logout, getAuthHeader } from '@/lib/auth';

// 模拟localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('Auth Functions', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  describe('setAuthToken', () => {
    it('should set auth token in localStorage', () => {
      const token = 'test-token';
      setAuthToken(token);
      expect(getAuthToken()).toBe(token);
    });
  });

  describe('getAuthToken', () => {
    it('should return null when no token is set', () => {
      expect(getAuthToken()).toBeNull();
    });

    it('should return the stored token', () => {
      const token = 'test-token';
      mockLocalStorage.setItem('authToken', token);
      expect(getAuthToken()).toBe(token);
    });
  });

  describe('removeAuthToken', () => {
    it('should remove auth token from localStorage', () => {
      const token = 'test-token';
      mockLocalStorage.setItem('authToken', token);
      removeAuthToken();
      expect(getAuthToken()).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when no token is set', () => {
      expect(isAuthenticated()).toBe(false);
    });

    it('should return true when token is set', () => {
      const token = 'test-token';
      mockLocalStorage.setItem('authToken', token);
      expect(isAuthenticated()).toBe(true);
    });
  });

  describe('setUserInfo', () => {
    it('should set user info in localStorage', () => {
      const userInfo = { id: 1, email: 'test@example.com' };
      setUserInfo(userInfo);
      expect(getUserInfo()).toEqual(userInfo);
    });
  });

  describe('getUserInfo', () => {
    it('should return null when no user info is set', () => {
      expect(getUserInfo()).toBeNull();
    });

    it('should return the stored user info', () => {
      const userInfo = { id: 1, email: 'test@example.com' };
      mockLocalStorage.setItem('userInfo', JSON.stringify(userInfo));
      expect(getUserInfo()).toEqual(userInfo);
    });
  });

  describe('removeUserInfo', () => {
    it('should remove user info from localStorage', () => {
      const userInfo = { id: 1, email: 'test@example.com' };
      mockLocalStorage.setItem('userInfo', JSON.stringify(userInfo));
      removeUserInfo();
      expect(getUserInfo()).toBeNull();
    });
  });

  describe('logout', () => {
    it('should remove both auth token and user info', () => {
      const token = 'test-token';
      const userInfo = { id: 1, email: 'test@example.com' };
      mockLocalStorage.setItem('authToken', token);
      mockLocalStorage.setItem('userInfo', JSON.stringify(userInfo));
      
      logout();
      
      expect(getAuthToken()).toBeNull();
      expect(getUserInfo()).toBeNull();
    });
  });

  describe('getAuthHeader', () => {
    it('should return empty object when no token is set', () => {
      expect(getAuthHeader()).toEqual({});
    });

    it('should return authorization header when token is set', () => {
      const token = 'test-token';
      mockLocalStorage.setItem('authToken', token);
      expect(getAuthHeader()).toEqual({ Authorization: `Bearer ${token}` });
    });
  });
});
