import type { OutlineSection } from "@/lib/demo-data";

type OutlineFallbackInput = {
  projectTitle?: string;
  selectedDirectionLabel?: string;
  selectedDirectionDescription?: string;
};

type OutlineFallbackResult = {
  abstract: string;
  keywords: string[];
  sections: OutlineSection[];
  plainText: string;
};

type OutlineFromContentInput = OutlineFallbackInput & {
  content: string;
  preferredKeywords?: string[];
};

const GENERIC_TITLE = "当前研究主题";

const STOP_WORDS = [
  "基于",
  "关于",
  "面向",
  "研究",
  "探索",
  "分析",
  "设计",
  "构建",
  "优化",
  "应用",
  "路径",
  "机制",
  "策略",
  "模式",
  "体系",
  "框架",
  "方法",
  "问题",
  "影响",
  "效应",
  "视角",
  "驱动",
  "中的",
  "的",
  "与",
  "和"
];

function cleanText(value?: string) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function toReadableTitle(title?: string) {
  const trimmed = cleanText(title);
  return trimmed || GENERIC_TITLE;
}

function extractMeaningfulTerms(...values: Array<string | undefined>) {
  const seen = new Set<string>();
  const terms: string[] = [];

  for (const value of values) {
    const cleaned = cleanText(value);
    if (!cleaned) {
      continue;
    }

    const splitTerms = cleaned
      .split(/[，,；;：:、/|\s()（）]+/)
      .map((item) => item.trim())
      .filter((item) => item.length >= 2);

    for (const term of splitTerms) {
      let normalized = term;

      for (const stopWord of STOP_WORDS) {
        normalized = normalized.replaceAll(stopWord, "");
      }

      normalized = normalized.trim();
      if (normalized.length < 2 || seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      terms.push(normalized);
    }
  }

  return terms;
}

function inferLens(directionLabel: string, directionDescription: string) {
  const combined = `${directionLabel} ${directionDescription}`;

  if (/(实证|实验|量化|数据|问卷|统计|验证)/.test(combined)) {
    return "实证验证";
  }

  if (/(案例|应用|实践|落地|场景|产品|服务)/.test(combined)) {
    return "场景应用";
  }

  if (/(比较|对比|差异|评估|评价)/.test(combined)) {
    return "比较评估";
  }

  if (/(理论|概念|模型|机制|范式)/.test(combined)) {
    return "理论建构";
  }

  if (/(设计|交互|体验|用户|界面)/.test(combined)) {
    return "设计研究";
  }

  return "综合研究";
}

function buildAbstract(title: string, directionLabel: string, directionDescription: string, keywords: string[]) {
  const methodCue = inferLens(directionLabel, directionDescription);
  const descriptionSentence = directionDescription
    ? `重点处理“${directionDescription}”所指向的具体问题，`
    : "";

  return `本研究围绕“${title}”展开，并以“${directionLabel}”作为当前优先推进的研究路径。研究将首先界定核心概念、研究对象与问题边界，梳理国内外相关研究与理论基础；随后结合${methodCue}的思路，设计可执行的研究框架、材料来源与分析方法；最后通过案例、数据或场景验证研究判断，提炼理论贡献、实践价值与后续研究空间。${descriptionSentence}当前可先围绕“${keywords.slice(0, 3).join("、")}”组织开题写作。`;
}

function buildSections(title: string, directionLabel: string, directionDescription: string, keywords: string[]) {
  const coreTerms = keywords.slice(0, 3).join("、");
  const directionPhrase = directionDescription || directionLabel;
  const lens = inferLens(directionLabel, directionDescription);

  return [
    {
      id: "section-1",
      title: "1. 绪论",
      status: "草稿中",
      goal: `明确“${title}”的研究背景、问题边界与选题价值`,
      summary: `交代研究缘起、现实情境与学术缺口，说明为什么选择“${directionLabel}”作为切入点，并形成 2-3 个可被后文回答的核心研究问题。`
    },
    {
      id: "section-2",
      title: "2. 文献综述与理论基础",
      status: "草稿中",
      goal: `围绕“${coreTerms || title}”搭建理论支撑与文献脉络`,
      summary: `系统梳理国内外已有研究、关键概念和代表性理论，特别关注与“${directionPhrase}”相关的研究成果，最后明确本文准备补上的研究空白。`
    },
    {
      id: "section-3",
      title: "3. 研究问题与分析框架",
      status: "草稿中",
      goal: "把研究问题、变量关系或分析维度收成一套可执行框架",
      summary: `将绪论提出的问题进一步拆解，明确研究对象、观察维度、分析逻辑和预期命题，让“${directionLabel}”不只停留在方向，而是变成可实施的研究方案。`
    },
    {
      id: "section-4",
      title: "4. 研究设计与实施路径",
      status: "草稿中",
      goal: `为“${lens}”准备具体的方法、材料与执行步骤`,
      summary: `说明样本、案例、数据、访谈、实验或设计实践如何展开，交代资料来源、步骤安排、评价标准与伦理/可行性考虑，保证研究过程能被复现或审查。`
    },
    {
      id: "section-5",
      title: "5. 结果分析与讨论",
      status: "草稿中",
      goal: "将研究发现与既有文献、理论命题和实际场景对接起来",
      summary: `整理关键发现，解释其与前文理论和研究问题之间的关系，比较它与既有研究的异同，并讨论“${directionLabel}”在学术与实践层面的意义。`
    },
    {
      id: "section-6",
      title: "6. 结论、贡献与后续研究",
      status: "草稿中",
      goal: "总结结论，收束贡献，同时诚实说明局限与下一步",
      summary: `概括本文在理论、方法或应用上的主要贡献，说明研究边界与不足，并提出下一阶段适合继续深化的研究方向，方便后续扩写为完整论文。`
    }
  ] satisfies OutlineSection[];
}

function buildPlainText(title: string, sections: OutlineSection[]) {
  const lines = [`《${title}》默认开题大纲`];

  sections.forEach((section) => {
    lines.push("");
    lines.push(section.title);
    lines.push(`目标：${section.goal}`);
    lines.push(`摘要：${section.summary}`);
  });

  return lines.join("\n");
}

export function buildOutlineFallback(input: OutlineFallbackInput): OutlineFallbackResult {
  const title = toReadableTitle(input.projectTitle);
  const directionLabel = cleanText(input.selectedDirectionLabel) || "当前选定研究方向";
  const directionDescription = cleanText(input.selectedDirectionDescription);
  const terms = extractMeaningfulTerms(title, directionLabel, directionDescription);
  const keywords = Array.from(
    new Set([
      ...terms.slice(0, 4),
      inferLens(directionLabel, directionDescription),
      "研究框架"
    ])
  ).slice(0, 5);
  const sections = buildSections(title, directionLabel, directionDescription, keywords);
  const abstract = buildAbstract(title, directionLabel, directionDescription, keywords);

  return {
    abstract,
    keywords,
    sections,
    plainText: buildPlainText(title, sections)
  };
}

function stripMarkdown(value: string) {
  return value
    .replace(/\*\*/g, "")
    .replace(/^#+\s*/g, "")
    .replace(/^[>-]\s*/g, "")
    .trim();
}

function isSectionHeading(line: string) {
  return /^(\d+[.．、]\s*|[一二三四五六七八九十]+[、.]\s*)/.test(line.trim());
}

function normalizeSectionTitle(rawTitle: string, index: number) {
  const cleaned = stripMarkdown(rawTitle)
    .replace(/^(\d+[.．、]\s*|[一二三四五六七八九十]+[、.]\s*)/, "")
    .trim();

  return `${index + 1}. ${cleaned || `章节 ${index + 1}`}`;
}

function parseSectionsFromContent(content: string) {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const blocks: Array<{ title: string; body: string[] }> = [];
  let current: { title: string; body: string[] } | null = null;

  for (const line of lines) {
    if (isSectionHeading(line)) {
      if (current) {
        blocks.push(current);
      }

      current = {
        title: line,
        body: []
      };
      continue;
    }

    if (current) {
      current.body.push(stripMarkdown(line));
    }
  }

  if (current) {
    blocks.push(current);
  }

  return blocks;
}

function summarizeSectionBody(body: string[], fallbackSummary: string) {
  const merged = body
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (!merged) {
    return fallbackSummary;
  }

  return merged.length > 110 ? `${merged.slice(0, 110)}...` : merged;
}

function goalFromTitle(title: string, fallbackGoal: string) {
  const cleaned = title.replace(/^\d+\.\s*/, "").trim();

  if (!cleaned) {
    return fallbackGoal;
  }

  return `围绕“${cleaned}”补齐本章的核心论证、材料依据与写作重点`;
}

function buildSectionsFromContent(content: string, fallbackSections: OutlineSection[]) {
  const parsedBlocks = parseSectionsFromContent(content);

  if (parsedBlocks.length < 3) {
    return fallbackSections;
  }

  return fallbackSections.map((fallbackSection, index) => {
    const parsedBlock = parsedBlocks[index];
    if (!parsedBlock) {
      return fallbackSection;
    }

    const title = normalizeSectionTitle(parsedBlock.title, index);

    return {
      ...fallbackSection,
      title,
      goal: goalFromTitle(title, fallbackSection.goal),
      summary: summarizeSectionBody(parsedBlock.body, fallbackSection.summary)
    };
  });
}

function buildAbstractFromContent(content: string, fallbackAbstract: string) {
  const lines = content
    .split("\n")
    .map((line) => stripMarkdown(line))
    .filter((line) => line && !isSectionHeading(line));

  const merged = lines.join(" ").replace(/\s+/g, " ").trim();
  if (!merged) {
    return fallbackAbstract;
  }

  return merged.length > 180 ? `${merged.slice(0, 180)}...` : merged;
}

export function buildOutlineFromContent(input: OutlineFromContentInput): OutlineFallbackResult {
  const fallback = buildOutlineFallback(input);
  const content = cleanText(input.content);

  if (!content) {
    return fallback;
  }

  const keywords = Array.from(
    new Set([...(input.preferredKeywords || []), ...extractMeaningfulTerms(content), ...fallback.keywords])
  ).slice(0, 5);
  const sections = buildSectionsFromContent(content, fallback.sections);
  const abstract = buildAbstractFromContent(content, fallback.abstract);
  const title = toReadableTitle(input.projectTitle);

  return {
    abstract,
    keywords: keywords.length > 0 ? keywords : fallback.keywords,
    sections,
    plainText: buildPlainText(title, sections)
  };
}
