export type QualityCheckLevel = "通过" | "建议修改" | "必须修改";

export type QualityCheckItem = {
  dimension: string;
  level: QualityCheckLevel;
  detail: string;
};

export type AiQualityReport = {
  overall: QualityCheckLevel;
  summary: string;
  checks: QualityCheckItem[];
  rewritePriorities: string[];
  metrics: {
    charCount: number;
    paragraphCount: number;
  };
};

function tryParseJson(candidate: string) {
  return JSON.parse(candidate) as Omit<AiQualityReport, "metrics">;
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

function sanitizeJsonCandidate(candidate: string) {
  return candidate
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, "$1");
}

function normalizeQualityLevel(level: unknown): QualityCheckLevel {
  if (level === "通过" || level === "建议修改" || level === "必须修改") {
    return level;
  }

  return "建议修改";
}

export function parseJsonFromModelOutput(content: string) {
  const fencedMatch = content.match(/```json\s*([\s\S]*?)```/i);
  const balancedObject = extractBalancedJsonObject(content);
  const candidates = [
    content,
    fencedMatch?.[1],
    balancedObject,
    content.match(/\{[\s\S]*\}/)?.[0]
  ]
    .filter((item): item is string => Boolean(item))
    .flatMap((item) => {
      const sanitized = sanitizeJsonCandidate(item);
      return sanitized === item ? [item] : [item, sanitized];
    });

  for (const candidate of candidates) {
    try {
      const parsed = tryParseJson(candidate);

      return {
        overall: normalizeQualityLevel(parsed.overall),
        summary: typeof parsed.summary === "string" ? parsed.summary : "AI 已完成检查，但总评缺失。",
        checks: Array.isArray(parsed.checks)
          ? parsed.checks.map((item) => ({
              dimension: typeof item?.dimension === "string" ? item.dimension : "未命名维度",
              level: normalizeQualityLevel(item?.level),
              detail: typeof item?.detail === "string" ? item.detail : "未返回详细说明。"
            }))
          : [],
        rewritePriorities: Array.isArray(parsed.rewritePriorities)
          ? parsed.rewritePriorities.filter((item): item is string => typeof item === "string")
          : []
      };
    } catch {
      continue;
    }
  }

  throw new Error("模型返回里没有可解析的 JSON。");
}

export function countContentMetrics(content: string) {
  const charCount = content.replace(/\s+/g, "").length;
  const paragraphCount = content
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean).length;

  return {
    charCount,
    paragraphCount
  };
}
