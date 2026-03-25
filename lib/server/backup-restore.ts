// 数据备份和恢复系统
// 支持自动备份、手动备份和数据恢复

import { logger } from './logger';

export type BackupType = 'full' | 'incremental' | 'project';

export interface BackupConfig {
  autoBackup: boolean;
  backupInterval: number; // 小时
  maxBackups: number;
  backupLocation: string;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
}

export interface BackupMetadata {
  id: string;
  type: BackupType;
  timestamp: string;
  size: number;
  checksum: string;
  description?: string;
  createdBy: string;
  expiresAt?: string;
}

export interface BackupData {
  metadata: BackupMetadata;
  data: {
    users?: any[];
    projects?: any[];
    projectVersions?: any[];
    aiModels?: any[];
    aiModuleConfigs?: any[];
    academicPapers?: any[];
    projectReferences?: any[];
    projectCollaborators?: any[];
    projectChanges?: any[];
    userSessions?: any[];
  };
}

// 默认备份配置
const DEFAULT_BACKUP_CONFIG: BackupConfig = {
  autoBackup: true,
  backupInterval: 24, // 每天备份一次
  maxBackups: 30, // 保留30个备份
  backupLocation: './backups',
  compressionEnabled: true,
  encryptionEnabled: false
};

// 备份管理器
export class BackupManager {
  private config: BackupConfig;
  private backups: Map<string, BackupData> = new Map();
  private autoBackupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<BackupConfig> = {}) {
    this.config = { ...DEFAULT_BACKUP_CONFIG, ...config };
  }

  // 启动自动备份
  startAutoBackup(): void {
    if (!this.config.autoBackup) {
      logger.info('Auto backup is disabled');
      return;
    }

    if (this.autoBackupTimer) {
      clearInterval(this.autoBackupTimer);
    }

    const intervalMs = this.config.backupInterval * 60 * 60 * 1000;
    
    this.autoBackupTimer = setInterval(async () => {
      try {
        await this.createBackup('full', 'system', '自动备份');
        logger.info('Auto backup completed successfully');
      } catch (error) {
        logger.error('Auto backup failed', error instanceof Error ? error : undefined);
      }
    }, intervalMs);

    logger.info(`Auto backup started with interval ${this.config.backupInterval} hours`);
  }

  // 停止自动备份
  stopAutoBackup(): void {
    if (this.autoBackupTimer) {
      clearInterval(this.autoBackupTimer);
      this.autoBackupTimer = null;
      logger.info('Auto backup stopped');
    }
  }

  // 创建备份
  async createBackup(
    type: BackupType,
    createdBy: string,
    description?: string,
    projectId?: string
  ): Promise<BackupMetadata> {
    logger.info(`Creating ${type} backup`);

    try {
      // 收集备份数据
      const backupData = await this.collectBackupData(type, projectId);
      
      // 创建备份元数据
      const metadata: BackupMetadata = {
        id: this.generateBackupId(),
        type,
        timestamp: new Date().toISOString(),
        size: 0,
        checksum: '',
        description,
        createdBy,
        expiresAt: this.calculateExpiryDate()
      };

      // 计算数据大小和校验和
      const dataString = JSON.stringify(backupData);
      metadata.size = Buffer.byteLength(dataString, 'utf8');
      metadata.checksum = this.calculateChecksum(dataString);

      // 压缩数据（如果启用）
      let finalData = dataString;
      if (this.config.compressionEnabled) {
        finalData = await this.compressData(dataString);
        metadata.size = Buffer.byteLength(finalData, 'utf8');
      }

      // 加密数据（如果启用）
      if (this.config.encryptionEnabled) {
        finalData = await this.encryptData(finalData);
      }

      // 存储备份
      const backup: BackupData = {
        metadata,
        data: backupData
      };

      this.backups.set(metadata.id, backup);

      // 清理旧备份
      await this.cleanupOldBackups();

      logger.info(`Backup ${metadata.id} created successfully`);

      return metadata;
    } catch (error) {
      logger.error('Failed to create backup', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  // 收集备份数据
  private async collectBackupData(type: BackupType, projectId?: string): Promise<BackupData['data']> {
    const data: BackupData['data'] = {};

    // 在实际应用中，这里应该从数据库查询数据
    // 这里使用模拟数据
    
    if (type === 'full' || type === 'incremental') {
      // data.users = await db.query('SELECT * FROM users');
      // data.projects = await db.query('SELECT * FROM projects');
      // data.aiModels = await db.query('SELECT * FROM ai_models');
      // ... 其他表
    }

    if (type === 'project' && projectId) {
      // data.projects = await db.query('SELECT * FROM projects WHERE id = ?', [projectId]);
      // data.projectVersions = await db.query('SELECT * FROM project_versions WHERE project_id = ?', [projectId]);
      // ... 项目相关数据
    }

    return data;
  }

  // 恢复备份
  async restoreBackup(backupId: string, restoredBy: string): Promise<boolean> {
    logger.info(`Restoring backup ${backupId}`);

    try {
      const backup = this.backups.get(backupId);
      if (!backup) {
        logger.error(`Backup ${backupId} not found`);
        return false;
      }

      // 验证备份完整性
      const isValid = await this.verifyBackup(backup);
      if (!isValid) {
        logger.error(`Backup ${backupId} is corrupted`);
        return false;
      }

      // 在实际应用中，这里应该将数据恢复到数据库
      // await this.restoreDataToDatabase(backup.data);

      logger.info(`Backup ${backupId} restored successfully by ${restoredBy}`);

      return true;
    } catch (error) {
      logger.error(`Failed to restore backup ${backupId}`, error instanceof Error ? error : undefined);
      return false;
    }
  }

  // 验证备份完整性
  async verifyBackup(backup: BackupData): Promise<boolean> {
    try {
      const dataString = JSON.stringify(backup.data);
      const checksum = this.calculateChecksum(dataString);
      
      return checksum === backup.metadata.checksum;
    } catch (error) {
      logger.error('Backup verification failed', error instanceof Error ? error : undefined);
      return false;
    }
  }

  // 删除备份
  async deleteBackup(backupId: string): Promise<boolean> {
    try {
      if (this.backups.has(backupId)) {
        this.backups.delete(backupId);
        logger.info(`Backup ${backupId} deleted`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error(`Failed to delete backup ${backupId}`, error instanceof Error ? error : undefined);
      return false;
    }
  }

  // 获取备份列表
  getBackupList(): BackupMetadata[] {
    return Array.from(this.backups.values())
      .map(backup => backup.metadata)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // 获取备份详情
  getBackupDetails(backupId: string): BackupData | undefined {
    return this.backups.get(backupId);
  }

  // 导出备份
  async exportBackup(backupId: string): Promise<Blob | null> {
    try {
      const backup = this.backups.get(backupId);
      if (!backup) return null;

      const dataString = JSON.stringify(backup);
      return new Blob([dataString], { type: 'application/json' });
    } catch (error) {
      logger.error(`Failed to export backup ${backupId}`, error instanceof Error ? error : undefined);
      return null;
    }
  }

  // 导入备份
  async importBackup(data: string): Promise<BackupMetadata | null> {
    try {
      const backup: BackupData = JSON.parse(data);
      
      // 验证备份格式
      if (!backup.metadata || !backup.data) {
        logger.error('Invalid backup format');
        return null;
      }

      // 验证备份完整性
      const isValid = await this.verifyBackup(backup);
      if (!isValid) {
        logger.error('Imported backup is corrupted');
        return null;
      }

      // 生成新的备份ID
      backup.metadata.id = this.generateBackupId();
      backup.metadata.timestamp = new Date().toISOString();

      this.backups.set(backup.metadata.id, backup);

      logger.info(`Backup imported successfully with new ID ${backup.metadata.id}`);

      return backup.metadata;
    } catch (error) {
      logger.error('Failed to import backup', error instanceof Error ? error : undefined);
      return null;
    }
  }

  // 清理旧备份
  private async cleanupOldBackups(): Promise<void> {
    const backups = this.getBackupList();
    
    if (backups.length <= this.config.maxBackups) {
      return;
    }

    // 按时间排序，删除最旧的备份
    const backupsToDelete = backups.slice(this.config.maxBackups);
    
    for (const backup of backupsToDelete) {
      await this.deleteBackup(backup.id);
    }

    logger.info(`Cleaned up ${backupsToDelete.length} old backups`);
  }

  // 生成备份ID
  private generateBackupId(): string {
    return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 计算校验和
  private calculateChecksum(data: string): string {
    // 使用简单的哈希算法
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  // 压缩数据
  private async compressData(data: string): Promise<string> {
    // 在实际应用中，这里应该使用zlib等压缩库
    // 这里使用简单的Base64编码作为示例
    return Buffer.from(data).toString('base64');
  }

  // 解压数据
  private async decompressData(data: string): Promise<string> {
    // 在实际应用中，这里应该使用zlib等解压库
    return Buffer.from(data, 'base64').toString('utf8');
  }

  // 加密数据
  private async encryptData(data: string): Promise<string> {
    // 在实际应用中，这里应该使用crypto等加密库
    // 这里简单返回原数据
    return data;
  }

  // 解密数据
  private async decryptData(data: string): Promise<string> {
    // 在实际应用中，这里应该使用crypto等解密库
    return data;
  }

  // 计算过期日期
  private calculateExpiryDate(): string {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); // 30天后过期
    return expiryDate.toISOString();
  }

  // 获取备份统计
  getBackupStats(): {
    totalBackups: number;
    totalSize: number;
    oldestBackup: string | null;
    newestBackup: string | null;
  } {
    const backups = this.getBackupList();
    
    return {
      totalBackups: backups.length,
      totalSize: backups.reduce((sum, backup) => sum + backup.size, 0),
      oldestBackup: backups.length > 0 ? backups[backups.length - 1].timestamp : null,
      newestBackup: backups.length > 0 ? backups[0].timestamp : null
    };
  }

  // 更新配置
  updateConfig(config: Partial<BackupConfig>): void {
    this.config = { ...this.config, ...config };
    
    // 如果自动备份配置改变，重新启动
    if (config.autoBackup !== undefined || config.backupInterval !== undefined) {
      this.stopAutoBackup();
      this.startAutoBackup();
    }

    logger.info('Backup configuration updated');
  }

  // 获取配置
  getConfig(): BackupConfig {
    return { ...this.config };
  }
}

// 创建全局备份管理器实例
export const backupManager = new BackupManager();

// 便捷函数
export async function createBackup(
  type: BackupType,
  createdBy: string,
  description?: string
): Promise<BackupMetadata> {
  return backupManager.createBackup(type, createdBy, description);
}

export async function restoreBackup(backupId: string, restoredBy: string): Promise<boolean> {
  return backupManager.restoreBackup(backupId, restoredBy);
}

export function getBackupList(): BackupMetadata[] {
  return backupManager.getBackupList();
}

export function startAutoBackup(): void {
  backupManager.startAutoBackup();
}

export function stopAutoBackup(): void {
  backupManager.stopAutoBackup();
}
