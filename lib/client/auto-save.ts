// 自动保存系统
// 本地Storage + 云端同步 + 冲突解决

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/server/logger';

interface AutoSaveConfig {
  interval: number;           // 自动保存间隔（毫秒）
  maxLocalVersions: number;   // 本地最大版本数
  retryAttempts: number;      // 重试次数
  retryDelay: number;         // 重试延迟（毫秒）
}

interface SaveVersion {
  id: string;
  timestamp: number;
  content: any;
  checksum: string;
  source: 'auto' | 'manual' | 'cloud';
}

interface SaveState {
  lastSaved: number;
  lastSynced: number;
  pendingChanges: boolean;
  conflictDetected: boolean;
  versions: SaveVersion[];
}

const DEFAULT_CONFIG: AutoSaveConfig = {
  interval: 30000,           // 30秒
  maxLocalVersions: 50,
  retryAttempts: 3,
  retryDelay: 5000
};

export class AutoSaveManager {
  private config: AutoSaveConfig;
  private projectId: string;
  private saveState: SaveState;
  private timer: NodeJS.Timeout | null = null;
  private onSaveCallback?: (version: SaveVersion) => void;
  private onConflictCallback?: (local: SaveVersion, remote: SaveVersion) => void;
  private onErrorCallback?: (error: Error) => void;

  constructor(projectId: string, config?: Partial<AutoSaveConfig>) {
    this.projectId = projectId;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.saveState = this.loadState();
  }

  // 启动自动保存
  start(): void {
    if (this.timer) return;
    
    this.timer = setInterval(() => {
      this.autoSave();
    }, this.config.interval);

    logger.info('Auto-save started', { projectId: this.projectId, interval: this.config.interval });
  }

  // 停止自动保存
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('Auto-save stopped', { projectId: this.projectId });
    }
  }

  // 立即保存
  async saveNow(content: any, source: 'auto' | 'manual' = 'manual'): Promise<SaveVersion | null> {
    try {
      const version = await this.performSave(content, source);
      return version;
    } catch (error) {
      this.handleError(error as Error);
      return null;
    }
  }

  // 执行保存
  private async performSave(content: any, source: 'auto' | 'manual' | 'cloud'): Promise<SaveVersion> {
    const version: SaveVersion = {
      id: this.generateVersionId(),
      timestamp: Date.now(),
      content: JSON.parse(JSON.stringify(content)), // 深拷贝
      checksum: this.calculateChecksum(content),
      source
    };

    // 1. 保存到本地Storage
    this.saveToLocal(version);

    // 2. 同步到云端
    await this.syncToCloud(version);

    // 3. 更新状态
    this.saveState.lastSaved = version.timestamp;
    this.saveState.pendingChanges = false;
    this.saveState.versions.push(version);
    
    // 清理旧版本
    this.cleanupOldVersions();
    
    // 4. 触发回调
    this.onSaveCallback?.(version);

    logger.info('Content saved', { 
      projectId: this.projectId, 
      versionId: version.id,
      source 
    });

    return version;
  }

  // 保存到本地Storage
  private saveToLocal(version: SaveVersion): void {
    try {
      const key = `autosave_${this.projectId}_${version.id}`;
      localStorage.setItem(key, JSON.stringify(version));
      
      // 保存版本索引
      const indexKey = `autosave_index_${this.projectId}`;
      const index = JSON.parse(localStorage.getItem(indexKey) || '[]');
      index.push({ id: version.id, timestamp: version.timestamp });
      localStorage.setItem(indexKey, JSON.stringify(index));
    } catch (error) {
      logger.error('Failed to save to localStorage', error as Error);
      throw error;
    }
  }

  // 同步到云端
  private async syncToCloud(version: SaveVersion): Promise<void> {
    let attempts = 0;
    
    while (attempts < this.config.retryAttempts) {
      try {
        const response = await fetch(`/api/projects/${this.projectId}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(version)
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        this.saveState.lastSynced = Date.now();
        logger.info('Synced to cloud', { projectId: this.projectId, versionId: version.id });
        return;
      } catch (error) {
        attempts++;
        logger.warn(`Cloud sync attempt ${attempts} failed`, { error: (error as Error).message });
        
        if (attempts < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * attempts);
        }
      }
    }

    // 标记为待同步
    this.saveState.pendingChanges = true;
    logger.error('Failed to sync to cloud after all attempts', undefined, { projectId: this.projectId });
  }

  // 检查冲突
  async checkConflict(): Promise<boolean> {
    try {
      const response = await fetch(`/api/projects/${this.projectId}/versions/latest`);
      if (!response.ok) return false;

      const remoteVersion: SaveVersion = await response.json();
      const localVersion = this.getLatestLocalVersion();

      if (!localVersion) return false;

      // 如果本地版本比云端新，但没有冲突
      if (localVersion.timestamp > remoteVersion.timestamp) {
        return false;
      }

      // 如果云端版本更新，检查内容是否不同
      if (remoteVersion.timestamp > localVersion.timestamp &&
          remoteVersion.checksum !== localVersion.checksum) {
        this.saveState.conflictDetected = true;
        this.onConflictCallback?.(localVersion, remoteVersion);
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Failed to check conflict', error as Error);
      return false;
    }
  }

  // 解决冲突
  async resolveConflict(strategy: 'local' | 'remote' | 'merge', local: SaveVersion, remote: SaveVersion): Promise<void> {
    try {
      let finalVersion: SaveVersion;

      switch (strategy) {
        case 'local':
          finalVersion = local;
          await this.syncToCloud(local);
          break;
        case 'remote':
          finalVersion = remote;
          this.saveToLocal(remote);
          break;
        case 'merge':
          finalVersion = await this.mergeVersions(local, remote);
          break;
        default:
          throw new Error('Unknown conflict resolution strategy');
      }

      this.saveState.conflictDetected = false;
      this.onSaveCallback?.(finalVersion);

      logger.info('Conflict resolved', { 
        projectId: this.projectId, 
        strategy,
        versionId: finalVersion.id 
      });
    } catch (error) {
      logger.error('Failed to resolve conflict', error as Error);
      throw error;
    }
  }

  // 合并版本（简单实现）
  private async mergeVersions(local: SaveVersion, remote: SaveVersion): Promise<SaveVersion> {
    // 实际实现中应该使用更复杂的合并算法
    const mergedContent = {
      ...remote.content,
      ...local.content,
      sections: this.mergeSections(local.content.sections, remote.content.sections)
    };

    return this.performSave(mergedContent, 'cloud');
  }

  // 合并章节
  private mergeSections(localSections: any[], remoteSections: any[]): any[] {
    // 基于ID合并章节
    const merged = new Map();
    
    remoteSections.forEach(section => {
      merged.set(section.id, section);
    });
    
    localSections.forEach(section => {
      if (merged.has(section.id)) {
        // 如果本地更新，使用本地版本
        const remote = merged.get(section.id);
        if (section.lastModified > remote.lastModified) {
          merged.set(section.id, section);
        }
      } else {
        merged.set(section.id, section);
      }
    });

    return Array.from(merged.values());
  }

  // 获取保存状态
  getSaveState(): SaveState {
    return { ...this.saveState };
  }

  // 获取最新本地版本
  getLatestLocalVersion(): SaveVersion | null {
    if (this.saveState.versions.length === 0) {
      return null;
    }
    return this.saveState.versions[this.saveState.versions.length - 1];
  }

  // 获取所有版本历史
  getVersionHistory(): SaveVersion[] {
    return [...this.saveState.versions].sort((a, b) => b.timestamp - a.timestamp);
  }

  // 恢复到指定版本
  async restoreVersion(versionId: string): Promise<SaveVersion | null> {
    const version = this.saveState.versions.find(v => v.id === versionId);
    if (!version) {
      // 尝试从localStorage加载
      const key = `autosave_${this.projectId}_${versionId}`;
      const data = localStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    }
    return version;
  }

  // 设置回调
  onSave(callback: (version: SaveVersion) => void): void {
    this.onSaveCallback = callback;
  }

  onConflict(callback: (local: SaveVersion, remote: SaveVersion) => void): void {
    this.onConflictCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  // 私有辅助方法
  private autoSave(): void {
    if (!this.saveState.pendingChanges) return;
    
    const latest = this.getLatestLocalVersion();
    if (latest) {
      this.performSave(latest.content, 'auto');
    }
  }

  private loadState(): SaveState {
    try {
      const key = `autosave_state_${this.projectId}`;
      const data = localStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      logger.error('Failed to load save state', error as Error);
    }

    return {
      lastSaved: 0,
      lastSynced: 0,
      pendingChanges: false,
      conflictDetected: false,
      versions: []
    };
  }

  private saveStateToStorage(): void {
    try {
      const key = `autosave_state_${this.projectId}`;
      localStorage.setItem(key, JSON.stringify(this.saveState));
    } catch (error) {
      logger.error('Failed to save state', error as Error);
    }
  }

  private cleanupOldVersions(): void {
    if (this.saveState.versions.length > this.config.maxLocalVersions) {
      const toRemove = this.saveState.versions.splice(0, this.saveState.versions.length - this.config.maxLocalVersions);
      
      // 从localStorage删除旧版本
      toRemove.forEach(version => {
        const key = `autosave_${this.projectId}_${version.id}`;
        localStorage.removeItem(key);
      });
    }
  }

  private generateVersionId(): string {
    return `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateChecksum(content: any): string {
    // 简单的校验和计算
    const str = JSON.stringify(content);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private handleError(error: Error): void {
    logger.error('Auto-save error', error);
    this.onErrorCallback?.(error);
  }
}

// 创建Hook供React使用
export function useAutoSave(projectId: string) {
  const [saveManager] = useState(() => new AutoSaveManager(projectId));
  const [saveState, setSaveState] = useState<SaveState>(saveManager.getSaveState());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    saveManager.onSave((version) => {
      setSaveState(saveManager.getSaveState());
      setIsSaving(false);
    });

    saveManager.onConflict((local, remote) => {
      // 处理冲突，显示冲突解决UI
      console.log('Conflict detected:', { local, remote });
    });

    saveManager.start();

    return () => {
      saveManager.stop();
    };
  }, [saveManager]);

  const save = useCallback(async (content: any) => {
    setIsSaving(true);
    return await saveManager.saveNow(content, 'manual');
  }, [saveManager]);

  const restore = useCallback(async (versionId: string) => {
    return await saveManager.restoreVersion(versionId);
  }, [saveManager]);

  return {
    saveState,
    isSaving,
    save,
    restore,
    getHistory: () => saveManager.getVersionHistory()
  };
}

// 导出类型
export type { SaveVersion, SaveState, AutoSaveConfig };
