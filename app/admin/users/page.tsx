"use client";

import { useEffect, useMemo, useState } from "react";

import { adminFetch } from "@/lib/client/admin-api";

type ManagedUser = {
  id: string;
  username: string;
  email: string;
  fullName: string;
  userType: string;
  institution: string;
  department: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  lastLoginAt: string | null;
  roleGroup: string;
  isSuperAdmin: boolean;
  customRoleIds: string[];
  customRoleNames: string[];
};

type RoleSummary = {
  key: string;
  label: string;
  userCount: number;
  permissionCount: number;
  permissions: string[];
  roleGroup: string;
};

type AssignableCustomRole = {
  id: string;
  name: string;
  description: string;
  baseRole: string;
  enabled: boolean;
};

const roleLabels: Record<string, string> = {
  student: "学生",
  lecturer: "讲师",
  associate_professor: "副教授",
  professor: "教授",
  advisor: "导师",
  admin: "管理员"
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [availableCustomRoles, setAvailableCustomRoles] = useState<AssignableCustomRole[]>([]);
  const [plannedModules, setPlannedModules] = useState<string[]>([]);
  const [summary, setSummary] = useState({ totalUsers: 0, activeUsers: 0, adminUsers: 0, groupCount: 0 });
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  useEffect(() => {
    void fetchUsers();
  }, []);

  const groups = useMemo(() => {
    return Array.from(new Set(users.map((user) => user.roleGroup)));
  }, [users]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const response = await adminFetch('/api/admin/users');
      if (!response.ok) {
        throw new Error('failed to fetch admin users');
      }

      const data = await response.json();
      setUsers(Array.isArray(data.users) ? data.users : []);
      setRoles(Array.isArray(data.roles) ? data.roles : []);
      setAvailableCustomRoles(Array.isArray(data.availableCustomRoles) ? data.availableCustomRoles : []);
      setPlannedModules(Array.isArray(data.plannedModules) ? data.plannedModules : []);
      setSummary(data.summary || { totalUsers: 0, activeUsers: 0, adminUsers: 0, groupCount: 0 });
      setFeedback(null);
    } catch (error) {
      console.error('Failed to fetch admin users:', error);
      setFeedback('用户与权限数据暂时没加载出来。现在先别怀疑你点错了，更多可能是本地 token 或接口没返回。');
    } finally {
      setLoading(false);
    }
  }

  async function updateUser(userId: string, patch: { userType?: string; isActive?: boolean; customRoleIds?: string[] }) {
    setSavingUserId(userId);
    try {
      const response = await adminFetch('/api/admin/users', {
        method: 'PATCH',
        body: JSON.stringify({ userId, ...patch })
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'update failed');
      }

      await fetchUsers();
      setFeedback(data.message || '用户权限已更新。');
    } catch (error) {
      console.error('Failed to update user:', error);
      setFeedback('更新失败了。最常见的原因是当前超管 token 没带上，或者这位用户是系统保留账号。');
    } finally {
      setSavingUserId(null);
    }
  }

  return (
    <div className="atelier-admin-overview">
      <section className="atelier-admin-grid atelier-admin-grid--notes">
        <article className="content-card atelier-admin-stat-card">
          <span className="atelier-kicker">账号总数</span>
          <strong>{summary.totalUsers} 个</strong>
          <p>包括系统保留的超级管理员账号。</p>
        </article>
        <article className="content-card atelier-admin-stat-card">
          <span className="atelier-kicker">启用中的账号</span>
          <strong>{summary.activeUsers} 个</strong>
          <p>如果后续要做风控，这里就是第一层总览。</p>
        </article>
        <article className="content-card atelier-admin-stat-card">
          <span className="atelier-kicker">管理角色</span>
          <strong>{summary.adminUsers} 个</strong>
          <p>这里只统计 `admin` 角色，不含系统保留超管。</p>
        </article>
        <article className="content-card atelier-admin-stat-card">
          <span className="atelier-kicker">角色组</span>
          <strong>{summary.groupCount} 组</strong>
          <p>现在已经能看到角色组和附加权限方案，后面继续补批量分配和冲突提示。</p>
        </article>
      </section>

      {feedback ? <section className="atelier-admin-note">{feedback}</section> : null}

      <section className="atelier-admin-grid">
        <section className="content-card atelier-admin-list-card">
          <div className="atelier-panel__head atelier-panel__head--stack">
            <span className="atelier-kicker">用户与身份</span>
            <h2>先把谁能做什么看清楚</h2>
            <p>这张表先解决两个最实际的问题：系统里有哪些账号，以及他们当前分别拥有什么角色。</p>
          </div>

          {loading ? (
            <div className="atelier-admin-empty">用户列表加载中...</div>
          ) : (
            <div className="atelier-admin-user-table">
              <div className="atelier-admin-user-table__head">
                <span>用户</span>
                <span>角色</span>
                <span>角色组</span>
                <span>状态</span>
                <span>操作</span>
              </div>
              {users.map((user) => (
                <article key={user.id} className="atelier-admin-user-row">
                  <div className="atelier-admin-user-row__identity">
                    <strong>{user.fullName}</strong>
                    <span>{user.email}</span>
                    <small>{user.institution} / {user.department}</small>
                  </div>

                  <div className="atelier-admin-user-row__meta">
                    <strong>{roleLabels[user.userType] || user.userType}</strong>
                    <span>{user.isSuperAdmin ? '系统保留账号' : user.customRoleNames.length > 0 ? `附加方案：${user.customRoleNames.join('、')}` : '普通账号'}</span>
                  </div>

                  <div className="atelier-admin-user-row__meta">
                    <strong>{user.roleGroup}</strong>
                    <span>{user.lastLoginAt ? `最近登录 ${new Date(user.lastLoginAt).toLocaleDateString('zh-CN')}` : '尚无登录记录'}</span>
                  </div>

                  <div className="atelier-admin-user-row__meta">
                    <strong>{user.isActive ? '已启用' : '已停用'}</strong>
                    <span>{new Date(user.updatedAt).toLocaleDateString('zh-CN')} 更新</span>
                  </div>

                  <div className="atelier-admin-user-row__actions">
                    {user.isSuperAdmin ? (
                      <span className="atelier-admin-badge">系统保留</span>
                    ) : (
                      <>
                        <label className="atelier-admin-field atelier-admin-field--select">
                          <span>切换角色</span>
                          <select
                            value={user.userType}
                            onChange={(event) => {
                              void updateUser(user.id, { userType: event.target.value });
                            }}
                            disabled={savingUserId === user.id}
                          >
                            {Object.entries(roleLabels).map(([key, label]) => (
                              <option key={key} value={key}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          className="atelier-button atelier-button--ghost"
                          onClick={() => {
                            void updateUser(user.id, { isActive: !user.isActive });
                          }}
                          disabled={savingUserId === user.id}
                        >
                          {savingUserId === user.id ? '处理中...' : user.isActive ? '停用账号' : '重新启用'}
                        </button>
                        <div className="atelier-admin-inline-section">
                          <span>附加权限方案</span>
                          <div className="atelier-admin-chip-list">
                            {availableCustomRoles
                              .filter((role) => role.enabled && role.baseRole === user.userType)
                              .map((role) => {
                                const selected = user.customRoleIds.includes(role.id);
                                const nextIds = selected
                                  ? user.customRoleIds.filter((id) => id !== role.id)
                                  : [...user.customRoleIds, role.id];

                                return (
                                  <button
                                    key={role.id}
                                    type="button"
                                    className={selected ? "atelier-admin-badge atelier-admin-badge--active" : "atelier-admin-badge atelier-admin-badge--quiet"}
                                    onClick={() => {
                                      void updateUser(user.id, { customRoleIds: nextIds });
                                    }}
                                    disabled={savingUserId === user.id}
                                    title={role.description}
                                  >
                                    {role.name}
                                  </button>
                                );
                              })}
                            {availableCustomRoles.filter((role) => role.enabled && role.baseRole === user.userType).length === 0 ? (
                              <span className="atelier-admin-badge atelier-admin-badge--quiet">当前角色没有可分配方案</span>
                            ) : null}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="atelier-admin-hero__rail">
          <section className="content-card atelier-admin-guide-card">
            <div className="atelier-panel__head atelier-panel__head--stack">
              <span className="atelier-kicker">角色与权限</span>
              <h2>当前系统有哪些角色</h2>
            </div>
            <div className="atelier-admin-role-list">
              {roles.map((role) => (
                <article key={role.key} className="atelier-admin-role-card">
                  <div>
                    <strong>{roleLabels[role.key] || role.key}</strong>
                    <span>{role.roleGroup}</span>
                  </div>
                  <small>{role.userCount} 人 / {role.permissionCount} 项权限</small>
                </article>
              ))}
            </div>
          </section>

          <section className="content-card atelier-admin-guide-card">
            <div className="atelier-panel__head atelier-panel__head--stack">
              <span className="atelier-kicker">继续扩展</span>
              <h2>这页已经不只是在“改角色”</h2>
            </div>
            <ul className="atelier-bullets">
              {plannedModules.map((item) => (
              <li key={item}>{item}</li>
            ))}
              <li>附加权限方案现在已经能直接分配给具体账号，并且会进入真实权限判断。</li>
            </ul>
            <div className="atelier-admin-chip-list">
              {groups.map((group) => (
                <span key={group} className="atelier-admin-badge atelier-admin-badge--quiet">
                  {group}
                </span>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
