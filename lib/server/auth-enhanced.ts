// 增强的认证系统
// 对标大厂标准：JWT + Refresh Token、Token轮换、设备管理

import jwt from 'jsonwebtoken';
import { logger } from './logger';
import { secretsManager } from './secrets-manager';

// Token配置
interface TokenConfig {
  accessTokenExpiry: string;     // 访问令牌过期时间
  refreshTokenExpiry: string;    // 刷新令牌过期时间
  issuer: string;
  audience: string;
}

const DEFAULT_TOKEN_CONFIG: TokenConfig = {
  accessTokenExpiry: '15m',      // 15分钟
  refreshTokenExpiry: '7d',      // 7天
  issuer: 'ei-workbench',
  audience: 'ei-workbench-client'
};

// Token载荷
interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
  jti: string;                   // JWT ID，用于唯一标识
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

// 会话信息
interface Session {
  id: string;
  userId: string;
  refreshToken: string;
  deviceInfo: {
    userAgent?: string;
    ip?: string;
    deviceId?: string;
  };
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  isValid: boolean;
}

export class EnhancedAuthManager {
  private sessions: Map<string, Session> = new Map();
  private revokedTokens: Set<string> = new Set();
  private config: TokenConfig;

  constructor(config?: Partial<TokenConfig>) {
    this.config = { ...DEFAULT_TOKEN_CONFIG, ...config };
  }

  // 生成JWT ID
  private generateJti(): string {
    return `jti_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 生成Token对
  generateTokenPair(userId: string, email: string, role: string): {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  } {
    const jwtSecret = secretsManager.getSecret('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const now = Math.floor(Date.now() / 1000);
    const accessTokenJti = this.generateJti();
    const refreshTokenJti = this.generateJti();

    // 生成访问令牌
    const accessToken = jwt.sign(
      {
        userId,
        email,
        role,
        type: 'access',
        jti: accessTokenJti,
        iat: now,
        iss: this.config.issuer,
        aud: this.config.audience
      },
      jwtSecret,
      { expiresIn: this.config.accessTokenExpiry as jwt.SignOptions['expiresIn'] }
    );

    // 生成刷新令牌
    const refreshToken = jwt.sign(
      {
        userId,
        email,
        role,
        type: 'refresh',
        jti: refreshTokenJti,
        iat: now,
        iss: this.config.issuer,
        aud: this.config.audience
      },
      jwtSecret,
      { expiresIn: this.config.refreshTokenExpiry as jwt.SignOptions['expiresIn'] }
    );

    // 创建会话
    const session: Session = {
      id: refreshTokenJti,
      userId,
      refreshToken,
      deviceInfo: {},
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      expiresAt: new Date((now + 7 * 24 * 60 * 60) * 1000).toISOString(),
      isValid: true
    };

    this.sessions.set(refreshTokenJti, session);

    logger.info('Token pair generated', { userId, sessionId: refreshTokenJti });

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60 // 15分钟（秒）
    };
  }

  // 验证访问令牌
  verifyAccessToken(token: string): TokenPayload | null {
    try {
      const jwtSecret = secretsManager.getSecret('JWT_SECRET');
      if (!jwtSecret) {
        throw new Error('JWT_SECRET not configured');
      }

      const payload = jwt.verify(token, jwtSecret, {
        issuer: this.config.issuer,
        audience: this.config.audience
      }) as TokenPayload;

      // 检查是否是访问令牌
      if (payload.type !== 'access') {
        logger.warn('Invalid token type', { type: payload.type });
        return null;
      }

      // 检查令牌是否被撤销
      if (this.revokedTokens.has(payload.jti)) {
        logger.warn('Token has been revoked', { jti: payload.jti });
        return null;
      }

      return payload;
    } catch (error) {
      logger.warn('Token verification failed', { error: (error as Error).message });
      return null;
    }
  }

  // 刷新令牌
  refreshAccessToken(refreshToken: string): {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  } | null {
    try {
      const jwtSecret = secretsManager.getSecret('JWT_SECRET');
      if (!jwtSecret) {
        throw new Error('JWT_SECRET not configured');
      }

      const payload = jwt.verify(refreshToken, jwtSecret, {
        issuer: this.config.issuer,
        audience: this.config.audience
      }) as TokenPayload;

      // 检查是否是刷新令牌
      if (payload.type !== 'refresh') {
        logger.warn('Invalid token type for refresh', { type: payload.type });
        return null;
      }

      // 检查会话是否存在且有效
      const session = this.sessions.get(payload.jti);
      if (!session || !session.isValid) {
        logger.warn('Invalid or expired session', { jti: payload.jti });
        return null;
      }

      // 检查刷新令牌是否匹配
      if (session.refreshToken !== refreshToken) {
        logger.warn('Refresh token mismatch', { jti: payload.jti });
        // 可能存在令牌被盗用的情况，撤销该会话
        this.revokeSession(payload.jti);
        return null;
      }

      // 撤销旧的令牌
      this.revokedTokens.add(payload.jti);

      // 生成新的Token对（Token轮换）
      const newTokens = this.generateTokenPair(
        payload.userId,
        payload.email,
        payload.role
      );

      // 删除旧会话
      this.sessions.delete(payload.jti);

      logger.info('Token refreshed', { userId: payload.userId });

      return newTokens;
    } catch (error) {
      logger.warn('Token refresh failed', { error: (error as Error).message });
      return null;
    }
  }

  // 撤销会话
  revokeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.isValid = false;
    this.revokedTokens.add(sessionId);

    logger.info('Session revoked', { sessionId, userId: session.userId });

    return true;
  }

  // 撤销用户的所有会话
  revokeAllUserSessions(userId: string): number {
    let count = 0;

    for (const [sessionId, session] of this.sessions) {
      if (session.userId === userId) {
        this.revokeSession(sessionId);
        count++;
      }
    }

    logger.info('All user sessions revoked', { userId, count });

    return count;
  }

  // 获取用户的所有会话
  getUserSessions(userId: string): Session[] {
    return Array.from(this.sessions.values())
      .filter(session => session.userId === userId && session.isValid);
  }

  // 清理过期会话
  cleanupExpiredSessions(): number {
    const now = new Date();
    let count = 0;

    for (const [sessionId, session] of this.sessions) {
      if (new Date(session.expiresAt) < now || !session.isValid) {
        this.sessions.delete(sessionId);
        count++;
      }
    }

    // 清理过期的撤销令牌（保留24小时）
    // 在实际应用中，应该使用Redis等存储并设置TTL

    logger.info('Expired sessions cleaned up', { count });

    return count;
  }

  // 获取会话统计
  getSessionStats(): {
    totalSessions: number;
    activeSessions: number;
    revokedTokens: number;
  } {
    return {
      totalSessions: this.sessions.size,
      activeSessions: Array.from(this.sessions.values()).filter(s => s.isValid).length,
      revokedTokens: this.revokedTokens.size
    };
  }
}

// 创建全局认证管理器
export const enhancedAuth = new EnhancedAuthManager();

// 便捷函数
export function generateTokenPair(userId: string, email: string, role: string) {
  return enhancedAuth.generateTokenPair(userId, email, role);
}

export function verifyAccessToken(token: string) {
  return enhancedAuth.verifyAccessToken(token);
}

export function refreshAccessToken(refreshToken: string) {
  return enhancedAuth.refreshAccessToken(refreshToken);
}

export function revokeSession(sessionId: string) {
  return enhancedAuth.revokeSession(sessionId);
}
