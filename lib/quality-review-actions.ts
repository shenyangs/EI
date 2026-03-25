import type { QualityCheckLevel } from "@/lib/quality-check";
import { buildVenueHref } from "@/lib/venue-profiles";

export type ReviewActionScope = "outline" | "chapter" | "fulltext";

export type ReviewActionContext = {
  scope: ReviewActionScope;
  projectId: string;
  venueId?: string | null;
  activeChapterId?: string;
  sections?: Array<{
    id: string;
    title: string;
  }>;
};

export type ReviewIssue = {
  dimension: string;
  detail: string;
  level: QualityCheckLevel;
};

export type ReviewAction = {
  href: string;
  label: string;
  reason: string;
};

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function normalizeIssueText(issue: Pick<ReviewIssue, "dimension" | "detail">) {
  return `${issue.dimension} ${issue.detail}`.toLowerCase();
}

function buildProjectHref(
  context: ReviewActionContext,
  pathname: string,
  options?: {
    hash?: string;
    query?: Record<string, string | undefined>;
  }
) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(options?.query ?? {})) {
    if (value) {
      search.set(key, value);
    }
  }

  const href = search.size > 0 ? `${pathname}?${search.toString()}` : pathname;
  const hrefWithHash = options?.hash ? `${href}#${options.hash}` : href;

  return buildVenueHref(hrefWithHash, context.venueId);
}

function severityRank(level: QualityCheckLevel) {
  if (level === "必须修改") {
    return 2;
  }

  if (level === "建议修改") {
    return 1;
  }

  return 0;
}

function inferChapterId(issue: ReviewIssue, context: ReviewActionContext) {
  if (context.activeChapterId) {
    return context.activeChapterId;
  }

  const sections = context.sections ?? [];
  const availableIds = new Set(sections.map((section) => section.id));
  const text = normalizeIssueText(issue);

  const explicitSection = sections.find(
    (section) => text.includes(section.id.toLowerCase()) || text.includes(section.title.toLowerCase())
  );

  if (explicitSection) {
    return explicitSection.id;
  }

  const chapterRules = [
    {
      id: "test",
      keywords: ["用户测试", "测试", "实验", "样本", "量表", "评价", "反馈", "量化", "结果", "可信度"]
    },
    {
      id: "method",
      keywords: ["方法", "技术", "原型", "实现", "模块", "架构", "导电纤维", "传感", "交互机制"]
    },
    {
      id: "related",
      keywords: ["相关研究", "理论基础", "文献", "引用", "综述", "理论"]
    },
    {
      id: "intro",
      keywords: ["引言", "背景", "研究问题", "贡献", "缺口"]
    },
    {
      id: "conclusion",
      keywords: ["结论", "未来工作", "局限", "贡献总结"]
    }
  ];

  for (const rule of chapterRules) {
    if ((availableIds.size === 0 || availableIds.has(rule.id)) && includesAny(text, rule.keywords)) {
      return rule.id;
    }
  }

  if (includesAny(text, ["长度", "篇幅", "字数"]) && availableIds.has("method")) {
    return "method";
  }

  if (includesAny(text, ["证据", "实验", "测试", "样本", "结果"]) && availableIds.has("test")) {
    return "test";
  }

  return sections[0]?.id;
}

function isLengthIssue(issue: ReviewIssue) {
  return includesAny(normalizeIssueText(issue), ["长度", "字数", "篇幅"]);
}

function isStructureIssue(issue: ReviewIssue) {
  return includesAny(normalizeIssueText(issue), ["结构", "框架", "章节"]);
}

function isEvidenceIssue(issue: ReviewIssue) {
  return includesAny(normalizeIssueText(issue), [
    "证据",
    "可信度",
    "实验",
    "测试",
    "样本",
    "量化",
    "数据",
    "指标",
    "引用",
    "文献",
    "参数"
  ]);
}

function isLanguageIssue(issue: ReviewIssue) {
  return includesAny(normalizeIssueText(issue), ["学术表达", "表述", "措辞", "术语", "口吻", "空泛"]);
}

function isVenueIssue(issue: ReviewIssue) {
  return includesAny(normalizeIssueText(issue), ["会议适配", "会议要求", "模板", "投稿", "期刊"]);
}

function labelWithoutPrefix(label: string) {
  return label.replace(/^去/, "");
}

function labelForIssue(issue: ReviewIssue, scope: ReviewActionScope) {
  const text = normalizeIssueText(issue);

  if (includesAny(text, ["样本来源", "样本量", "受试者", "招募", "筛选"])) {
    return "去补样本说明";
  }

  if (includesAny(text, ["引用", "文献"])) {
    return includesAny(text, ["相关研究", "理论基础", "综述"])
      ? "去补相关研究引用"
      : "去补参考文献";
  }

  if (includesAny(text, ["测试流程", "测试任务", "测试设计", "量表", "评价维度"])) {
    return "去补测试设计";
  }

  if (includesAny(text, ["量化", "数据", "指标", "统计"])) {
    return "去补量化数据";
  }

  if (includesAny(text, ["结果分析", "结果讨论"])) {
    return "去补结果分析";
  }

  if (includesAny(text, ["参数", "型号", "材料"])) {
    return "去补技术参数";
  }

  if (includesAny(text, ["原型", "架构图", "流程图", "图示"])) {
    return "去补原型与图示";
  }

  if (includesAny(text, ["标题", "摘要", "关键词"])) {
    return "去改标题摘要";
  }

  if (isStructureIssue(issue)) {
    return scope === "fulltext" ? "去调整章节结构" : "去调整框架结构";
  }

  if (isEvidenceIssue(issue)) {
    if (includesAny(text, ["实验", "测试"])) {
      return "去补实验说明";
    }

    return scope === "chapter" ? "去补本章证据" : "去补证据支撑";
  }

  if (isLengthIssue(issue)) {
    return scope === "outline" ? "去补标题摘要信息" : "去扩写正文篇幅";
  }

  if (isLanguageIssue(issue)) {
    return includesAny(text, ["空泛"]) ? "去写得更具体" : "去收紧学术表达";
  }

  if (isVenueIssue(issue)) {
    return "去对齐会议要求";
  }

  return "去处理这一项";
}

function chapterAnchorForIssue(issue: ReviewIssue) {
  if (isEvidenceIssue(issue)) {
    return "chapter-evidence";
  }

  if (isLengthIssue(issue)) {
    return "chapter-editor";
  }

  if (isStructureIssue(issue) || isVenueIssue(issue)) {
    return "chapter-goal";
  }

  return "chapter-instruction";
}

function outlineAnchorForIssue(issue: ReviewIssue) {
  if (isStructureIssue(issue)) {
    return "outline-structure";
  }

  if (isVenueIssue(issue)) {
    return "outline-packages";
  }

  return "outline-editing";
}

export function getReviewAction(issue: ReviewIssue, context: ReviewActionContext): ReviewAction | null {
  if (issue.level === "通过") {
    return null;
  }

  if (issue.dimension === "自检链路") {
    return null;
  }

  if (context.scope === "chapter") {
    return {
      href: `#${chapterAnchorForIssue(issue)}`,
      label: labelForIssue(issue, context.scope),
      reason: issue.dimension
    };
  }

  if (context.scope === "outline") {
    return {
      href: `#${outlineAnchorForIssue(issue)}`,
      label: labelForIssue(issue, context.scope),
      reason: issue.dimension
    };
  }

  if (isStructureIssue(issue) || isVenueIssue(issue)) {
    return {
      href: buildProjectHref(context, `/projects/${context.projectId}/outline`, {
        hash: outlineAnchorForIssue(issue)
      }),
      label: labelForIssue(issue, context.scope),
      reason: issue.dimension
    };
  }

  const chapterId = inferChapterId(issue, context);

  return {
    href: buildProjectHref(context, `/projects/${context.projectId}/writing`, {
      hash: chapterAnchorForIssue(issue),
      query: {
        chapter: chapterId
      }
    }),
    label: labelForIssue(issue, context.scope),
    reason: chapterId ? `${issue.dimension} -> ${chapterId}` : issue.dimension
  };
}

export function getPriorityReviewAction(issues: ReviewIssue[], context: ReviewActionContext) {
  const actionableIssue = [...issues]
    .filter((issue) => issue.level !== "通过")
    .sort((left, right) => severityRank(right.level) - severityRank(left.level))
    .find((issue) => Boolean(getReviewAction(issue, context)));

  if (!actionableIssue) {
    return null;
  }

  const action = getReviewAction(actionableIssue, context);

  if (!action) {
    return null;
  }

  return {
    ...action,
    label:
      actionableIssue.level === "必须修改"
        ? `优先处理：${labelWithoutPrefix(action.label)}`
        : `先处理：${labelWithoutPrefix(action.label)}`
  };
}
