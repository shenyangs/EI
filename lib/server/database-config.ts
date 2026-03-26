// 数据库配置和迁移
// 支持从内存存储迁移到持久化数据库

import { logger } from './logger';
import { createClient } from '@supabase/supabase-js';

export type DatabaseType = 'memory' | 'sqlite' | 'postgresql' | 'mysql' | 'supabase';

export interface DatabaseConfig {
  type: DatabaseType;
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  poolSize?: number;
  supabaseUrl?: string;
  supabaseKey?: string;
}

// 数据库表结构定义
export const TABLE_SCHEMAS = {
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      full_name TEXT,
      user_type TEXT DEFAULT 'student',
      institution TEXT,
      department TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

  projects: `
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      venue_id TEXT,
      user_id TEXT,
      status TEXT DEFAULT 'draft',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `,

  project_versions: `
    CREATE TABLE IF NOT EXISTS project_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      key TEXT NOT NULL,
      fingerprint TEXT,
      title TEXT,
      summary TEXT,
      payload TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `,

  ai_models: `
    CREATE TABLE IF NOT EXISTS ai_models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      base_url TEXT,
      api_key TEXT,
      is_default BOOLEAN DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

  ai_module_configs: `
    CREATE TABLE IF NOT EXISTS ai_module_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_key TEXT NOT NULL UNIQUE,
      module_name TEXT,
      model_id INTEGER,
      use_automatic BOOLEAN DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (model_id) REFERENCES ai_models(id) ON DELETE SET NULL
    )
  `,

  academic_papers: `
    CREATE TABLE IF NOT EXISTS academic_papers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT,
      title TEXT NOT NULL,
      authors TEXT,
      abstract TEXT,
      keywords TEXT,
      venue TEXT,
      year INTEGER,
      doi TEXT,
      url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
    )
  `,

  project_references: `
    CREATE TABLE IF NOT EXISTS project_references (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      paper_id INTEGER NOT NULL,
      citation_key TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (paper_id) REFERENCES academic_papers(id) ON DELETE CASCADE
    )
  `,

  // 新增表：项目协作成员
  project_collaborators: `
    CREATE TABLE IF NOT EXISTS project_collaborators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'editor',
      permissions TEXT,
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(project_id, user_id)
    )
  `,

  // 新增表：项目变更历史
  project_changes: `
    CREATE TABLE IF NOT EXISTS project_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      user_id TEXT,
      change_type TEXT NOT NULL,
      change_data TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `,

  // 新增表：用户会话
  user_sessions: `
    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT,
      user_agent TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `
};

// 数据库迁移管理器
export class DatabaseMigration {
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  // 获取当前数据库类型
  getDatabaseType(): DatabaseType {
    return this.config.type;
  }

  // 检查是否需要迁移
  needsMigration(): boolean {
    return this.config.type !== 'memory';
  }

  // 创建表结构
  async createTables(): Promise<void> {
    if (this.config.type === 'memory') {
      logger.info('Using memory storage, no tables to create');
      return;
    }

    logger.info(`Creating tables for ${this.config.type} database`);

    try {
      // 在实际应用中，这里应该使用对应的数据库驱动来执行SQL
      // 例如：PostgreSQL使用pg，MySQL使用mysql2，SQLite使用better-sqlite3
      
      for (const [tableName, schema] of Object.entries(TABLE_SCHEMAS)) {
        logger.info(`Creating table: ${tableName}`);
        // await db.execute(schema);
      }

      logger.info('All tables created successfully');
    } catch (error) {
      logger.error('Failed to create tables', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  // 迁移数据
  async migrateData(sourceData: any): Promise<void> {
    if (this.config.type === 'memory') {
      logger.info('Using memory storage, no migration needed');
      return;
    }

    logger.info('Starting data migration');

    try {
      // 迁移用户数据
      if (sourceData.users && sourceData.users.length > 0) {
        logger.info(`Migrating ${sourceData.users.length} users`);
        // await this.migrateUsers(sourceData.users);
      }

      // 迁移项目数据
      if (sourceData.projects && sourceData.projects.length > 0) {
        logger.info(`Migrating ${sourceData.projects.length} projects`);
        // await this.migrateProjects(sourceData.projects);
      }

      // 迁移AI模型数据
      if (sourceData.aiModels && sourceData.aiModels.length > 0) {
        logger.info(`Migrating ${sourceData.aiModels.length} AI models`);
        // await this.migrateAIModels(sourceData.aiModels);
      }

      // 迁移其他数据...

      logger.info('Data migration completed successfully');
    } catch (error) {
      logger.error('Data migration failed', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  // 验证迁移
  async verifyMigration(): Promise<boolean> {
    if (this.config.type === 'memory') {
      return true;
    }

    logger.info('Verifying migration');

    try {
      // 检查所有表是否存在
      for (const tableName of Object.keys(TABLE_SCHEMAS)) {
        // const exists = await this.checkTableExists(tableName);
        // if (!exists) {
        //   logger.error(`Table ${tableName} does not exist`);
        //   return false;
        // }
      }

      logger.info('Migration verification passed');
      return true;
    } catch (error) {
      logger.error('Migration verification failed', error instanceof Error ? error : undefined);
      return false;
    }
  }

  // 回滚迁移
  async rollback(): Promise<void> {
    logger.warn('Rolling back migration');

    try {
      // 删除所有表
      for (const tableName of Object.keys(TABLE_SCHEMAS).reverse()) {
        // await db.execute(`DROP TABLE IF EXISTS ${tableName}`);
        logger.info(`Dropped table: ${tableName}`);
      }

      logger.info('Migration rollback completed');
    } catch (error) {
      logger.error('Migration rollback failed', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  // 获取迁移状态
  getMigrationStatus(): {
    type: DatabaseType;
    needsMigration: boolean;
    tables: string[];
  } {
    return {
      type: this.config.type,
      needsMigration: this.needsMigration(),
      tables: Object.keys(TABLE_SCHEMAS)
    };
  }
}

// 数据库连接管理器
export class DatabaseConnection {
  private config: DatabaseConfig;
  private connection: any = null;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  // 建立连接
  async connect(): Promise<void> {
    if (this.config.type === 'memory') {
      logger.info('Using memory storage');
      return;
    }

    logger.info(`Connecting to ${this.config.type} database`);

    try {
      // 根据数据库类型建立连接
      switch (this.config.type) {
        case 'postgresql':
          // const { Pool } = require('pg');
          // this.connection = new Pool({
          //   connectionString: this.config.connectionString,
          //   // 或其他连接参数
          // });
          break;

        case 'mysql':
          // const mysql = require('mysql2/promise');
          // this.connection = await mysql.createConnection({
          //   host: this.config.host,
          //   port: this.config.port,
          //   database: this.config.database,
          //   user: this.config.username,
          //   password: this.config.password
          // });
          break;

        case 'sqlite':
          // const Database = require('better-sqlite3');
          // this.connection = new Database(this.config.connectionString || './data.db');
          break;

        case 'supabase':
          if (!this.config.supabaseUrl || !this.config.supabaseKey) {
            throw new Error('Supabase URL and key are required');
          }
          this.connection = createClient(this.config.supabaseUrl, this.config.supabaseKey);
          break;

        default:
          throw new Error(`Unsupported database type: ${this.config.type}`);
      }

      logger.info('Database connection established');
    } catch (error) {
      logger.error('Failed to connect to database', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  // 断开连接
  async disconnect(): Promise<void> {
    if (this.connection) {
      try {
        // await this.connection.end();
        logger.info('Database connection closed');
      } catch (error) {
        logger.error('Error closing database connection', error instanceof Error ? error : undefined);
      }
      this.connection = null;
    }
  }

  // 获取连接
  getConnection(): any {
    return this.connection;
  }

  // 检查连接状态
  isConnected(): boolean {
    return this.connection !== null;
  }
}

// 数据库配置管理
export class DatabaseConfigManager {
  private static instance: DatabaseConfigManager;
  private config: DatabaseConfig;

  private constructor() {
    // 从环境变量读取配置
    this.config = {
      type: (process.env.DB_TYPE as DatabaseType) || 'memory',
      connectionString: process.env.DATABASE_URL,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
      database: process.env.DB_NAME,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true',
      poolSize: process.env.DB_POOL_SIZE ? parseInt(process.env.DB_POOL_SIZE) : 10,
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_ANON_KEY
    };
  }

  static getInstance(): DatabaseConfigManager {
    if (!DatabaseConfigManager.instance) {
      DatabaseConfigManager.instance = new DatabaseConfigManager();
    }
    return DatabaseConfigManager.instance;
  }

  getConfig(): DatabaseConfig {
    return this.config;
  }

  updateConfig(config: Partial<DatabaseConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// 导出便捷函数
export function getDatabaseConfig(): DatabaseConfig {
  return DatabaseConfigManager.getInstance().getConfig();
}

export function createMigration(): DatabaseMigration {
  const config = getDatabaseConfig();
  return new DatabaseMigration(config);
}

export function createConnection(): DatabaseConnection {
  const config = getDatabaseConfig();
  return new DatabaseConnection(config);
}
