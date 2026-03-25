// 多级缓存系统
// 对标大厂标准：Redis缓存、本地缓存、缓存策略

import { logger } from './logger';

// 缓存配置
interface CacheConfig {
  ttl: number;           // 默认过期时间（秒）
  maxSize: number;       // 最大缓存条目数
  checkPeriod: number;   // 清理周期（秒）
}

const DEFAULT_CONFIG: CacheConfig = {
  ttl: 300,              // 5分钟
  maxSize: 1000,
  checkPeriod: 60        // 1分钟
};

// 缓存条目
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
}

// 本地内存缓存
export class LocalCache<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private config: CacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<CacheConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanup();
  }

  // 获取缓存
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    // 检查是否过期
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // 更新访问统计
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    return entry.value;
  }

  // 设置缓存
  set(key: string, value: T, ttl?: number): void {
    // 如果缓存已满，清理最久未使用的条目
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    const expiresAt = Date.now() + (ttl || this.config.ttl) * 1000;
    
    this.cache.set(key, {
      value,
      expiresAt,
      accessCount: 1,
      lastAccessed: Date.now()
    });
  }

  // 删除缓存
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  // 检查是否存在
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  // 清空缓存
  clear(): void {
    this.cache.clear();
    logger.info('Local cache cleared');
  }

  // 获取缓存统计
  getStats(): {
    size: number;
    hitRate: number;
    entries: Array<{ key: string; accessCount: number; expiresIn: number }>;
  } {
    const entries: Array<{ key: string; accessCount: number; expiresIn: number }> = [];
    let totalAccesses = 0;

    for (const [key, entry] of this.cache) {
      totalAccesses += entry.accessCount;
      entries.push({
        key,
        accessCount: entry.accessCount,
        expiresIn: Math.max(0, Math.floor((entry.expiresAt - Date.now()) / 1000))
      });
    }

    return {
      size: this.cache.size,
      hitRate: totalAccesses > 0 ? totalAccesses / (totalAccesses + this.cache.size) : 0,
      entries: entries.sort((a, b) => b.accessCount - a.accessCount)
    };
  }

  // LRU淘汰
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      logger.debug(`Evicted LRU cache entry: ${oldestKey}`);
    }
  }

  // 清理过期条目
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} expired cache entries`);
    }
  }

  // 启动清理定时器
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.checkPeriod * 1000);
  }

  // 停止清理
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Redis缓存（模拟实现，实际应使用ioredis）
export class RedisCache<T = any> {
  private localCache: LocalCache<T>;
  private isConnected = false;

  constructor() {
    this.localCache = new LocalCache({ ttl: 600 }); // 10分钟
  }

  async connect(): Promise<void> {
    // 实际实现中连接Redis
    this.isConnected = true;
    logger.info('Redis cache connected');
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    logger.info('Redis cache disconnected');
  }

  async get(key: string): Promise<T | undefined> {
    // 先查本地缓存
    const localValue = this.localCache.get(key);
    if (localValue !== undefined) {
      return localValue;
    }

    // 实际实现中查询Redis
    // const redisValue = await redis.get(key);
    
    return undefined;
  }

  async set(key: string, value: T, ttl?: number): Promise<void> {
    // 设置本地缓存
    this.localCache.set(key, value, ttl);
    
    // 实际实现中设置Redis
    // await redis.setex(key, ttl || 300, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    this.localCache.delete(key);
    // await redis.del(key);
  }

  async clear(): Promise<void> {
    this.localCache.clear();
    // await redis.flushdb();
  }

  async getStats(): Promise<{
    connected: boolean;
    localStats: ReturnType<LocalCache['getStats']>;
  }> {
    return {
      connected: this.isConnected,
      localStats: this.localCache.getStats()
    };
  }
}

// 多级缓存管理器
export class CacheManager {
  private localCache: LocalCache;
  private redisCache: RedisCache;
  private useRedis: boolean;

  constructor() {
    this.localCache = new LocalCache();
    this.redisCache = new RedisCache();
    this.useRedis = process.env.REDIS_URL !== undefined;
  }

  async init(): Promise<void> {
    if (this.useRedis) {
      try {
        await this.redisCache.connect();
      } catch (error) {
        logger.warn('Failed to connect to Redis, falling back to local cache', error as Error);
        this.useRedis = false;
      }
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    // 先查本地缓存
    const localValue = this.localCache.get(key);
    if (localValue !== undefined) {
      return localValue as T;
    }

    // 再查Redis
    if (this.useRedis) {
      const redisValue = await this.redisCache.get(key);
      if (redisValue !== undefined) {
        // 回填本地缓存
        this.localCache.set(key, redisValue);
        return redisValue as T;
      }
    }

    return undefined;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // 设置本地缓存
    this.localCache.set(key, value, ttl);

    // 设置Redis
    if (this.useRedis) {
      await this.redisCache.set(key, value, ttl);
    }
  }

  async delete(key: string): Promise<void> {
    this.localCache.delete(key);
    
    if (this.useRedis) {
      await this.redisCache.delete(key);
    }
  }

  async clear(): Promise<void> {
    this.localCache.clear();
    
    if (this.useRedis) {
      await this.redisCache.clear();
    }
  }

  // 缓存装饰器
  cache<T>(key: string, ttl?: number) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: any[]): Promise<T> {
        const cacheKey = `${key}:${JSON.stringify(args)}`;
        
        // 尝试从缓存获取
        const cached = await cacheManager.get<T>(cacheKey);
        if (cached !== undefined) {
          return cached;
        }

        // 执行原方法
        const result = await originalMethod.apply(this, args);

        // 缓存结果
        await cacheManager.set(cacheKey, result, ttl);

        return result;
      };

      return descriptor;
    };
  }

  getStats(): {
    local: ReturnType<LocalCache['getStats']>;
    redis?: { connected: boolean };
  } {
    return {
      local: this.localCache.getStats(),
      redis: this.useRedis ? { connected: true } : undefined
    };
  }
}

// 创建全局缓存管理器
export const cacheManager = new CacheManager();

// 便捷函数
export async function getCache<T>(key: string): Promise<T | undefined> {
  return cacheManager.get<T>(key);
}

export async function setCache<T>(key: string, value: T, ttl?: number): Promise<void> {
  return cacheManager.set(key, value, ttl);
}

export async function deleteCache(key: string): Promise<void> {
  return cacheManager.delete(key);
}

export async function clearCache(): Promise<void> {
  return cacheManager.clear();
}
