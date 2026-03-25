// 实时协作引擎
// 支持多人同时编辑论文

import { logger } from '@/lib/server/logger';

// 协作者角色
type CollaboratorRole = 'owner' | 'editor' | 'viewer';

// 协作者信息
interface Collaborator {
  userId: string;
  username: string;
  email: string;
  role: CollaboratorRole;
  avatar?: string;
  cursorPosition?: CursorPosition;
  isOnline: boolean;
  joinedAt: string;
  lastActiveAt: string;
}

// 光标位置
interface CursorPosition {
  sectionId: string;
  paragraphIndex: number;
  offset: number;
}

// 编辑操作
type OperationType = 'insert' | 'delete' | 'replace' | 'format';

interface EditOperation {
  id: string;
  userId: string;
  type: OperationType;
  sectionId: string;
  paragraphIndex: number;
  offset: number;
  content?: string;
  length?: number;
  timestamp: string;
  version: number;
}

// 文档版本
interface DocumentVersion {
  version: number;
  operations: EditOperation[];
  snapshot: any;
  createdAt: string;
  createdBy: string;
}

// 评论
interface Comment {
  id: string;
  userId: string;
  username: string;
  sectionId: string;
  paragraphIndex: number;
  offset: number;
  length: number;
  content: string;
  resolved: boolean;
  createdAt: string;
  replies: CommentReply[];
}

interface CommentReply {
  id: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
}

// 项目协作状态
interface ProjectCollaborationState {
  projectId: string;
  collaborators: Map<string, Collaborator>;
  operations: EditOperation[];
  comments: Comment[];
  currentVersion: number;
  versions: DocumentVersion[];
  isLocked: boolean;
  lockedBy?: string;
  lockedAt?: string;
}

// 权限检查
function checkPermission(role: CollaboratorRole, action: string): boolean {
  const permissions: Record<CollaboratorRole, string[]> = {
    owner: ['read', 'write', 'delete', 'invite', 'manage', 'comment', 'resolve'],
    editor: ['read', 'write', 'comment', 'resolve'],
    viewer: ['read', 'comment']
  };

  return permissions[role]?.includes(action) || false;
}

// 协作引擎
export class CollaborationEngine {
  private projects: Map<string, ProjectCollaborationState> = new Map();
  private userConnections: Map<string, WebSocket> = new Map();

  // 初始化项目协作
  initializeProject(projectId: string): ProjectCollaborationState {
    if (!this.projects.has(projectId)) {
      const state: ProjectCollaborationState = {
        projectId,
        collaborators: new Map(),
        operations: [],
        comments: [],
        currentVersion: 0,
        versions: [],
        isLocked: false
      };
      this.projects.set(projectId, state);
      logger.info(`Initialized collaboration for project: ${projectId}`);
    }
    return this.projects.get(projectId)!;
  }

  // 添加协作者
  addCollaborator(
    projectId: string,
    userId: string,
    userInfo: {
      username: string;
      email: string;
      avatar?: string;
    },
    role: CollaboratorRole = 'editor'
  ): boolean {
    const state = this.initializeProject(projectId);

    if (state.collaborators.has(userId)) {
      logger.warn(`User ${userId} is already a collaborator on project ${projectId}`);
      return false;
    }

    const collaborator: Collaborator = {
      userId,
      username: userInfo.username,
      email: userInfo.email,
      avatar: userInfo.avatar,
      role,
      isOnline: false,
      joinedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString()
    };

    state.collaborators.set(userId, collaborator);
    logger.info(`Added collaborator ${userId} to project ${projectId} with role ${role}`);

    this.broadcastToProject(projectId, {
      type: 'collaborator_joined',
      data: { userId, username: userInfo.username, role }
    });

    return true;
  }

  // 移除协作者
  removeCollaborator(projectId: string, userId: string): boolean {
    const state = this.projects.get(projectId);
    if (!state) return false;

    if (state.collaborators.delete(userId)) {
      logger.info(`Removed collaborator ${userId} from project ${projectId}`);

      this.broadcastToProject(projectId, {
        type: 'collaborator_left',
        data: { userId }
      });

      return true;
    }

    return false;
  }

  // 用户上线
  userOnline(projectId: string, userId: string, connection: WebSocket): void {
    const state = this.projects.get(projectId);
    if (!state) return;

    const collaborator = state.collaborators.get(userId);
    if (collaborator) {
      collaborator.isOnline = true;
      collaborator.lastActiveAt = new Date().toISOString();
      this.userConnections.set(userId, connection);

      logger.info(`User ${userId} is now online on project ${projectId}`);

      // 发送当前协作状态给新上线的用户
      this.sendToUser(userId, {
        type: 'collaboration_state',
        data: {
          collaborators: Array.from(state.collaborators.values()),
          comments: state.comments,
          currentVersion: state.currentVersion
        }
      });

      // 通知其他协作者
      this.broadcastToProject(projectId, {
        type: 'user_online',
        data: { userId, username: collaborator.username }
      }, [userId]);
    }
  }

  // 用户离线
  userOffline(projectId: string, userId: string): void {
    const state = this.projects.get(projectId);
    if (!state) return;

    const collaborator = state.collaborators.get(userId);
    if (collaborator) {
      collaborator.isOnline = false;
      collaborator.lastActiveAt = new Date().toISOString();
      this.userConnections.delete(userId);

      logger.info(`User ${userId} is now offline on project ${projectId}`);

      this.broadcastToProject(projectId, {
        type: 'user_offline',
        data: { userId, username: collaborator.username }
      });
    }
  }

  // 更新光标位置
  updateCursorPosition(
    projectId: string,
    userId: string,
    position: CursorPosition
  ): void {
    const state = this.projects.get(projectId);
    if (!state) return;

    const collaborator = state.collaborators.get(userId);
    if (collaborator) {
      collaborator.cursorPosition = position;
      collaborator.lastActiveAt = new Date().toISOString();

      this.broadcastToProject(projectId, {
        type: 'cursor_moved',
        data: { userId, position }
      }, [userId]);
    }
  }

  // 应用编辑操作
  applyOperation(
    projectId: string,
    userId: string,
    operation: Omit<EditOperation, 'id' | 'userId' | 'timestamp' | 'version'>
  ): EditOperation | null {
    const state = this.projects.get(projectId);
    if (!state) return null;

    const collaborator = state.collaborators.get(userId);
    if (!collaborator || !checkPermission(collaborator.role, 'write')) {
      logger.warn(`User ${userId} does not have permission to edit project ${projectId}`);
      return null;
    }

    if (state.isLocked && state.lockedBy !== userId) {
      logger.warn(`Project ${projectId} is locked by ${state.lockedBy}`);
      return null;
    }

    const fullOperation: EditOperation = {
      ...operation,
      id: this.generateOperationId(),
      userId,
      timestamp: new Date().toISOString(),
      version: ++state.currentVersion
    };

    state.operations.push(fullOperation);
    collaborator.lastActiveAt = new Date().toISOString();

    logger.info(`Applied operation ${fullOperation.id} to project ${projectId}`);

    this.broadcastToProject(projectId, {
      type: 'operation_applied',
      data: fullOperation
    }, [userId]);

    return fullOperation;
  }

  // 添加评论
  addComment(
    projectId: string,
    userId: string,
    commentData: Omit<Comment, 'id' | 'userId' | 'username' | 'createdAt' | 'replies' | 'resolved'>
  ): Comment | null {
    const state = this.projects.get(projectId);
    if (!state) return null;

    const collaborator = state.collaborators.get(userId);
    if (!collaborator || !checkPermission(collaborator.role, 'comment')) {
      logger.warn(`User ${userId} does not have permission to comment on project ${projectId}`);
      return null;
    }

    const comment: Comment = {
      ...commentData,
      id: this.generateCommentId(),
      userId,
      username: collaborator.username,
      createdAt: new Date().toISOString(),
      resolved: false,
      replies: []
    };

    state.comments.push(comment);
    collaborator.lastActiveAt = new Date().toISOString();

    logger.info(`Added comment ${comment.id} to project ${projectId}`);

    this.broadcastToProject(projectId, {
      type: 'comment_added',
      data: comment
    });

    return comment;
  }

  // 回复评论
  replyToComment(
    projectId: string,
    userId: string,
    commentId: string,
    content: string
  ): CommentReply | null {
    const state = this.projects.get(projectId);
    if (!state) return null;

    const collaborator = state.collaborators.get(userId);
    if (!collaborator || !checkPermission(collaborator.role, 'comment')) {
      return null;
    }

    const comment = state.comments.find(c => c.id === commentId);
    if (!comment) return null;

    const reply: CommentReply = {
      id: this.generateReplyId(),
      userId,
      username: collaborator.username,
      content,
      createdAt: new Date().toISOString()
    };

    comment.replies.push(reply);
    collaborator.lastActiveAt = new Date().toISOString();

    logger.info(`Added reply ${reply.id} to comment ${commentId}`);

    this.broadcastToProject(projectId, {
      type: 'comment_replied',
      data: { commentId, reply }
    });

    return reply;
  }

  // 解决评论
  resolveComment(projectId: string, userId: string, commentId: string): boolean {
    const state = this.projects.get(projectId);
    if (!state) return false;

    const collaborator = state.collaborators.get(userId);
    if (!collaborator || !checkPermission(collaborator.role, 'resolve')) {
      return false;
    }

    const comment = state.comments.find(c => c.id === commentId);
    if (!comment) return false;

    comment.resolved = true;
    collaborator.lastActiveAt = new Date().toISOString();

    logger.info(`Resolved comment ${commentId} on project ${projectId}`);

    this.broadcastToProject(projectId, {
      type: 'comment_resolved',
      data: { commentId, resolvedBy: userId }
    });

    return true;
  }

  // 锁定项目
  lockProject(projectId: string, userId: string): boolean {
    const state = this.projects.get(projectId);
    if (!state) return false;

    const collaborator = state.collaborators.get(userId);
    if (!collaborator || !checkPermission(collaborator.role, 'manage')) {
      return false;
    }

    if (state.isLocked) {
      return false;
    }

    state.isLocked = true;
    state.lockedBy = userId;
    state.lockedAt = new Date().toISOString();

    logger.info(`Project ${projectId} locked by ${userId}`);

    this.broadcastToProject(projectId, {
      type: 'project_locked',
      data: { lockedBy: userId }
    });

    return true;
  }

  // 解锁项目
  unlockProject(projectId: string, userId: string): boolean {
    const state = this.projects.get(projectId);
    if (!state) return false;

    if (!state.isLocked || state.lockedBy !== userId) {
      return false;
    }

    state.isLocked = false;
    state.lockedBy = undefined;
    state.lockedAt = undefined;

    logger.info(`Project ${projectId} unlocked by ${userId}`);

    this.broadcastToProject(projectId, {
      type: 'project_unlocked',
      data: { unlockedBy: userId }
    });

    return true;
  }

  // 创建版本快照
  createVersionSnapshot(projectId: string, userId: string, snapshot: any): DocumentVersion | null {
    const state = this.projects.get(projectId);
    if (!state) return null;

    const collaborator = state.collaborators.get(userId);
    if (!collaborator || !checkPermission(collaborator.role, 'write')) {
      return null;
    }

    const version: DocumentVersion = {
      version: ++state.currentVersion,
      operations: [...state.operations],
      snapshot,
      createdAt: new Date().toISOString(),
      createdBy: userId
    };

    state.versions.push(version);
    state.operations = []; // 清空操作列表

    logger.info(`Created version ${version.version} for project ${projectId}`);

    this.broadcastToProject(projectId, {
      type: 'version_created',
      data: { version: version.version, createdBy: userId }
    });

    return version;
  }

  // 获取项目协作状态
  getProjectState(projectId: string): ProjectCollaborationState | undefined {
    return this.projects.get(projectId);
  }

  // 获取协作者列表
  getCollaborators(projectId: string): Collaborator[] {
    const state = this.projects.get(projectId);
    if (!state) return [];
    return Array.from(state.collaborators.values());
  }

  // 获取在线协作者
  getOnlineCollaborators(projectId: string): Collaborator[] {
    return this.getCollaborators(projectId).filter(c => c.isOnline);
  }

  // 获取评论列表
  getComments(projectId: string): Comment[] {
    const state = this.projects.get(projectId);
    if (!state) return [];
    return state.comments;
  }

  // 获取版本历史
  getVersionHistory(projectId: string): DocumentVersion[] {
    const state = this.projects.get(projectId);
    if (!state) return [];
    return state.versions;
  }

  // 发送消息给特定用户
  private sendToUser(userId: string, message: any): void {
    const connection = this.userConnections.get(userId);
    if (connection && connection.readyState === WebSocket.OPEN) {
      connection.send(JSON.stringify(message));
    }
  }

  // 广播消息给项目所有协作者
  private broadcastToProject(
    projectId: string,
    message: any,
    excludeUserIds: string[] = []
  ): void {
    const state = this.projects.get(projectId);
    if (!state) return;

    state.collaborators.forEach((collaborator, userId) => {
      if (collaborator.isOnline && !excludeUserIds.includes(userId)) {
        this.sendToUser(userId, message);
      }
    });
  }

  // 生成操作ID
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 生成评论ID
  private generateCommentId(): string {
    return `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 生成回复ID
  private generateReplyId(): string {
    return `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 创建全局协作引擎实例
export const collaborationEngine = new CollaborationEngine();
