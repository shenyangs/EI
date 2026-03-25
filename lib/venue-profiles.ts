export type VenuePublisher = "IEEE" | "ACM" | "Springer" | "通用";

export type VenueProfile = {
  id: string;
  publisher: VenuePublisher;
  familyLabel: string;
  name: string;
  shortName: string;
  template: string;
  blindReview: string;
  abstractRule: string;
  keywordRule: string;
  pageRule: string;
  referenceRule: string;
  aiPolicy: string;
  fitFor: string[];
  notes: string[];
  lengthGuidance: {
    abstractChars: [number, number];
    fullTextChars: [number, number];
    chapterChars: [number, number];
  };
};

export const venueProfiles: VenueProfile[] = [
  {
    id: "ieee-general",
    publisher: "IEEE",
    familyLabel: "IEEE 通用会议规则",
    name: "IEEE Conference Proceedings",
    shortName: "IEEE 通用",
    template: "双栏会议模板，图表与参考文献按 IEEE 规范",
    blindReview: "多数会议需按具体 CFP 判断是否双盲",
    abstractRule: "摘要通常要求简洁，突出问题、方法、结果与贡献",
    keywordRule: "关键词通常 3 到 5 个",
    pageRule: "常见为 4 到 6 页或 6 到 8 页，超页需看会议",
    referenceRule: "IEEE 数字序号引用格式",
    aiPolicy: "如会议要求，需要披露生成式 AI 的辅助使用情况",
    fitFor: ["技术应用型论文", "交叉设计技术论文", "有原型和验证的论文"],
    notes: ["更重视结构完整、贡献明确、实验或验证闭环", "摘要和结论都要写得克制，不宜像项目说明"],
    lengthGuidance: {
      abstractChars: [180, 380],
      fullTextChars: [5500, 9500],
      chapterChars: [650, 1800]
    }
  },
  {
    id: "ieee-iccci-2026",
    publisher: "IEEE",
    familyLabel: "IEEE 具体会议",
    name: "IEEE ICCCI 2026",
    shortName: "IEEE ICCCI 2026",
    template: "沿用 IEEE 会议模板，适合计算、通信与智能交互类论文",
    blindReview: "按会议通知执行，默认按盲审风险进行自检",
    abstractRule: "摘要要明确问题场景、方法路径、实验或验证结果",
    keywordRule: "建议 4 到 5 个关键词，避免过泛",
    pageRule: "建议按 6 页主文准备，图表数量控制在能讲清方法与结果的范围内",
    referenceRule: "IEEE 数字序号格式，重视近年文献",
    aiPolicy: "建议保留 AI 辅助记录，最终按会议要求决定是否披露",
    fitFor: ["智能服饰", "人机交互", "设计与技术交叉", "原型验证"],
    notes: ["方法与结果必须成对出现", "相关工作不能只有设计叙述，需有技术或体验研究支撑"],
    lengthGuidance: {
      abstractChars: [200, 420],
      fullTextChars: [6000, 10000],
      chapterChars: [700, 1900]
    }
  },
  {
    id: "acm-general",
    publisher: "ACM",
    familyLabel: "ACM 通用会议规则",
    name: "ACM Proceedings",
    shortName: "ACM 通用",
    template: "ACM Master Article 模板，排版与元数据要求更严格",
    blindReview: "很多会议存在匿名投稿要求，需严格处理作者与机构信息",
    abstractRule: "摘要强调研究问题、方法、发现与意义",
    keywordRule: "通常 3 到 6 个关键词",
    pageRule: "页数依具体会议而定，常配套版权声明与 CCS Concepts",
    referenceRule: "ACM 引用格式，需统一元数据",
    aiPolicy: "需要查看具体会议和出版政策，避免 AI 生成内容不可追溯",
    fitFor: ["数字人文", "交互设计", "计算设计", "方法与系统论文"],
    notes: ["更强调论证严密和元数据完整", "标题与摘要要避免空泛宣传语"],
    lengthGuidance: {
      abstractChars: [180, 380],
      fullTextChars: [5500, 10000],
      chapterChars: [650, 1800]
    }
  },
  {
    id: "acm-icdh-2026",
    publisher: "ACM",
    familyLabel: "ACM 具体会议",
    name: "ACM ICDH 2026",
    shortName: "ACM ICDH 2026",
    template: "适合数字人文、文化计算与设计研究的 ACM 会议模板",
    blindReview: "默认按匿名审稿要求准备",
    abstractRule: "摘要应同时交代研究背景、方法、主要发现与学术价值",
    keywordRule: "建议 4 到 6 个关键词",
    pageRule: "建议按 6 到 8 页主文规划",
    referenceRule: "ACM 引用与元数据格式",
    aiPolicy: "需要严格保留来源与写作过程痕迹，便于后续披露",
    fitFor: ["文化设计", "数字人文", "艺术科技交叉", "体验研究"],
    notes: ["更看重研究叙事和学术贡献是否匹配数字人文语境", "讨论部分应体现理论联系而非只有结果描述"],
    lengthGuidance: {
      abstractChars: [220, 420],
      fullTextChars: [6200, 10200],
      chapterChars: [700, 1850]
    }
  },
  {
    id: "springer-general",
    publisher: "Springer",
    familyLabel: "Springer 通用会议规则",
    name: "Springer Conference Proceedings",
    shortName: "Springer 通用",
    template: "多为单栏或 LNCS 系列模板，强调章节逻辑和格式规范",
    blindReview: "是否双盲依具体会议决定",
    abstractRule: "摘要通常要求清晰说明问题、方法、结果与意义",
    keywordRule: "常见 3 到 5 个关键词",
    pageRule: "页数依系列和会议不同，常见 8 到 12 页",
    referenceRule: "Springer / LNCS 引用格式",
    aiPolicy: "Springer Nature 对 AI 使用与披露有明确政策，需按要求执行",
    fitFor: ["综述型论文", "方法框架型论文", "交叉学科研究"],
    notes: ["通常允许更完整的论述空间", "章节层级和术语统一非常重要"],
    lengthGuidance: {
      abstractChars: [200, 420],
      fullTextChars: [7500, 13000],
      chapterChars: [750, 2200]
    }
  },
  {
    id: "springer-aic-2026",
    publisher: "Springer",
    familyLabel: "Springer 具体会议",
    name: "Springer AIC 2026",
    shortName: "Springer AIC 2026",
    template: "偏设计、创新与计算交叉场景的 Springer 会议模板",
    blindReview: "按具体会议通知执行，默认按匿名风险检查",
    abstractRule: "摘要需交代问题、方法、案例或验证以及结论",
    keywordRule: "建议 4 到 5 个关键词",
    pageRule: "建议按 8 到 10 页篇幅规划内容密度",
    referenceRule: "Springer / LNCS 系列风格",
    aiPolicy: "按 Springer Nature AI 政策处理披露与来源可追溯性",
    fitFor: ["设计研究", "时尚与社会文化研究", "艺术科技交叉论文"],
    notes: ["可以接受更完整的案例与设计过程描述", "但结论仍需落到学术贡献与可复用方法"],
    lengthGuidance: {
      abstractChars: [220, 450],
      fullTextChars: [8200, 13500],
      chapterChars: [800, 2300]
    }
  },
  {
    id: "custom-ei",
    publisher: "通用",
    familyLabel: "未确定具体会议",
    name: "通用 EI 投稿规则",
    shortName: "通用 EI",
    template: "先按稳妥的会议论文结构准备，后续再绑定模板",
    blindReview: "默认按盲审风险处理",
    abstractRule: "摘要至少应具备问题、方法、结果、贡献四要素",
    keywordRule: "建议先保留 4 到 5 个关键词",
    pageRule: "先按中等密度会议稿准备，再在导出阶段适配",
    referenceRule: "先按统一规范整理，后续再转具体格式",
    aiPolicy: "保留 AI 辅助痕迹，待绑定会议后自动补充披露建议",
    fitFor: ["暂未定会的选题探索", "先做论文内容后定模板", "跨学科选题预研"],
    notes: ["先把论文逻辑做实，再绑定最终模板", "适合早期规划阶段"],
    lengthGuidance: {
      abstractChars: [200, 420],
      fullTextChars: [6500, 11000],
      chapterChars: [700, 1900]
    }
  }
];

export function getVenueProfileById(venueId?: string | null) {
  if (!venueId) {
    return venueProfiles[1];
  }

  return venueProfiles.find((item) => item.id === venueId) ?? venueProfiles[1];
}

export function buildVenueHref(href: string, venueId?: string | null, params?: Record<string, string>) {
  const [baseHref, hash] = href.split("#", 2);
  let queryParams = [];
  
  if (venueId) {
    queryParams.push(`venue=${venueId}`);
  }
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        queryParams.push(`${key}=${encodeURIComponent(value)}`);
      }
    });
  }
  
  const separator = baseHref.includes("?") ? "&" : "?";
  const hrefWithParams = queryParams.length > 0 ? `${baseHref}${separator}${queryParams.join("&")}` : baseHref;

  return hash ? `${hrefWithParams}#${hash}` : hrefWithParams;
}
