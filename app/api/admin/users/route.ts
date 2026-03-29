import { NextRequest, NextResponse } from 'next/server';

import { authMiddleware, checkPermission } from '@/lib/server/auth-middleware';
import { memoryStore, type User } from '@/lib/server/db';
import { rbacManager } from '@/lib/server/rbac';
import {
  addAuditLog,
  adminGovernanceStore,
  assignCustomRolesToUser,
  getAssignedCustomRoleIds,
  getAssignedCustomRoles,
  resolveRoleGroupName,
  syncUsersIntoGroups
} from '@/lib/server/admin-governance';

type ManagedUser = User & {
  isActive?: boolean;
  lastLoginAt?: string | null;
  roleGroup?: string;
  isSuperAdmin?: boolean;
  customRoleIds?: string[];
  customRoleNames?: string[];
};

const SUPER_ADMIN_USER: ManagedUser = {
  id: 'super_admin_001',
  username: 'super_admin',
  email: 'admin@system.com',
  password: '',
  fullName: '超级管理员',
  userType: 'admin',
  institution: '系统管理',
  department: '管理部门',
  createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
  updatedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
  isActive: true,
  lastLoginAt: null,
  roleGroup: '系统管理组',
  isSuperAdmin: true
};

function requireAdmin(authResponse: NextResponse, permission: string) {
  const userType = authResponse.headers.get('X-User-Type') || 'admin';
  const isSuperAdmin = authResponse.headers.get('X-Is-Super-Admin') === 'true';
  const userId = authResponse.headers.get('X-User-Id') || undefined;

  if (!checkPermission(userType, permission, isSuperAdmin, userId)) {
    return NextResponse.json({ ok: false, error: '当前管理员没有这项权限。' }, { status: 403 });
  }

  return null;
}

function resolveRoleGroup(userType: string) {
  if (userType === 'admin') return '系统管理组';
  if (userType === 'advisor' || userType === 'professor') return '学术管理组';
  if (userType === 'associate_professor' || userType === 'lecturer') return '教学研究组';
  return '学生与项目组';
}

function sanitizeUser(user: ManagedUser) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    userType: user.userType,
    institution: user.institution,
    department: user.department,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    isActive: user.isActive ?? true,
    lastLoginAt: user.lastLoginAt ?? null,
    roleGroup: user.roleGroup ?? resolveRoleGroupName(user.userType),
    isSuperAdmin: user.isSuperAdmin ?? false,
    customRoleIds: user.customRoleIds ?? [],
    customRoleNames: user.customRoleNames ?? []
  };
}

export async function GET(request: NextRequest) {
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) {
    return authResponse;
  }

  const denied = requireAdmin(authResponse, 'system:read');
  if (denied) {
    return denied;
  }

  syncUsersIntoGroups();

  const users = [SUPER_ADMIN_USER, ...memoryStore.users.map((user) => ({
    ...user,
    isActive: (user as ManagedUser).isActive ?? true,
    lastLoginAt: (user as ManagedUser).lastLoginAt ?? null,
    roleGroup: (user as ManagedUser).roleGroup ?? resolveRoleGroupName(user.userType),
    customRoleIds: getAssignedCustomRoleIds(user.id),
    customRoleNames: getAssignedCustomRoles(user.id, user.userType).map((role) => role.name)
  }))].map(sanitizeUser);

  const roles = rbacManager.getRoles().map((role) => {
    const info = rbacManager.getRoleInfo(role);
    const permissions = info?.permissions ?? [];
    return {
      key: role,
      label: role,
      userCount: users.filter((user) => user.userType === role).length,
      permissionCount: permissions.length,
      permissions,
      roleGroup: resolveRoleGroupName(role)
    };
  });

  return NextResponse.json({
    ok: true,
    summary: {
      totalUsers: users.length,
      activeUsers: users.filter((user) => user.isActive).length,
      adminUsers: users.filter((user) => user.userType === 'admin').length,
      groupCount: Array.from(new Set(users.map((user) => user.roleGroup))).length
    },
    users,
    roles,
    availableCustomRoles: adminGovernanceStore.customRoles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      baseRole: role.baseRole,
      enabled: role.enabled
    })),
    plannedModules: [
      '用户组管理',
      '权限变更审计',
      '登录风控与禁用策略'
    ]
  });
}

export async function PATCH(request: NextRequest) {
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) {
    return authResponse;
  }

  const denied = requireAdmin(authResponse, 'system:update');
  if (denied) {
    return denied;
  }

  const { userId, userType, isActive, customRoleIds } = await request.json();

  if (!userId) {
    return NextResponse.json({ ok: false, error: '缺少用户 ID。' }, { status: 400 });
  }

  if (userId === SUPER_ADMIN_USER.id) {
    return NextResponse.json({ ok: false, error: '超级管理员为系统保留账号，当前版本不允许直接修改。' }, { status: 400 });
  }

  const user = memoryStore.users.find((item) => item.id === userId) as ManagedUser | undefined;
  if (!user) {
    return NextResponse.json({ ok: false, error: '用户不存在。' }, { status: 404 });
  }

  if (userType) {
    if (!rbacManager.isValidRole(userType)) {
      return NextResponse.json({ ok: false, error: '角色无效。' }, { status: 400 });
    }
    const previousRole = user.userType;
    user.userType = userType;
    user.roleGroup = resolveRoleGroupName(userType);
    const compatibleRoleIds = getAssignedCustomRoleIds(user.id).filter((roleId) => {
      const role = adminGovernanceStore.customRoles.find((item) => item.id === roleId);
      return role?.baseRole === userType;
    });
    assignCustomRolesToUser(user.id, compatibleRoleIds);
    addAuditLog({
      action: '修改用户角色',
      category: '权限',
      severity: '重要',
      actor: 'super_admin',
      target: user.email,
      detail: `将用户角色从 ${previousRole} 调整为 ${userType}。`
    });
  }

  if (typeof isActive === 'boolean') {
    const previousState = user.isActive ?? true;
    user.isActive = isActive;
    if (previousState !== isActive) {
      addAuditLog({
        action: isActive ? '重新启用账号' : '停用账号',
        category: '安全',
        severity: isActive ? '提示' : '重要',
        actor: 'super_admin',
        target: user.email,
        detail: `${isActive ? '恢复' : '停用'}账号 ${user.fullName}。`
      });
    }
  }

  if (Array.isArray(customRoleIds)) {
    const assignedRoleIds = assignCustomRolesToUser(
      user.id,
      customRoleIds.filter(
        (roleId: unknown) =>
          typeof roleId === 'string' &&
          adminGovernanceStore.customRoles.some((role) => role.id === roleId)
      )
    );
    const assignedRoleNames = getAssignedCustomRoles(user.id, user.userType).map((role) => role.name);

    addAuditLog({
      action: '更新附加权限方案',
      category: '权限',
      severity: '提示',
      actor: 'super_admin',
      target: user.email,
      detail:
        assignedRoleNames.length > 0
          ? `为 ${user.fullName} 绑定附加权限方案：${assignedRoleNames.join('、')}。`
          : `清空了 ${user.fullName} 的附加权限方案。`
    });

    user.customRoleIds = assignedRoleIds;
    user.customRoleNames = assignedRoleNames;
  }

  user.updatedAt = new Date().toISOString();

  return NextResponse.json({
    ok: true,
    message: '用户权限已更新。',
    user: sanitizeUser({
      ...user,
      customRoleIds: getAssignedCustomRoleIds(user.id),
      customRoleNames: getAssignedCustomRoles(user.id, user.userType).map((role) => role.name)
    })
  });
}
