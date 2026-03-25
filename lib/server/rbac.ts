// RBAC权限控制系统
// 对标大厂标准：细粒度权限控制、资源级授权

import { logger } from './logger';

// 权限定义
type Permission = 
  // 项目权限
  | 'project:create' | 'project:read' | 'project:update' | 'project:delete' | 'project:share'
  // AI权限
  | 'ai:create' | 'ai:read' | 'ai:update' | 'ai:delete'
  // 用户权限
  | 'user:create' | 'user:read' | 'user:update' | 'user:delete'
  // 系统权限
  | 'system:read' | 'system:update' | 'system:admin';

// 角色定义
type Role = 'student' | 'lecturer' | 'associate_professor' | 'professor' | 'advisor' | 'admin';

// 资源类型
type ResourceType = 'project' | 'user' | 'ai_model' | 'system';

// 权限配置
interface PermissionConfig {
  role: Role;
  permissions: Permission[];
  resourcePermissions?: Record<ResourceType, Permission[]>;
}

// 角色权限映射
const ROLE_PERMISSIONS: Record<Role, PermissionConfig> = {
  student: {
    role: 'student',
    permissions: [
      'project:create', 'project:read', 'project:update',
      'ai:read',
      'user:read', 'user:update'
    ],
    resourcePermissions: {
      project: ['project:create', 'project:read', 'project:update'],
      user: ['user:read', 'user:update'],
      ai_model: ['ai:read'],
      system: []
    }
  },
  
  lecturer: {
    role: 'lecturer',
    permissions: [
      'project:create', 'project:read', 'project:update', 'project:delete', 'project:share',
      'ai:create', 'ai:read', 'ai:update',
      'user:read', 'user:update'
    ],
    resourcePermissions: {
      project: ['project:create', 'project:read', 'project:update', 'project:delete', 'project:share'],
      user: ['user:read', 'user:update'],
      ai_model: ['ai:create', 'ai:read', 'ai:update'],
      system: []
    }
  },
  
  associate_professor: {
    role: 'associate_professor',
    permissions: [
      'project:create', 'project:read', 'project:update', 'project:delete', 'project:share',
      'ai:create', 'ai:read', 'ai:update', 'ai:delete',
      'user:read', 'user:update'
    ],
    resourcePermissions: {
      project: ['project:create', 'project:read', 'project:update', 'project:delete', 'project:share'],
      user: ['user:read', 'user:update'],
      ai_model: ['ai:create', 'ai:read', 'ai:update', 'ai:delete'],
      system: []
    }
  },
  
  professor: {
    role: 'professor',
    permissions: [
      'project:create', 'project:read', 'project:update', 'project:delete', 'project:share',
      'ai:create', 'ai:read', 'ai:update', 'ai:delete',
      'user:create', 'user:read', 'user:update'
    ],
    resourcePermissions: {
      project: ['project:create', 'project:read', 'project:update', 'project:delete', 'project:share'],
      user: ['user:create', 'user:read', 'user:update'],
      ai_model: ['ai:create', 'ai:read', 'ai:update', 'ai:delete'],
      system: []
    }
  },
  
  advisor: {
    role: 'advisor',
    permissions: [
      'project:create', 'project:read', 'project:update', 'project:delete', 'project:share',
      'ai:create', 'ai:read', 'ai:update', 'ai:delete',
      'user:create', 'user:read', 'user:update',
      'system:read'
    ],
    resourcePermissions: {
      project: ['project:create', 'project:read', 'project:update', 'project:delete', 'project:share'],
      user: ['user:create', 'user:read', 'user:update'],
      ai_model: ['ai:create', 'ai:read', 'ai:update', 'ai:delete'],
      system: ['system:read']
    }
  },
  
  admin: {
    role: 'admin',
    permissions: [
      'project:create', 'project:read', 'project:update', 'project:delete', 'project:share',
      'ai:create', 'ai:read', 'ai:update', 'ai:delete',
      'user:create', 'user:read', 'user:update', 'user:delete',
      'system:read', 'system:update', 'system:admin'
    ],
    resourcePermissions: {
      project: ['project:create', 'project:read', 'project:update', 'project:delete', 'project:share'],
      user: ['user:create', 'user:read', 'user:update', 'user:delete'],
      ai_model: ['ai:create', 'ai:read', 'ai:update', 'ai:delete'],
      system: ['system:read', 'system:update', 'system:admin']
    }
  }
};

// 资源所有权检查
interface ResourceOwnership {
  userId: string;
  ownerId: string;
  collaborators?: string[];
}

export class RBACManager {
  // 检查用户是否有权限
  hasPermission(userRole: Role, permission: Permission): boolean {
    const config = ROLE_PERMISSIONS[userRole];
    if (!config) {
      logger.warn(`Unknown role: ${userRole}`);
      return false;
    }
    
    return config.permissions.includes(permission);
  }
  
  // 检查资源权限（考虑所有权）
  hasResourcePermission(
    userId: string,
    userRole: Role,
    permission: Permission,
    resourceType: ResourceType,
    ownership?: ResourceOwnership
  ): boolean {
    // 首先检查角色权限
    if (!this.hasPermission(userRole, permission)) {
      return false;
    }
    
    // 如果是资源所有者，允许所有操作
    if (ownership && ownership.userId === ownership.ownerId) {
      return true;
    }
    
    // 检查是否是协作者
    if (ownership?.collaborators?.includes(userId)) {
      // 协作者只有读写权限，没有删除权限
      if (permission === 'project:delete') {
        return false;
      }
      return true;
    }
    
    // 管理员可以访问所有资源
    if (userRole === 'admin') {
      return true;
    }
    
    return false;
  }
  
  // 获取用户所有权限
  getUserPermissions(userRole: Role): Permission[] {
    const config = ROLE_PERMISSIONS[userRole];
    return config ? [...config.permissions] : [];
  }
  
  // 获取角色列表
  getRoles(): Role[] {
    return Object.keys(ROLE_PERMISSIONS) as Role[];
  }
  
  // 检查角色是否存在
  isValidRole(role: string): role is Role {
    return role in ROLE_PERMISSIONS;
  }
  
  // 获取角色信息
  getRoleInfo(role: Role): PermissionConfig | undefined {
    return ROLE_PERMISSIONS[role];
  }
}

// 创建全局RBAC管理器
export const rbacManager = new RBACManager();

// 便捷函数
export function hasPermission(userRole: Role, permission: Permission): boolean {
  return rbacManager.hasPermission(userRole, permission);
}

export function hasResourcePermission(
  userId: string,
  userRole: Role,
  permission: Permission,
  resourceType: ResourceType,
  ownership?: ResourceOwnership
): boolean {
  return rbacManager.hasResourcePermission(userId, userRole, permission, resourceType, ownership);
}
