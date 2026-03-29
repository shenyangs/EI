"use client";

import { useEffect, useState } from "react";

import { adminFetch } from "@/lib/client/admin-api";

type RoleGroup = {
  id: string;
  name: string;
  description: string;
  roles: string[];
  userIds: string[];
  scope: "system" | "academic" | "project";
  managedBy: "system" | "admin";
};

type CustomRoleTemplate = {
  id: string;
  name: string;
  description: string;
  baseRole: string;
  extraPermissions: string[];
  enabled: boolean;
  status: "已启用" | "方案中";
};

type BaseRole = {
  key: string;
  permissions: string[];
};

const roleLabels: Record<string, string> = {
  student: "学生",
  lecturer: "讲师",
  associate_professor: "副教授",
  professor: "教授",
  advisor: "导师",
  admin: "管理员"
};

export default function AdminAccessPage() {
  const [roleGroups, setRoleGroups] = useState<RoleGroup[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRoleTemplate[]>([]);
  const [baseRoles, setBaseRoles] = useState<BaseRole[]>([]);
  const [notes, setNotes] = useState({ enforcedNow: "", stagedNext: "" });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [creatingRole, setCreatingRole] = useState(false);

  useEffect(() => {
    void fetchAccess();
  }, []);

  async function fetchAccess() {
    setLoading(true);
    try {
      const response = await adminFetch("/api/admin/access");
      if (!response.ok) {
        throw new Error("failed to fetch admin access");
      }

      const data = await response.json();
      setRoleGroups(data.roleGroups || []);
      setCustomRoles(data.customRoles || []);
      setBaseRoles(data.baseRoles || []);
      setNotes(data.notes || { enforcedNow: "", stagedNext: "" });
      setFeedback(null);
    } catch (error) {
      console.error("Failed to fetch admin access:", error);
      setFeedback("角色与用户组暂时没加载出来。通常是超管 token 丢了，或者后台刚重启。");
    } finally {
      setLoading(false);
    }
  }

  async function createGroup() {
    setCreatingGroup(true);
    try {
      const response = await adminFetch("/api/admin/access", {
        method: "POST",
        body: JSON.stringify({
          type: "group",
          name: `新角色组 ${roleGroups.length + 1}`,
          description: "请补充这个角色组负责什么。",
          roles: ["student"],
          scope: "project"
        })
      });
      if (!response.ok) {
        throw new Error("create group failed");
      }
      await fetchAccess();
      setFeedback("已经新增一个角色组占位。你可以继续改它的说明和覆盖角色。");
    } catch (error) {
      console.error(error);
      setFeedback("新建角色组失败了。");
    } finally {
      setCreatingGroup(false);
    }
  }

  async function createRoleTemplate() {
    setCreatingRole(true);
    try {
      const response = await adminFetch("/api/admin/access", {
        method: "POST",
        body: JSON.stringify({
          type: "role",
          name: `新权限方案 ${customRoles.length + 1}`,
          description: "请补充这个权限方案的使用场景。",
          baseRole: "advisor",
          extraPermissions: ["system:read"],
          enabled: false
        })
      });
      if (!response.ok) {
        throw new Error("create role failed");
      }
      await fetchAccess();
      setFeedback("已经新增一个自定义角色方案。只要启用并分配给具体账号，它就会进入真实权限判断。");
    } catch (error) {
      console.error(error);
      setFeedback("新建自定义角色方案失败了。");
    } finally {
      setCreatingRole(false);
    }
  }

  async function toggleCustomRole(role: CustomRoleTemplate) {
    try {
      const response = await adminFetch("/api/admin/access", {
        method: "PATCH",
        body: JSON.stringify({
          type: "role",
          id: role.id,
          enabled: !role.enabled
        })
      });
      if (!response.ok) {
        throw new Error("toggle role failed");
      }
      await fetchAccess();
      setFeedback(`已更新权限方案“${role.name}”的启用状态。`);
    } catch (error) {
      console.error(error);
      setFeedback("更新权限方案失败了。");
    }
  }

  return (
    <div className="atelier-admin-overview">
      {feedback ? <section className="atelier-admin-note">{feedback}</section> : null}

      <section className="atelier-admin-grid">
        <section className="content-card atelier-admin-list-card">
          <div className="atelier-panel__head atelier-panel__head--stack">
            <span className="atelier-kicker">角色与用户组</span>
            <h2>先把系统里的“人群”和“职责范围”搭清楚</h2>
            <p>{notes.enforcedNow}</p>
          </div>

          <div className="atelier-admin-actions">
            <button type="button" className="atelier-button atelier-button--ghost" onClick={createGroup} disabled={creatingGroup}>
              {creatingGroup ? "新建中..." : "新增用户组"}
            </button>
          </div>

          {loading ? (
            <div className="atelier-admin-empty">角色组加载中...</div>
          ) : (
            <div className="atelier-admin-role-list">
              {roleGroups.map((group) => (
                <article key={group.id} className="atelier-admin-role-card">
                  <div>
                    <strong>{group.name}</strong>
                    <span>{group.description}</span>
                    <small>
                      覆盖角色：{group.roles.map((role) => roleLabels[role] || role).join("、")} / 用户 {group.userIds.length} 人
                    </small>
                  </div>
                  <span className="atelier-admin-badge atelier-admin-badge--quiet">{group.scope}</span>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="atelier-admin-hero__rail">
          <section className="content-card atelier-admin-guide-card">
            <div className="atelier-panel__head atelier-panel__head--stack">
              <span className="atelier-kicker">基础角色</span>
              <h2>当前真正生效的系统角色</h2>
            </div>
            <div className="atelier-admin-role-list">
              {baseRoles.map((role) => (
                <article key={role.key} className="atelier-admin-role-card">
                  <div>
                    <strong>{roleLabels[role.key] || role.key}</strong>
                    <span>{role.permissions.slice(0, 4).join("、")}</span>
                  </div>
                  <small>{role.permissions.length} 项权限</small>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </section>

      <section className="atelier-admin-grid">
        <section className="content-card atelier-admin-list-card">
            <div className="atelier-panel__head atelier-panel__head--stack">
              <span className="atelier-kicker">自定义角色方案</span>
              <h2>这块现在已经是真授权，不再只是模板</h2>
              <p>{notes.stagedNext}</p>
            </div>
          <div className="atelier-admin-actions">
            <button type="button" className="atelier-button atelier-button--ghost" onClick={createRoleTemplate} disabled={creatingRole}>
              {creatingRole ? "新建中..." : "新增权限方案"}
            </button>
          </div>
          <div className="atelier-admin-role-list">
            {customRoles.map((role) => (
              <article key={role.id} className="atelier-admin-role-card">
                <div>
                  <strong>{role.name}</strong>
                  <span>{role.description}</span>
                  <small>基于 {roleLabels[role.baseRole] || role.baseRole}，补充 {role.extraPermissions.join("、") || "暂无额外权限"}</small>
                </div>
                <button type="button" className="atelier-button atelier-button--ghost" onClick={() => void toggleCustomRole(role)}>
                  {role.enabled ? "暂停方案" : "启用方案"}
                </button>
              </article>
            ))}
          </div>
        </section>

        <aside className="atelier-admin-hero__rail">
          <section className="content-card atelier-admin-guide-card">
            <div className="atelier-panel__head atelier-panel__head--stack">
              <span className="atelier-kicker">设计原则</span>
              <h2>这页为什么要分成两层</h2>
            </div>
            <ul className="atelier-bullets">
              <li>第一层是当前真正生效的系统角色，直接影响权限判断。</li>
              <li>第二层是附加权限方案，启用并分配给用户后，会立刻进入真实权限判断。</li>
              <li>这样既保留基础角色的稳定性，也给系统留下了更细粒度的授权空间。</li>
            </ul>
          </section>
        </aside>
      </section>
    </div>
  );
}
