import { getSystemDefaultModelStatuses } from "@/lib/ai-status";
import {
  adminGovernanceStore,
  getArchivedProjectIds,
  getArchivedProjects,
  type ArchivedProjectRecord
} from "@/lib/server/admin-governance";
import { memoryStore } from "@/lib/server/db";
import { getAllProjects, type Project } from "@/lib/server/project-db";

type AlertSeverity = "提示" | "重要" | "高风险";

function toTimestamp(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber) && asNumber > 0) {
      return asNumber;
    }

    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return Date.now();
}

function formatRelativeTime(value: unknown) {
  const timestamp = toTimestamp(value);
  const diff = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "刚刚";
  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))} 分钟前`;
  if (diff < day) return `${Math.max(1, Math.floor(diff / hour))} 小时前`;
  return `${Math.max(1, Math.floor(diff / day))} 天前`;
}

function countProjectVersions(projectId: string) {
  return memoryStore.projectVersions.filter((item) => item.projectId === projectId).length;
}

function countProjectReferences(projectId: string) {
  return memoryStore.projectReferences.filter((item) => item.projectId === projectId).length;
}

function summarizeProject(project: Project, archivedRecord?: ArchivedProjectRecord) {
  const versionCount = archivedRecord?.versionCount ?? countProjectVersions(project.id);
  const referenceCount = archivedRecord?.referenceCount ?? countProjectReferences(project.id);

  return {
    id: project.id,
    title: project.title,
    venueId: project.venueId || "未绑定会议",
    updatedAt: formatRelativeTime(archivedRecord?.lastKnownUpdatedAt ?? project.updatedAt),
    versionCount,
    referenceCount,
    archived: Boolean(archivedRecord),
    archiveReason: archivedRecord?.reason ?? null,
    archivedAt: archivedRecord?.archivedAt ?? null
  };
}

export async function buildDataGovernanceSnapshot() {
  const allProjects = await getAllProjects();
  const archivedRecords = getArchivedProjects();
  const archivedIds = getArchivedProjectIds();

  const activeProjects = allProjects
    .filter((project) => !archivedIds.has(project.id))
    .map((project) => summarizeProject(project));

  const archivedProjects = archivedRecords.map((record) =>
    summarizeProject(
      allProjects.find((project) => project.id === record.projectId) ?? {
        id: record.projectId,
        title: record.title,
        createdAt: record.lastKnownUpdatedAt,
        updatedAt: record.lastKnownUpdatedAt,
        venueId: undefined
      },
      record
    )
  );

  const oldThreshold = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const staleProjectCount = activeProjects.filter((project) => {
    const original = allProjects.find((item) => item.id === project.id);
    return toTimestamp(original?.updatedAt) < oldThreshold;
  }).length;

  return {
    summary: {
      activeProjectCount: activeProjects.length,
      archivedProjectCount: archivedProjects.length,
      projectVersionCount: memoryStore.projectVersions.length,
      referenceCount: memoryStore.projectReferences.length,
      staleProjectCount
    },
    activeProjects,
    archivedProjects,
    notes: {
      immediate: [
        "归档项目会从主站项目列表里隐藏，但不会删除正文、版本和文献。",
        "恢复项目后，会重新出现在主站和项目总览页里。"
      ],
      staged: [
        "当前版本先做软归档与恢复，不做不可逆硬删除。",
        "后续可以再接自动备份和跨时间点恢复。"
      ]
    }
  };
}

function buildAlert(
  severity: AlertSeverity,
  title: string,
  detail: string,
  actionLabel: string,
  href: string
) {
  return { severity, title, detail, actionLabel, href };
}

export async function buildRiskAlertsSnapshot() {
  const alerts: Array<ReturnType<typeof buildAlert>> = [];
  const systemModels = await getSystemDefaultModelStatuses();
  const systemConfig = adminGovernanceStore.systemConfig;
  const archivedProjects = getArchivedProjects();
  const enabledCustomRoles = adminGovernanceStore.customRoles.filter((item) => item.enabled).length;
  const inactiveUsers = memoryStore.users.filter((item) => (item as { isActive?: boolean }).isActive === false).length;

  systemModels.forEach((model) => {
    if (!model.status.configured) {
      alerts.push(
        buildAlert(
          "高风险",
          `${model.name} 未配置`,
          `系统预置链路 ${model.name} 还没有有效密钥，相关功能会自动回退或不可用。`,
          "去模型管理",
          "/admin/ai-models"
        )
      );
      return;
    }

    if (!model.status.connected) {
      alerts.push(
        buildAlert(
          "高风险",
          `${model.name} 未连通`,
          `${model.name} 已配置但探测失败，建议先检查密钥、Base URL 或供应商状态。`,
          "去运行诊断",
          "/admin/diagnostics"
        )
      );
      return;
    }

    if ((model.status.latencyMs ?? 0) > 15000) {
      alerts.push(
        buildAlert(
          "重要",
          `${model.name} 延时过高`,
          `${model.name} 当前探测延时约 ${model.status.latencyMs} ms，适合深度分析，但不适合大批量即时生成。`,
          "去模型切换",
          "/admin/ai-module-configs"
        )
      );
    }
  });

  if (!systemConfig.adminAuditEnabled) {
    alerts.push(
      buildAlert(
        "高风险",
        "审计日志已关闭",
        "管理员关键操作不会留下审计记录，后续排查权限或配置问题会失去依据。",
        "去系统配置",
        "/admin/system"
      )
    );
  }

  if (!systemConfig.webSearchEnabled) {
    alerts.push(
      buildAlert(
        "重要",
        "联网搜索被关闭",
        "文献补全、联网搜索和一部分证据检索会受到影响。",
        "去系统配置",
        "/admin/system"
      )
    );
  }

  if (enabledCustomRoles === 0) {
    alerts.push(
      buildAlert(
        "重要",
        "没有启用的附加权限方案",
        "自定义角色授权已接入，但当前没有任何启用中的方案，细粒度授权空间还没真正用起来。",
        "去角色与用户组",
        "/admin/access"
      )
    );
  }

  if (memoryStore.projectReferences.length === 0 && memoryStore.projects.length > 0) {
    alerts.push(
      buildAlert(
        "重要",
        "项目已存在，但证据库为空",
        "系统里已经有项目，但没有沉淀参考文献数据，全文审查时会持续提示证据不足。",
        "去数据治理",
        "/admin/data-governance"
      )
    );
  }

  if (inactiveUsers > 0) {
    alerts.push(
      buildAlert(
        "提示",
        "存在已停用账号",
        `当前有 ${inactiveUsers} 个已停用账号，建议定期确认是否需要恢复或清理权限。`,
        "去用户与权限",
        "/admin/users"
      )
    );
  }

  if (archivedProjects.length > 0) {
    alerts.push(
      buildAlert(
        "提示",
        "已有归档项目待复核",
        `当前有 ${archivedProjects.length} 个项目处于归档状态，建议定期确认是否需要恢复继续推进。`,
        "去数据治理",
        "/admin/data-governance"
      )
    );
  }

  return {
    summary: {
      total: alerts.length,
      highRisk: alerts.filter((item) => item.severity === "高风险").length,
      important: alerts.filter((item) => item.severity === "重要").length,
      hint: alerts.filter((item) => item.severity === "提示").length
    },
    alerts
  };
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return Math.round(values.reduce((sum, current) => sum + current, 0) / values.length);
}

export async function buildCapacitySnapshot() {
  const allProjects = await getAllProjects();
  const archivedIds = getArchivedProjectIds();
  const activeProjects = allProjects.filter((item) => !archivedIds.has(item.id));
  const systemModels = await getSystemDefaultModelStatuses();
  const connectedModels = systemModels.filter((item) => item.status.connected);
  const averageLatency = average(
    connectedModels
      .map((item) => item.status.latencyMs)
      .filter((item): item is number => typeof item === "number")
  );

  const versionsPerProject = activeProjects.length
    ? (memoryStore.projectVersions.length / activeProjects.length).toFixed(1)
    : "0.0";
  const referencesPerProject = activeProjects.length
    ? (memoryStore.projectReferences.length / activeProjects.length).toFixed(1)
    : "0.0";

  return {
    cards: [
      {
        label: "运行中项目",
        value: String(activeProjects.length),
        note: "当前仍在主站列表里的项目。"
      },
      {
        label: "归档项目",
        value: String(getArchivedProjects().length),
        note: "已经隐藏但可恢复的项目。"
      },
      {
        label: "版本快照",
        value: String(memoryStore.projectVersions.length),
        note: "用来回看与恢复写作过程的版本数。"
      },
      {
        label: "文献条目",
        value: String(memoryStore.projectReferences.length),
        note: "当前系统沉淀的参考文献与证据数。"
      }
    ],
    runtime: {
      connectedModelCount: connectedModels.length,
      averageLatencyMs: averageLatency,
      systemModels: systemModels.map((item) => ({
        name: item.name,
        connected: item.status.connected,
        latencyMs: item.status.latencyMs,
        runtimeSelected: item.runtimeSelected
      }))
    },
    dataFootprint: {
      userCount: memoryStore.users.length + 1,
      activeProjectCount: activeProjects.length,
      archivedProjectCount: getArchivedProjects().length,
      versionCount: memoryStore.projectVersions.length,
      referenceCount: memoryStore.projectReferences.length,
      versionsPerProject,
      referencesPerProject
    },
    notes: {
      immediate: [
        "当前页展示的都是本地系统里真实拿得到的容量与运行压力数据。",
        "真实账单和供应商费用还没接入，所以这里先不伪造金额。"
      ],
      staged: [
        "下一步可以继续接模型费用账单、按模块统计成本、按项目统计消耗。"
      ]
    }
  };
}
