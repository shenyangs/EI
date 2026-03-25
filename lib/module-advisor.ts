export type AdvisorModuleType = "methodology" | "materials" | "search";

export type AdvisorOption = {
  id: string;
  label: string;
  title: string;
  reason: string;
  bullets: string[];
  queries?: string[];
};

export type AdvisorBundle = {
  summary: string;
  options: AdvisorOption[];
  source: "ai" | "fallback";
};

function sanitizeJsonCandidate(candidate: string) {
  return candidate
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/```json\s*([\s\S]*?)```/gi, "$1")
    .replace(/```/g, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, "$1");
}

function extractBalancedJsonObject(content: string) {
  const start = content.indexOf("{");

  if (start < 0) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < content.length; index += 1) {
    const char = content[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return content.slice(start, index + 1);
      }
    }
  }

  return null;
}

function buildOptionId(moduleType: AdvisorModuleType, index: number) {
  return `${moduleType}-${index + 1}`;
}

function normalizeOption(
  moduleType: AdvisorModuleType,
  raw: Partial<AdvisorOption> | null | undefined,
  index: number
): AdvisorOption {
  const fallbackLabel = `方案 ${String.fromCharCode(65 + index)}`;

  return {
    id: raw?.id?.trim() || buildOptionId(moduleType, index),
    label: raw?.label?.trim() || fallbackLabel,
    title: raw?.title?.trim() || `${fallbackLabel} · 待补完整`,
    reason: raw?.reason?.trim() || "当前没有拿到完整说明，建议重新生成这一组方案。",
    bullets:
      raw?.bullets?.filter((item): item is string => typeof item === "string" && item.trim().length > 0) ??
      [],
    queries:
      moduleType === "search"
        ? raw?.queries?.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : undefined
  };
}

export function parseAdvisorBundleFromModelOutput(
  content: string,
  moduleType: AdvisorModuleType
): AdvisorBundle {
  const candidates = [
    content,
    content.match(/```json\s*([\s\S]*?)```/i)?.[1] ?? null,
    extractBalancedJsonObject(content)
  ]
    .filter((item): item is string => Boolean(item))
    .map((item) => sanitizeJsonCandidate(item));

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as {
        summary?: string;
        options?: Array<Partial<AdvisorOption>>;
      };

      const options = Array.isArray(parsed.options)
        ? parsed.options.slice(0, 3).map((item, index) => normalizeOption(moduleType, item, index))
        : [];

      if (options.length === 0) {
        continue;
      }

      return {
        summary:
          typeof parsed.summary === "string" && parsed.summary.trim()
            ? parsed.summary.trim()
            : "系统已生成 3 组建议，你可以先选一组最接近的，再补充自己的偏好。",
        options,
        source: "ai"
      };
    } catch {
      continue;
    }
  }

  throw new Error("模型返回里没有可解析的模块建议 JSON。");
}

export function buildFallbackAdvisorBundle(input: {
  moduleType: AdvisorModuleType;
  projectTitle: string;
  discipline?: string;
  userNote?: string;
}) {
  const { moduleType, projectTitle, discipline = "跨学科研究", userNote = "" } = input;
  const noteSuffix = userNote.trim() ? `已考虑你的补充想法：${userNote.trim()}` : "你还可以继续补充自己的偏好。";

  if (moduleType === "methodology") {
    return {
      summary: `先从“方法路线”里选一个主写法，再决定后面的框架和文献取向。${noteSuffix}`,
      options: [
        {
          id: buildOptionId(moduleType, 0),
          label: "方案 A",
          title: "设计验证优先",
          reason: `更适合 ${projectTitle} 这类需要把设计过程、原型和验证闭环写清楚的主题。`,
          bullets: ["突出设计流程和原型实现", "结果章强调验证是否成立", "结论收束到方法贡献"]
        },
        {
          id: buildOptionId(moduleType, 1),
          label: "方案 B",
          title: "用户研究优先",
          reason: `如果 ${discipline} 更看重体验评价，这一条会更稳。`,
          bullets: ["补齐样本、任务与量表", "让结果章围绕用户反馈展开", "讨论部分强调体验机制"]
        },
        {
          id: buildOptionId(moduleType, 2),
          label: "方案 C",
          title: "技术实现优先",
          reason: "适合目标会议更偏工程与实现说明时采用。",
          bullets: ["明确模块结构与实现路径", "把方法章拆成系统与实现两节", "结果章补功能表现和局限"]
        }
      ],
      source: "fallback" as const
    };
  }

  if (moduleType === "materials") {
    return {
      summary: `别只看“缺什么”，更要先决定先补哪一类证据最值钱。${noteSuffix}`,
      options: [
        {
          id: buildOptionId(moduleType, 0),
          label: "方案 A",
          title: "先补样本与评价证据",
          reason: "最能直接提升方法可信度和结果说服力。",
          bullets: ["样本来源与筛选条件", "测试任务与评价维度", "关键结果数据或图表"]
        },
        {
          id: buildOptionId(moduleType, 1),
          label: "方案 B",
          title: "先补原型与过程图示",
          reason: "适合设计与技术交叉论文，让方法章不再空。",
          bullets: ["原型外观或结构图", "交互流程图", "设计映射过程图"]
        },
        {
          id: buildOptionId(moduleType, 2),
          label: "方案 C",
          title: "先补文献与理论支撑",
          reason: "适合当前论断较多、引用不足的情形。",
          bullets: ["近 5 年核心文献", "方法对照文献", "评价指标来源文献"]
        }
      ],
      source: "fallback" as const
    };
  }

  return {
    summary: `先把文献搜索角度拆开，再搜论文会更准。${noteSuffix}`,
    options: [
      {
        id: buildOptionId(moduleType, 0),
        label: "方案 A",
        title: "概念与背景线",
        reason: "先把主题的领域背景与研究空缺搜清楚。",
        bullets: ["背景综述", "领域痛点", "近年研究热点"],
        queries: [`${projectTitle} review`, `${projectTitle} research gap`]
      },
      {
        id: buildOptionId(moduleType, 1),
        label: "方案 B",
        title: "方法与实现线",
        reason: "更适合为方法章和框架设计找可复用做法。",
        bullets: ["方法框架", "实现路径", "系统或原型案例"],
        queries: [`${projectTitle} framework`, `${projectTitle} prototype study`]
      },
      {
        id: buildOptionId(moduleType, 2),
        label: "方案 C",
        title: "验证与评价线",
        reason: "更适合为用户测试、结果分析和评价维度找证据。",
        bullets: ["评价指标", "用户研究", "实验或测试设计"],
        queries: [`${projectTitle} user study`, `${projectTitle} evaluation metrics`]
      }
    ],
    source: "fallback" as const
  };
}
