import { NextRequest, NextResponse } from 'next/server';

import { authMiddleware, checkPermission } from '@/lib/server/auth-middleware';
import {
  addAuditLog,
  adminGovernanceStore,
  createCustomRole,
  createRoleGroup,
  syncUsersIntoGroups,
  updateCustomRole,
  updateRoleGroup
} from '@/lib/server/admin-governance';
import { rbacManager } from '@/lib/server/rbac';

function requireSystemPermission(authResponse: NextResponse, permission: string) {
  const userType = authResponse.headers.get('X-User-Type') || 'admin';
  const isSuperAdmin = authResponse.headers.get('X-Is-Super-Admin') === 'true';
  const userId = authResponse.headers.get('X-User-Id') || undefined;

  if (!checkPermission(userType, permission, isSuperAdmin, userId)) {
    return NextResponse.json({ ok: false, error: '当前管理员没有这项权限。' }, { status: 403 });
  }

  return null;
}

export async function GET(request: NextRequest) {
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) {
    return authResponse;
  }

  const denied = requireSystemPermission(authResponse, 'system:read');
  if (denied) {
    return denied;
  }

  syncUsersIntoGroups();

  const roles = rbacManager.getRoles().map((role) => {
    const info = rbacManager.getRoleInfo(role);
    return {
      key: role,
      permissions: info?.permissions ?? []
    };
  });

  return NextResponse.json({
    ok: true,
    roleGroups: adminGovernanceStore.roleGroups,
    customRoles: adminGovernanceStore.customRoles,
    baseRoles: roles,
    notes: {
      enforcedNow: '系统基础角色和已分配的附加权限方案，都会立即进入真实权限判断。',
      stagedNext: '下一步重点不是“让它生效”，而是继续补用户组批量分配、权限冲突提示和资源级授权。'
    }
  });
}

export async function POST(request: NextRequest) {
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) {
    return authResponse;
  }

  const denied = requireSystemPermission(authResponse, 'system:update');
  if (denied) {
    return denied;
  }

  const body = await request.json();
  const { type } = body;

  if (type === 'group') {
    const group = createRoleGroup({
      name: body.name,
      description: body.description,
      roles: Array.isArray(body.roles) ? body.roles : [],
      userIds: [],
      scope: body.scope || 'project',
      managedBy: 'admin'
    });

    addAuditLog({
      action: '创建用户组',
      category: '权限',
      severity: '重要',
      actor: 'super_admin',
      target: group.name,
      detail: `新增用户组 ${group.name}，覆盖角色 ${group.roles.join('、') || '未指定'}。`
    });

    return NextResponse.json({ ok: true, group });
  }

  if (type === 'role') {
    const role = createCustomRole({
      name: body.name,
      description: body.description,
      baseRole: body.baseRole,
      extraPermissions: Array.isArray(body.extraPermissions) ? body.extraPermissions : [],
      enabled: Boolean(body.enabled),
      status: body.enabled ? '已启用' : '方案中'
    });

    addAuditLog({
      action: '创建自定义角色方案',
      category: '权限',
      severity: '重要',
      actor: 'super_admin',
      target: role.name,
      detail: `新增自定义角色方案 ${role.name}，基于 ${role.baseRole}。`
    });

    return NextResponse.json({ ok: true, role });
  }

  return NextResponse.json({ ok: false, error: '未知的创建类型。' }, { status: 400 });
}

export async function PATCH(request: NextRequest) {
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) {
    return authResponse;
  }

  const denied = requireSystemPermission(authResponse, 'system:update');
  if (denied) {
    return denied;
  }

  const body = await request.json();
  const { type, id } = body;

  if (!id) {
    return NextResponse.json({ ok: false, error: '缺少对象 ID。' }, { status: 400 });
  }

  if (type === 'group') {
    const group = updateRoleGroup(id, {
      description: body.description,
      roles: Array.isArray(body.roles) ? body.roles : undefined,
      scope: body.scope
    });

    if (!group) {
      return NextResponse.json({ ok: false, error: '用户组不存在。' }, { status: 404 });
    }

    addAuditLog({
      action: '更新用户组',
      category: '权限',
      severity: '提示',
      actor: 'super_admin',
      target: group.name,
      detail: `更新用户组 ${group.name} 的说明、角色或范围。`
    });

    return NextResponse.json({ ok: true, group });
  }

  if (type === 'role') {
    const role = updateCustomRole(id, {
      description: body.description,
      extraPermissions: Array.isArray(body.extraPermissions) ? body.extraPermissions : undefined,
      enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
      status: typeof body.enabled === 'boolean' ? (body.enabled ? '已启用' : '方案中') : undefined
    });

    if (!role) {
      return NextResponse.json({ ok: false, error: '自定义角色不存在。' }, { status: 404 });
    }

    addAuditLog({
      action: '更新自定义角色方案',
      category: '权限',
      severity: '提示',
      actor: 'super_admin',
      target: role.name,
      detail: `更新自定义角色方案 ${role.name} 的额外权限或启用状态。`
    });

    return NextResponse.json({ ok: true, role });
  }

  return NextResponse.json({ ok: false, error: '未知的更新类型。' }, { status: 400 });
}
