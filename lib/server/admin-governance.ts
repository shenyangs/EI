import { memoryStore } from '@/lib/server/db';
import { rbacManager } from '@/lib/server/rbac';

export type RoleGroup = {
  id: string;
  name: string;
  description: string;
  roles: string[];
  userIds: string[];
  scope: 'system' | 'academic' | 'project';
  managedBy: 'system' | 'admin';
};

export type CustomRoleTemplate = {
  id: string;
  name: string;
  description: string;
  baseRole: string;
  extraPermissions: string[];
  enabled: boolean;
  status: '已启用' | '方案中';
};

export type SystemConfig = {
  allowRegistration: boolean;
  defaultPaperType: string;
  defaultVenuePolicy: string;
  webSearchEnabled: boolean;
  aiAutoFillEnabled: boolean;
  adminAuditEnabled: boolean;
  featureFlags: Array<{
    key: string;
    label: string;
    enabled: boolean;
    note: string;
  }>;
};

export type PublicSystemRuntime = {
  allowRegistration: boolean;
  webSearchEnabled: boolean;
  aiAutoFillEnabled: boolean;
  autoReferenceAssist: boolean;
};

export type AuditLog = {
  id: string;
  action: string;
  category: '权限' | '系统' | 'AI' | '安全';
  severity: '提示' | '重要' | '高风险';
  actor: string;
  target: string;
  detail: string;
  createdAt: string;
};

export type ArchivedProjectRecord = {
  projectId: string;
  title: string;
  reason: string;
  archivedAt: string;
  archivedBy: string;
  lastKnownUpdatedAt: number;
  versionCount: number;
  referenceCount: number;
};

type GovernanceStore = {
  roleGroups: RoleGroup[];
  customRoles: CustomRoleTemplate[];
  customRoleAssignments: Record<string, string[]>;
  systemConfig: SystemConfig;
  auditLogs: AuditLog[];
  archivedProjects: ArchivedProjectRecord[];
};

function createDefaultRoleGroups(): RoleGroup[] {
  return [
    {
      id: 'group-system-admin',
      name: '系统管理组',
      description: '负责系统配置、AI 能力、权限调整和全局诊断。',
      roles: ['admin'],
      userIds: ['super_admin_001'],
      scope: 'system',
      managedBy: 'system'
    },
    {
      id: 'group-academic-admin',
      name: '学术管理组',
      description: '负责论文规范、课程指导和学术质量判断。',
      roles: ['advisor', 'professor'],
      userIds: [],
      scope: 'academic',
      managedBy: 'admin'
    },
    {
      id: 'group-teaching-research',
      name: '教学研究组',
      description: '负责题型选择、结构建议与中间过程指导。',
      roles: ['associate_professor', 'lecturer'],
      userIds: [],
      scope: 'academic',
      managedBy: 'admin'
    },
    {
      id: 'group-project-members',
      name: '学生与项目组',
      description: '负责具体论文项目执行与写作推进。',
      roles: ['student'],
      userIds: [],
      scope: 'project',
      managedBy: 'admin'
    }
  ];
}

function createDefaultCustomRoles(): CustomRoleTemplate[] {
  return [
    {
      id: 'role-academic-reviewer',
      name: '学术审稿管理员',
      description: '在保留教师身份的前提下，额外具备质量门审核与导出终审权限。',
      baseRole: 'advisor',
      extraPermissions: ['project:share', 'system:read'],
      enabled: true,
      status: '已启用'
    },
    {
      id: 'role-ops-observer',
      name: '运行观察员',
      description: '只允许看运行状态、日志和诊断，不允许改系统配置。',
      baseRole: 'professor',
      extraPermissions: ['system:read'],
      enabled: false,
      status: '方案中'
    }
  ];
}

function createDefaultSystemConfig(): SystemConfig {
  return {
    allowRegistration: true,
    defaultPaperType: 'ei-conference',
    defaultVenuePolicy: 'IEEE 通用规则',
    webSearchEnabled: true,
    aiAutoFillEnabled: true,
    adminAuditEnabled: true,
    featureFlags: [
      {
        key: 'adminDiagnostics',
        label: '超管运行诊断',
        enabled: true,
        note: '决定是否展示超管的运行诊断页。'
      },
      {
        key: 'autoReferenceAssist',
        label: '自动补参考文献',
        enabled: true,
        note: '允许 AI 联网先搜候选文献，再交给用户确认。'
      },
      {
        key: 'systemRegistration',
        label: '公开注册入口',
        enabled: true,
        note: '控制登录页是否向外展示注册入口。'
      }
    ]
  };
}

function createDefaultAuditLogs(): AuditLog[] {
  return [
    {
      id: 'audit-bootstrap-1',
      action: '初始化超级管理员后台',
      category: '系统',
      severity: '提示',
      actor: 'system',
      target: 'admin-shell',
      detail: '超级管理员后台骨架与诊断能力已经启用。',
      createdAt: new Date('2026-03-29T18:30:00.000+08:00').toISOString()
    }
  ];
}

function createGovernanceStore(): GovernanceStore {
  return {
    roleGroups: createDefaultRoleGroups(),
    customRoles: createDefaultCustomRoles(),
    customRoleAssignments: {},
    systemConfig: createDefaultSystemConfig(),
    auditLogs: createDefaultAuditLogs(),
    archivedProjects: []
  };
}

declare global {
  var __EI_ADMIN_GOVERNANCE_STORE__: GovernanceStore | undefined;
}

export const adminGovernanceStore: GovernanceStore =
  globalThis.__EI_ADMIN_GOVERNANCE_STORE__ || createGovernanceStore();

if (!globalThis.__EI_ADMIN_GOVERNANCE_STORE__) {
  globalThis.__EI_ADMIN_GOVERNANCE_STORE__ = adminGovernanceStore;
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function resolveRoleGroupName(userType: string): string {
  const matchedGroup = adminGovernanceStore.roleGroups.find((group) => group.roles.includes(userType));
  return matchedGroup?.name || '未分组';
}

export function syncUsersIntoGroups() {
  const users = memoryStore.users;

  adminGovernanceStore.roleGroups.forEach((group) => {
    if (group.managedBy === 'system') {
      group.userIds = Array.from(new Set([...group.userIds, 'super_admin_001']));
      return;
    }

    group.userIds = users
      .filter((user) => group.roles.includes(user.userType))
      .map((user) => user.id);
  });
}

export function addAuditLog(entry: Omit<AuditLog, 'id' | 'createdAt'>) {
  if (!adminGovernanceStore.systemConfig.adminAuditEnabled) {
    return;
  }

  adminGovernanceStore.auditLogs.unshift({
    ...entry,
    id: createId('audit'),
    createdAt: new Date().toISOString()
  });

  adminGovernanceStore.auditLogs = adminGovernanceStore.auditLogs.slice(0, 200);
}

export function updateRoleGroup(groupId: string, patch: Partial<Omit<RoleGroup, 'id'>>) {
  const group = adminGovernanceStore.roleGroups.find((item) => item.id === groupId);
  if (!group) {
    return null;
  }

  Object.assign(group, patch);
  return group;
}

export function createRoleGroup(input: Omit<RoleGroup, 'id'>) {
  const group: RoleGroup = {
    ...input,
    id: createId('group')
  };
  adminGovernanceStore.roleGroups.push(group);
  return group;
}

export function updateCustomRole(roleId: string, patch: Partial<Omit<CustomRoleTemplate, 'id'>>) {
  const role = adminGovernanceStore.customRoles.find((item) => item.id === roleId);
  if (!role) {
    return null;
  }

  Object.assign(role, patch);
  return role;
}

export function createCustomRole(input: Omit<CustomRoleTemplate, 'id'>) {
  const role: CustomRoleTemplate = {
    ...input,
    id: createId('role')
  };
  adminGovernanceStore.customRoles.push(role);
  return role;
}

export function getPublicSystemRuntime(): PublicSystemRuntime {
  const registrationFlag = adminGovernanceStore.systemConfig.featureFlags.find((flag) => flag.key === 'systemRegistration');
  const autoReferenceFlag = adminGovernanceStore.systemConfig.featureFlags.find((flag) => flag.key === 'autoReferenceAssist');

  return {
    allowRegistration: adminGovernanceStore.systemConfig.allowRegistration && (registrationFlag?.enabled ?? true),
    webSearchEnabled: adminGovernanceStore.systemConfig.webSearchEnabled,
    aiAutoFillEnabled: adminGovernanceStore.systemConfig.aiAutoFillEnabled,
    autoReferenceAssist: autoReferenceFlag?.enabled ?? true
  };
}

export function getAssignedCustomRoleIds(userId: string) {
  return adminGovernanceStore.customRoleAssignments[userId] ?? [];
}

export function getAssignedCustomRoles(userId: string, userType: string) {
  const assignedRoleIds = getAssignedCustomRoleIds(userId);

  return assignedRoleIds
    .map((roleId) => adminGovernanceStore.customRoles.find((role) => role.id === roleId))
    .filter((role): role is CustomRoleTemplate => Boolean(role))
    .filter((role) => role.enabled && role.baseRole === userType);
}

export function assignCustomRolesToUser(userId: string, roleIds: string[]) {
  const uniqueRoleIds = Array.from(new Set(roleIds.filter(Boolean)));
  adminGovernanceStore.customRoleAssignments[userId] = uniqueRoleIds;
  return uniqueRoleIds;
}

export function getArchivedProjects() {
  return [...adminGovernanceStore.archivedProjects].sort(
    (left, right) => new Date(right.archivedAt).getTime() - new Date(left.archivedAt).getTime()
  );
}

export function getArchivedProjectIds() {
  return new Set(adminGovernanceStore.archivedProjects.map((item) => item.projectId));
}

export function isProjectArchived(projectId: string) {
  return adminGovernanceStore.archivedProjects.some((item) => item.projectId === projectId);
}

export function archiveProjectRecord(input: ArchivedProjectRecord) {
  const existing = adminGovernanceStore.archivedProjects.find((item) => item.projectId === input.projectId);

  if (existing) {
    Object.assign(existing, input);
    return existing;
  }

  adminGovernanceStore.archivedProjects.unshift(input);
  return input;
}

export function restoreArchivedProject(projectId: string) {
  const index = adminGovernanceStore.archivedProjects.findIndex((item) => item.projectId === projectId);
  if (index < 0) {
    return null;
  }

  const [record] = adminGovernanceStore.archivedProjects.splice(index, 1);
  return record;
}

export function getEffectivePermissions(userId: string | undefined, userType: string) {
  const basePermissions = rbacManager.isValidRole(userType)
    ? rbacManager.getUserPermissions(userType)
    : [];

  if (!userId) {
    return basePermissions;
  }

  const customRolePermissions = getAssignedCustomRoles(userId, userType)
    .flatMap((role) => role.extraPermissions);

  return Array.from(new Set([...basePermissions, ...customRolePermissions]));
}

export function hasEffectivePermission(
  userId: string | undefined,
  userType: string,
  requiredPermission: string,
  isSuperAdmin = false
) {
  if (isSuperAdmin) {
    return true;
  }

  return getEffectivePermissions(userId, userType).includes(requiredPermission);
}

export function updateSystemConfig(patch: Partial<SystemConfig>) {
  const currentFlags = adminGovernanceStore.systemConfig.featureFlags;
  const syncedFlags = currentFlags.map((flag) => {
    if (flag.key === 'systemRegistration' && typeof patch.allowRegistration === 'boolean') {
      return {
        ...flag,
        enabled: patch.allowRegistration
      };
    }

    return flag;
  });

  adminGovernanceStore.systemConfig = {
    ...adminGovernanceStore.systemConfig,
    ...patch,
    featureFlags: patch.featureFlags ?? syncedFlags
  };

  return adminGovernanceStore.systemConfig;
}
