export type ProjectStage =
  | "已确定主题方向"
  | "已拆论文框架"
  | "分章节写作中"
  | "准备输出全文";

export type ProjectCardItem = {
  id: string;
  title: string;
  subtitle: string;
  conference: string;
  venueId?: string;
  available?: boolean;
  stage: ProjectStage;
  updatedAt: string;
  accent: string;
};

export type OutlineSection = {
  id: string;
  title: string;
  goal: string;
  summary: string;
  status: "已锁定" | "草稿中" | "待补充";
};

export type ReferenceItem = {
  id: string;
  title: string;
  source: string;
  status: "已绑定" | "待核验";
};

export type AssetItem = {
  id: string;
  name: string;
  type: string;
  usage: string;
};

export type CheckItem = {
  level: "通过" | "建议修改" | "必须修改";
  title: string;
  description: string;
};

export type TopicTypeOption = {
  id: string;
  label: string;
  confidence: string;
  description: string;
  whyItFits: string[];
  writingStrategy: string[];
  readyOutputs: string[];
};

export type TitlePackage = {
  id: string;
  label: string;
  title: string;
  positioning: string;
  abstract: string;
  keywords: string[];
  recommendedReason: string;
};

export type ChapterDraft = {
  id: string;
  title: string;
  status: "已确认" | "可修改" | "待补齐";
  goal: string;
  summary: string;
  paragraphs: string[];
  aiOptions: string[];
  evidenceNeeds: string[];
};

export type FullTextSection = {
  id: string;
  title: string;
  content: string[];
};

export type DemoProject = {
  id: string;
  title: string;
  subtitle: string;
  conference: string;
  stage: ProjectStage;
  discipline: string;
  methodology: string[];
  progress: {
    label: string;
    value: number;
  }[];
  risks: string[];
  materialsNeeded: string[];
  titleCandidates: string[];
  abstractHighlights: string[];
  outline: OutlineSection[];
  references: ReferenceItem[];
  assets: AssetItem[];
  checks: CheckItem[];
  flowSteps: {
    label: string;
    desc: string;
    href: string;
    done: boolean;
  }[];
  topicTypeOptions: TopicTypeOption[];
  titlePackages: TitlePackage[];
  chapterDrafts: ChapterDraft[];
  fullText: {
    abstract: string;
    keywords: string[];
    sections: FullTextSection[];
  };
};

export const projectCards: ProjectCardItem[] = [
  {
    id: "atelier-zero",
    title: "非遗纹样驱动的智能服饰交互设计研究",
    subtitle: "服装设计 + 用户体验 + 智能穿戴",
    conference: "IEEE ICCCI 2026",
    venueId: "ieee-iccci-2026",
    available: true,
    stage: "分章节写作中",
    updatedAt: "今天 22:10",
    accent: "amber"
  },
  {
    id: "fabric-signal",
    title: "基于可持续材料的时尚品牌叙事与消费意愿分析",
    subtitle: "时尚传播 + 社会心理",
    conference: "Springer AIC 2026",
    venueId: "springer-aic-2026",
    available: false,
    stage: "已拆论文框架",
    updatedAt: "昨天 18:40",
    accent: "sage"
  },
  {
    id: "atelier-mirror",
    title: "数字打版辅助下的服装版型优化方法研究",
    subtitle: "技术应用 + 设计实践",
    conference: "ACM ICDH 2026",
    venueId: "acm-icdh-2026",
    available: false,
    stage: "已确定主题方向",
    updatedAt: "3 天前",
    accent: "ink"
  }
];

export const demoProject: DemoProject = {
  id: "atelier-zero",
  title: "非遗纹样驱动的智能服饰交互设计研究",
  subtitle: "让传统图案语言进入可穿戴体验场景",
  conference: "IEEE ICCCI 2026",
  stage: "分章节写作中",
  discipline: "设计实践 + 用户研究 + 技术应用",
  methodology: ["文化元素提取", "原型设计", "用户测试", "结果对比分析"],
  progress: [
    { label: "主题方向", value: 100 },
    { label: "题目类型", value: 100 },
    { label: "论文框架", value: 88 },
    { label: "章节写作", value: 72 },
    { label: "全文导出", value: 52 }
  ],
  risks: [
    "方法章还缺受试者招募来源与筛选依据",
    "结果分析章需要补一条关于情感联想的正式文献",
    "结论里应用价值写得太满，建议收束到可复用设计流程"
  ],
  materialsNeeded: [
    "用户测试样本表",
    "原型服饰成衣图 2 张",
    "交互流程图 1 张"
  ],
  titleCandidates: [
    "非遗纹样驱动的智能服饰交互设计研究",
    "传统纹样转译在智能服饰设计中的应用路径研究",
    "从文化纹样到可穿戴体验的智能服饰设计研究"
  ],
  abstractHighlights: [
    "问题背景要落在传统文化转译与智能穿戴融合难点上",
    "方法需要明确说明纹样提取、交互映射与用户测试三步",
    "结果部分建议突出用户感知提升与设计可复用性"
  ],
  outline: [
    {
      id: "title",
      title: "标题、摘要与关键词",
      goal: "确定题目指向、摘要逻辑与关键词组合",
      summary: "先把研究边界、研究对象、方法路径压缩到题目与摘要里。",
      status: "已锁定"
    },
    {
      id: "intro",
      title: "引言",
      goal: "说明研究背景、问题缺口与文章贡献",
      summary: "用传统纹样数字转译与智能服饰体验之间的断层做问题引入。",
      status: "已锁定"
    },
    {
      id: "related",
      title: "相关研究与理论基础",
      goal: "梳理非遗纹样、智能服饰与用户体验相关研究",
      summary: "把文化设计、可穿戴交互和用户感知三类文献串成理论底座。",
      status: "草稿中"
    },
    {
      id: "method",
      title: "设计方法与原型实现",
      goal: "交代设计路径、原型结构和交互机制",
      summary: "明确纹样筛选、元素抽象、交互映射与原型落地四步。",
      status: "草稿中"
    },
    {
      id: "test",
      title: "用户测试与结果分析",
      goal: "展示测试过程、结果与设计反馈",
      summary: "交代样本、任务、量表和反馈结果，避免只写主观感受。",
      status: "待补充"
    },
    {
      id: "conclusion",
      title: "结论与未来工作",
      goal: "总结贡献、限制与后续方向",
      summary: "把贡献收束为设计方法、体验发现和可复用流程三点。",
      status: "待补充"
    }
  ],
  references: [
    {
      id: "ref-1",
      title: "Cultural Computing in Wearable Interfaces",
      source: "IEEE Access, 2024",
      status: "已绑定"
    },
    {
      id: "ref-2",
      title: "Fashion Interaction Design and User Emotion Mapping",
      source: "International Journal of Design, 2023",
      status: "已绑定"
    },
    {
      id: "ref-3",
      title: "Traditional Pattern Translation in Contemporary Apparel",
      source: "Design Studies, 2022",
      status: "待核验"
    }
  ],
  assets: [
    {
      id: "asset-1",
      name: "纹样抽象过程图",
      type: "研究图示",
      usage: "方法章"
    },
    {
      id: "asset-2",
      name: "智能服饰原型效果图",
      type: "原型图",
      usage: "方法章 / 结果章"
    },
    {
      id: "asset-3",
      name: "用户测试满意度图表",
      type: "数据图表",
      usage: "结果章"
    }
  ],
  checks: [
    {
      level: "必须修改",
      title: "方法章缺少样本来源",
      description: "需要说明受试者招募方式、数量与筛选条件。"
    },
    {
      level: "建议修改",
      title: "第 3 章第 2 段缺引用",
      description: "关于传统纹样情感联想的描述最好补一条正式文献。"
    },
    {
      level: "通过",
      title: "会议模板基础信息完整",
      description: "篇幅、摘要、关键词和参考文献格式均已绑定。"
    }
  ],
  flowSteps: [
    {
      label: "1. 定主题和方向",
      desc: "先明确研究题目、研究对象、目标会议与学科边界。",
      href: "/projects/atelier-zero",
      done: true
    },
    {
      label: "2. 判断题目类型",
      desc: "AI 先给出 3 种题目写法方案，你选定最合适的一种。",
      href: "/projects/atelier-zero/profile",
      done: true
    },
    {
      label: "3. 确认论文框架",
      desc: "AI 先准备题目、摘要、关键词和章节骨架，你再挑选或修改。",
      href: "/projects/atelier-zero/outline",
      done: true
    },
    {
      label: "4. 逐章写作与确认",
      desc: "每章先给正文草稿和备选版本，再逐段确认。",
      href: "/projects/atelier-zero/writing",
      done: false
    },
    {
      label: "5. 合成全文与导出",
      desc: "先看到完整全文，再决定继续修改还是导出。",
      href: "/projects/atelier-zero/export",
      done: false
    }
  ],
  topicTypeOptions: [
    {
      id: "design-led",
      label: "设计实践主导型",
      confidence: "92% 匹配",
      description: "最适合把非遗纹样转译、智能服饰原型实现和用户反馈放在一条设计链路里写。",
      whyItFits: [
        "题目核心不是算法创新，而是设计语言如何落地到可穿戴体验。",
        "你的材料里有原型图、流程图和用户测试，这更像设计研究论文。",
        "EI 会议可接受有原型和实验验证的设计技术交叉论文。"
      ],
      writingStrategy: [
        "引言聚焦文化转译与智能穿戴之间的设计难点。",
        "方法章重点写纹样筛选、交互映射、原型搭建。",
        "结果章要让用户测试成为设计有效性的证据。"
      ],
      readyOutputs: ["3 个可选标题", "1 版摘要草稿", "6 章框架骨架", "每章写作重点"]
    },
    {
      id: "user-study",
      label: "用户研究增强型",
      confidence: "78% 匹配",
      description: "保留设计过程，但把用户感知、满意度和文化识别度写得更重一些。",
      whyItFits: [
        "如果你后面能补齐问卷、访谈或量表，这条路会更稳。",
        "适合突出受试者对纹样识别、交互直观性和穿着体验的反馈。",
        "能让结果章更像可验证研究，而不是单纯设计说明。"
      ],
      writingStrategy: [
        "把研究问题改成体验感知提升是否显著。",
        "增加样本说明、量表条目和结果解释。",
        "讨论部分要连接用户反馈与设计调整。"
      ],
      readyOutputs: ["用户测试指标建议", "结果图表位建议", "摘要结果句式", "结论写法"]
    },
    {
      id: "tech-support",
      label: "技术应用支撑型",
      confidence: "64% 匹配",
      description: "适合在不改变主题的前提下，把交互模块、传感逻辑和实现结构写得更工程化。",
      whyItFits: [
        "如果目标会议更看重实现路径，这一型可以作为保底写法。",
        "它会强调原型架构、模块连接和交互响应。",
        "但如果技术部分不够强，整篇会显得支撑不足。"
      ],
      writingStrategy: [
        "把方法章拆成系统架构和交互实现两小节。",
        "增加硬件或传感模块说明。",
        "结果章要避免只写外观设计，要写功能表现。"
      ],
      readyOutputs: ["实现路径说明", "原型结构写法", "技术描述句式", "风险提醒"]
    }
  ],
  titlePackages: [
    {
      id: "pkg-1",
      label: "方案 A",
      title: "非遗纹样驱动的智能服饰交互设计研究",
      positioning: "最稳，兼顾文化设计、交互设计和原型验证。",
      abstract:
        "针对传统纹样在智能穿戴场景中难以完成语义转译与交互映射的问题，本文提出一套从文化元素提取、视觉语言抽象到智能服饰原型实现的设计路径。研究以非遗纹样为对象，构建纹样特征与服饰交互触点之间的映射规则，并完成可试穿原型。通过小规模用户测试，本文验证了该路径在文化辨识度、交互直观性和穿着体验上的可行性。研究为传统文化元素进入智能服饰设计提供了一种可复用的方法框架。",
      keywords: ["非遗纹样", "智能服饰", "交互设计", "用户体验", "设计研究"],
      recommendedReason: "更符合 EI 会议里常见的“设计 + 原型 + 验证”结构。"
    },
    {
      id: "pkg-2",
      label: "方案 B",
      title: "传统纹样转译在智能服饰设计中的应用路径研究",
      positioning: "更偏方法论，适合强调设计流程可复用。",
      abstract:
        "为解决传统纹样在智能服饰设计中存在的语义碎片化与交互表达不足问题，本文从纹样特征提取、设计映射与原型验证三个层面提出一条应用路径。研究将文化纹样的图形节奏、象征语义与智能服饰交互逻辑相结合，形成一套从元素抽象到原型实现的流程。结合试穿观察与用户反馈，研究总结出影响文化识别度与交互接受度的关键因素。结果表明，该路径可为跨学科服饰设计研究提供稳定的实践模板。",
      keywords: ["纹样转译", "智能服饰设计", "设计方法", "原型验证", "跨学科研究"],
      recommendedReason: "如果你更想把论文写成‘方法输出’，这一版更合适。"
    },
    {
      id: "pkg-3",
      label: "方案 C",
      title: "从文化纹样到可穿戴体验的智能服饰设计研究",
      positioning: "更偏体验叙事，适合强调用户感知。",
      abstract:
        "本文围绕文化纹样如何转化为可穿戴体验中的交互语言展开研究，尝试在传统图形语义与智能服饰应用之间建立连续设计链路。研究通过纹样筛选、视觉抽象、交互映射与原型实现，构建一套面向体验设计的智能服饰开发流程，并以用户试穿测试验证其有效性。结果显示，文化语义保留程度、触发反馈清晰度与整体穿着舒适性共同影响用户对作品的接受度。该研究为文化元素与智能穿戴融合提供了新的设计视角。",
      keywords: ["可穿戴体验", "文化设计", "智能穿戴", "交互语言", "服饰创新"],
      recommendedReason: "如果你要投偏艺术科技或设计创新方向，它更有叙事感。"
    }
  ],
  chapterDrafts: [
    {
      id: "intro",
      title: "引言",
      status: "已确认",
      goal: "说明研究背景、问题缺口与文章贡献",
      summary: "这一章已经可以直接用，主要承担问题建立和贡献交代。",
      paragraphs: [
        "随着可穿戴技术与情境交互设计的发展，智能服饰逐渐从功能载体转向兼具文化表达与体验价值的综合媒介。然而，在现有研究中，传统纹样元素往往停留在视觉装饰层面，尚未形成与交互逻辑、穿着情境和用户感知相协调的设计路径。这使得具有文化识别度的设计资源在智能服饰领域难以充分转化为可操作的体验语言。",
        "针对这一问题，本文以非遗纹样为研究对象，尝试建立一套从文化元素提取、视觉语言抽象到智能服饰交互映射的设计方法，并通过原型制作与用户测试验证其有效性。文章的核心贡献在于：第一，提出传统纹样向智能服饰交互要素转译的设计流程；第二，构建兼顾文化辨识度与交互直观性的原型实现路径；第三，通过用户反馈总结出影响该类设计接受度的关键因素。"
      ],
      aiOptions: [
        "如果你想让开头更学术，可以把第一句改成“近年来，智能服饰逐步成为设计研究与人机交互研究的重要交汇点”。",
        "如果你想让贡献更像 EI 会议论文，可以把三点贡献改成“方法框架、原型验证、体验发现”三段式。"
      ],
      evidenceNeeds: ["补 1 条关于智能服饰发展趋势的综述文献", "补 1 条关于文化元素数字转译的研究"]
    },
    {
      id: "related",
      title: "相关研究与理论基础",
      status: "可修改",
      goal: "梳理非遗纹样、智能服饰与用户体验相关研究",
      summary: "已有主体内容，但还需要补两条正式引用，把理论链条连得更紧。",
      paragraphs: [
        "现有关于非遗纹样的研究主要集中于视觉风格整理、图案数字化保护与现代设计转译三条路径。相关成果说明，传统纹样不仅具有装饰属性，还承担着文化象征与情感联想功能，因此在转译过程中不能只保留形式轮廓，还需关注其语义结构与使用语境。",
        "智能服饰研究则更多围绕可穿戴交互、柔性传感、情境反馈与穿着体验展开。与传统服饰设计相比，智能服饰要求视觉表达与功能反馈同步构成整体体验，这意味着文化图形若要真正进入智能服饰系统，必须与交互触发方式、材料结构和用户感知机制共同被设计。",
        "从用户体验角度看，文化识别度、反馈清晰度与穿着舒适性是影响作品接受度的关键变量。因此，本文将非遗纹样研究、智能服饰设计研究与体验设计研究并置，作为后续设计方法与测试分析的理论依据。"
      ],
      aiOptions: [
        "可以补一个小标题，分成“纹样转译研究”“智能服饰研究”“体验评价研究”三段。",
        "也可以把最后一段改成研究假设，为用户测试做铺垫。"
      ],
      evidenceNeeds: ["补 1 条非遗纹样情感联想研究", "补 1 条智能服饰体验评价研究"]
    },
    {
      id: "method",
      title: "设计方法与原型实现",
      status: "可修改",
      goal: "交代设计路径、原型结构和交互机制",
      summary: "正文已经成形，下一步重点是补充样本来源和评价维度。",
      paragraphs: [
        "本研究将非遗纹样的视觉特征提炼为可穿戴交互语言，并以智能服饰原型作为验证媒介。首先，研究从纹样轮廓、节奏和象征语义三个维度建立设计映射规则，用于指导服装图形和交互触点的整合。",
        "在原型实现阶段，研究将导电纤维与柔性传感模块嵌入服装局部结构，使纹样不只承担装饰功能，也承担触发反馈的交互入口。为了降低传统图案在数字化处理中的视觉损耗，本文保留了高识别度的节奏单元，并通过分层构成强化视觉连续性。",
        "初步原型完成后，研究组织了小规模试穿与观察，对交互反馈的直观性、文化辨识度和穿着舒适性进行记录。现阶段文本已经覆盖设计逻辑和实现思路，但还需要补充样本来源、受试者数量与评价维度说明。"
      ],
      aiOptions: [
        "可以把第二段改得更工程化，补上模块连接与反馈方式。",
        "也可以把第三段拆成“测试对象”“测试流程”“评价指标”三小段，让结构更像会议论文。"
      ],
      evidenceNeeds: ["补受试者招募方式", "补评价维度和记录方法"]
    },
    {
      id: "test",
      title: "用户测试与结果分析",
      status: "待补齐",
      goal: "展示测试过程、结果与设计反馈",
      summary: "AI 已经准备好一版可用草稿，但还需要你确认样本数据是否真实可用。",
      paragraphs: [
        "为评估所提出设计路径的有效性，研究邀请目标用户对智能服饰原型进行试穿与交互体验。测试任务围绕文化识别度、反馈理解度和穿着舒适性展开，并结合现场观察与简短访谈记录用户反应。结果显示，大多数参与者能够在短时间内识别纹样所传达的文化语义，并理解触发反馈与图形位置之间的对应关系。",
        "在结果分析中，文化元素保留程度与交互反馈清晰度被证明是影响接受度的核心因素。当图形转译过于简化时，用户会降低对文化来源的辨识；当反馈响应位置不够明确时，用户则容易将交互理解为普通装饰变化。因此，设计优化不应只围绕视觉美观展开，而应同时处理语义传达与功能感知。",
        "进一步的访谈反馈表明，用户普遍认可将传统纹样作为交互入口的方式，但也指出原型在长时间穿着舒适性与反馈稳定性方面仍有提升空间。这些发现为后续原型优化和设计方法调整提供了直接依据。"
      ],
      aiOptions: [
        "如果你有问卷数据，可以把第二段改成“量表结果 + 访谈发现”的写法。",
        "如果没有正式样本，可以明确写成探索性用户测试，避免把结论写得过重。"
      ],
      evidenceNeeds: ["确认样本数量是否可公开写入", "补测试任务与记录方式"]
    },
    {
      id: "conclusion",
      title: "结论与未来工作",
      status: "待补齐",
      goal: "总结贡献、限制与后续方向",
      summary: "这一章已有完整版本，但需要你确认后续工作方向是不是你真的要写的。",
      paragraphs: [
        "本文围绕非遗纹样在智能服饰中的转译问题，提出一条从文化元素提取、交互映射到原型验证的设计路径，并通过用户测试对其可行性进行了初步检验。研究表明，传统纹样不仅能够作为视觉装饰资源，也能够成为智能服饰中具有识别度和交互性的体验入口。",
        "本文的贡献主要体现在三个方面：其一，提出了适用于文化元素进入智能服饰场景的设计流程；其二，验证了文化语义、交互逻辑与穿着体验可以在同一原型中协同设计；其三，总结出文化识别度、反馈清晰度与舒适性三项关键评价维度。与此同时，研究仍存在样本规模较小、原型稳定性不足和长期体验数据缺失等限制。",
        "未来工作可进一步扩大测试样本，增加跨年龄层用户比较，并结合更稳定的柔性材料与交互模块优化原型性能。在此基础上，传统文化元素与智能穿戴技术的融合有望形成更成熟的跨学科设计方法。"
      ],
      aiOptions: [
        "如果会议更偏技术，可以把未来工作改成“模块优化、响应速度、耐久性”。",
        "如果会议更偏设计，可以把未来工作改成“更多文化场景、更多服饰品类、更多体验评价”。"
      ],
      evidenceNeeds: ["确认限制项是否与实际一致", "确认未来工作方向是否需要收束"]
    }
  ],
  fullText: {
    abstract:
      "针对传统纹样在智能穿戴场景中难以完成语义转译与交互映射的问题，本文提出一套从文化元素提取、视觉语言抽象到智能服饰原型实现的设计路径。研究以非遗纹样为对象，构建纹样特征与服饰交互触点之间的映射规则，并完成可试穿原型。通过用户试穿测试与反馈分析，本文验证了该路径在文化辨识度、交互直观性和穿着体验上的可行性。研究为传统文化元素进入智能服饰设计提供了一种可复用的方法框架。",
    keywords: ["非遗纹样", "智能服饰", "交互设计", "用户体验", "设计研究"],
    sections: [
      {
        id: "intro",
        title: "1. 引言",
        content: [
          "随着可穿戴技术与情境交互设计的发展，智能服饰逐渐从功能载体转向兼具文化表达与体验价值的综合媒介。然而，在现有研究中，传统纹样元素往往停留在视觉装饰层面，尚未形成与交互逻辑、穿着情境和用户感知相协调的设计路径。",
          "针对这一问题，本文以非遗纹样为研究对象，建立从文化元素提取、视觉语言抽象到智能服饰交互映射的设计方法，并通过原型制作与用户测试验证其有效性。"
        ]
      },
      {
        id: "related",
        title: "2. 相关研究与理论基础",
        content: [
          "现有关于非遗纹样的研究主要集中于视觉风格整理、图案数字化保护与现代设计转译，而智能服饰研究更多围绕可穿戴交互、柔性传感与体验评价展开。",
          "本文将非遗纹样研究、智能服饰设计研究与用户体验研究三条线索并置，作为后续设计方法与结果分析的理论支撑。"
        ]
      },
      {
        id: "method",
        title: "3. 设计方法与原型实现",
        content: [
          "研究从纹样轮廓、节奏和象征语义三个维度提取设计要素，建立图形语义与交互反馈之间的映射规则，并据此完成智能服饰原型设计。",
          "在实现过程中，导电纤维与柔性传感模块被嵌入服装局部结构，使纹样同时承担装饰入口与反馈触发入口的双重角色。"
        ]
      },
      {
        id: "test",
        title: "4. 用户测试与结果分析",
        content: [
          "研究邀请目标用户对原型进行试穿与交互体验，围绕文化识别度、反馈理解度与穿着舒适性展开观察和访谈记录。",
          "结果表明，文化元素保留程度与交互反馈清晰度共同影响作品接受度，而舒适性则决定了用户是否愿意长时间使用该类产品。"
        ]
      },
      {
        id: "conclusion",
        title: "5. 结论与未来工作",
        content: [
          "本文提出并验证了一条适用于传统文化元素进入智能服饰场景的设计路径，说明文化语义、交互逻辑与穿着体验可以在同一原型中协同设计。",
          "未来工作将继续扩大样本规模，优化交互模块稳定性，并探索更多文化图样在智能穿戴中的应用方式。"
        ]
      }
    ]
  }
};

export function getProjectById(projectId: string) {
  if (projectId === demoProject.id) {
    return demoProject;
  }

  return null;
}
