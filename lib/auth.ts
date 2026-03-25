// 认证状态管理

// 存储token
export const setAuthToken = (token: string): void => {
  localStorage.setItem('authToken', token);
};

// 获取token
export const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// 移除token
export const removeAuthToken = (): void => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('rememberMe');
};

// 检查是否已登录
export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};

// 存储用户信息
export const setUserInfo = (userInfo: any): void => {
  localStorage.setItem('userInfo', JSON.stringify(userInfo));
};

// 获取用户信息
export const getUserInfo = (): any => {
  const userInfo = localStorage.getItem('userInfo');
  return userInfo ? JSON.parse(userInfo) : null;
};

// 移除用户信息
export const removeUserInfo = (): void => {
  localStorage.removeItem('userInfo');
};

// 完整的登出功能
export const logout = (): void => {
  removeAuthToken();
  removeUserInfo();
};

// 获取认证头
export const getAuthHeader = (): Record<string, string> => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
