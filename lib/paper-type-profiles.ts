export type PaperCategory = 
  | "ei-conference" 
  | "sci-journal" 
  | "core-journal" 
  | "degree-thesis" 
  | "academic-conference" 
  | "blog-technical";

export type PaperTypeProfile = {
  id: PaperCategory;
  category: string;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  requirements: {
    abstract: string;
    keywords: string;
    length: string;
    structure: string;
    references: string;
    figures: string;
  };
  guidance: {
    preparation: string[];
    writing: string[];
    submission: string[];
  };
  onboardingSteps: {
    step: number;
    title: string;
    description: string;
    action: string;
  }[];
  suitableVenues: string[];
  writingStyle: {
    tone: string;
    depth: string;
    audience: string;
  };
  aiPromptHints: string[];
};

export const paperTypeProfiles: PaperTypeProfile[] = [
  {
    id: "ei-conference",
    category: "国际会议",
    name: "EI会议论文",
    shortName: "EI会议",
    description: "工程索引(EI)收录的国际会议论文，侧重工程技术应用与创新，要求有明确的实验验证或原型实现",
    icon: "🔬",
    requirements: {
      abstract: "150-300字，需包含研究背景、方法、主要结果和结论",
      keywords: "4-6个关键词，建议包含技术领域和应用场景",
      length: "通常4-8页，约5000-8000字（含图表）",
      structure: "引言、相关工作、方法/设计、实验/验证、结果分析、结论、参考文献",
      references: "IEEE或ACM格式，建议15-25篇，以近5年文献为主",
      figures: "图表需清晰，建议3-6个核心图表，标注规范"
    },
    guidance: {
      preparation: [
        "明确研究的工程问题和技术创新点",
        "准备充分的实验数据或原型验证材料",
        "调研目标会议的往届论文风格和录用偏好",
        "确保研究有实际应用价值或工程意义"
      ],
      writing: [
        "突出技术贡献和创新点",
        "实验部分需详实可复现",
        "与现有工作进行充分对比分析",
        "结论部分强调工程应用价值"
      ],
      submission: [
        "严格按照会议模板排版",
        "注意截稿日期和时区",
        "准备好作者声明和版权协议",
        "部分会议需要提前注册或提交摘要"
      ]
    },
    onboardingSteps: [
      {
        step: 1,
        title: "选择目标会议",
        description: "确定要投稿的EI会议，了解会议主题、截稿日期和录用率",
        action: "浏览推荐会议列表"
      },
      {
        step: 2,
        title: "确定研究主题",
        description: "输入你的研究想法，AI将帮助分析适合的切入点和创新方向",
        action: "开始主题分析"
      },
      {
        step: 3,
        title: "生成论文框架",
        description: "AI根据会议要求和研究主题，生成符合规范的论文大纲",
        action: "生成框架建议"
      },
      {
        step: 4,
        title: "分章节写作",
        description: "按章节逐步完成论文内容，AI提供写作建议和学术表达优化",
        action: "开始写作"
      }
    ],
    suitableVenues: ["IEEE ICCCI", "IEEE ICIEA", "ACM SIGGRAPH", "ACM CHI", "Springer LNCS系列"],
    writingStyle: {
      tone: "客观严谨，突出技术创新",
      depth: "中等深度，强调工程实现",
      audience: "同领域研究人员和工程师"
    },
    aiPromptHints: [
      "强调技术创新点和工程应用价值",
      "实验部分需要详细的数据支撑",
      "与现有方法进行对比分析",
      "结论部分突出实际意义"
    ]
  },
  {
    id: "sci-journal",
    category: "国际期刊",
    name: "SCI期刊论文",
    shortName: "SCI期刊",
    description: "科学引文索引(SCI)收录的国际期刊论文，要求理论创新性强、实验充分、学术贡献明确",
    icon: "📚",
    requirements: {
      abstract: "200-350字，结构化摘要，包含背景、目的、方法、结果、结论",
      keywords: "5-8个关键词，需覆盖研究领域的核心概念",
      length: "通常6000-12000字，具体视期刊要求而定",
      structure: "摘要、引言、文献综述、研究方法、结果与讨论、结论、参考文献",
      references: "APA或期刊指定格式，建议30-50篇，覆盖领域经典和最新研究",
      figures: "高质量图表，建议5-10个，需有详细的图注说明"
    },
    guidance: {
      preparation: [
        "深入调研目标期刊的发文风格和审稿标准",
        "确保研究有明确的理论创新或方法学贡献",
        "准备充分的实验数据和统计分析",
        "撰写详细的文献综述，定位研究的学术价值"
      ],
      writing: [
        "理论框架需完整清晰",
        "研究方法需详实可复现",
        "讨论部分需深入分析结果的理论意义",
        "承认研究局限性，提出未来研究方向"
      ],
      submission: [
        "撰写高质量的Cover Letter",
        "准备作者贡献声明和利益冲突声明",
        "确保格式完全符合期刊要求",
        "准备好审稿人建议名单"
      ]
    },
    onboardingSteps: [
      {
        step: 1,
        title: "选择目标期刊",
        description: "根据研究领域选择合适的SCI期刊，了解影响因子和审稿周期",
        action: "浏览期刊推荐"
      },
      {
        step: 2,
        title: "文献调研",
        description: "AI帮助你快速了解领域研究现状，定位研究的创新空间",
        action: "开始文献分析"
      },
      {
        step: 3,
        title: "构建理论框架",
        description: "梳理研究问题、理论基础和研究假设",
        action: "构建框架"
      },
      {
        step: 4,
        title: "深度写作",
        description: "按期刊要求完成各章节，AI提供学术表达优化",
        action: "开始写作"
      }
    ],
    suitableVenues: ["Nature系列", "Science系列", "IEEE Transactions系列", "ACM Transactions系列", "Elsevier期刊"],
    writingStyle: {
      tone: "学术严谨，理论深度强",
      depth: "深度分析，强调理论贡献",
      audience: "领域专家和学术研究者"
    },
    aiPromptHints: [
      "强调理论创新和学术贡献",
      "文献综述需要全面深入",
      "讨论部分需要理论升华",
      "方法论需要详细可复现"
    ]
  },
  {
    id: "core-journal",
    category: "国内期刊",
    name: "核心期刊论文",
    shortName: "核心期刊",
    description: "国内核心期刊（北大核心、南大核心、科技核心）论文，注重学术规范和中文表达",
    icon: "📖",
    requirements: {
      abstract: "200-300字，中文摘要需包含研究目的、方法、结果和结论",
      keywords: "4-6个关键词，中英文对照",
      length: "通常5000-8000字，部分期刊要求更长",
      structure: "摘要、关键词、引言、研究方法、结果分析、结论、参考文献",
      references: "GB/T 7714格式，建议15-30篇，中英文文献兼顾",
      figures: "图表需有中英文对照标题，格式规范"
    },
    guidance: {
      preparation: [
        "了解目标期刊的办刊宗旨和收稿范围",
        "确保研究符合国内学术规范",
        "准备中英文摘要和关键词",
        "注意国内期刊的特殊格式要求"
      ],
      writing: [
        "中文表达需准确流畅",
        "引用国内相关研究成果",
        "注意学术不端检测要求",
        "结论需有实践指导意义"
      ],
      submission: [
        "通过期刊投稿系统提交",
        "准备作者简介和基金项目信息",
        "注意查重率要求（通常<15%）",
        "部分期刊需要推荐信"
      ]
    },
    onboardingSteps: [
      {
        step: 1,
        title: "选择目标期刊",
        description: "根据研究领域选择核心期刊，了解期刊级别和审稿周期",
        action: "浏览核心期刊列表"
      },
      {
        step: 2,
        title: "确定研究主题",
        description: "输入研究想法，AI帮助分析适合的期刊定位",
        action: "分析主题定位"
      },
      {
        step: 3,
        title: "撰写论文",
        description: "按照中文期刊规范完成论文写作",
        action: "开始写作"
      },
      {
        step: 4,
        title: "格式检查",
        description: "AI帮助检查格式规范和查重预警",
        action: "开始检查"
      }
    ],
    suitableVenues: ["北大核心期刊", "CSSCI来源期刊", "科技核心期刊", "CSCD来源期刊"],
    writingStyle: {
      tone: "规范严谨，注重实践意义",
      depth: "中等深度，强调应用价值",
      audience: "国内学者和行业从业者"
    },
    aiPromptHints: [
      "中文表达需准确规范",
      "引用国内相关研究",
      "强调实践应用价值",
      "注意学术规范要求"
    ]
  },
  {
    id: "degree-thesis",
    category: "学位论文",
    name: "学位论文",
    shortName: "学位论文",
    description: "硕士或博士学位论文，要求系统性研究、完整论证和独立学术贡献",
    icon: "🎓",
    requirements: {
      abstract: "硕士500-1000字，博士1000-2000字，中英文摘要",
      keywords: "5-8个关键词，中英文对照",
      length: "硕士3-5万字，博士8-15万字",
      structure: "摘要、目录、绪论、文献综述、研究方法、研究结果、讨论、结论、参考文献、附录",
      references: "GB/T 7714格式，硕士50+篇，博士100+篇",
      figures: "图表规范，编号连续，标题完整"
    },
    guidance: {
      preparation: [
        "与导师充分沟通研究方向",
        "制定详细的研究计划和时间表",
        "进行系统的文献调研",
        "准备开题报告和中期检查"
      ],
      writing: [
        "绪论需阐述研究背景和意义",
        "文献综述需全面系统",
        "研究方法需详实可复现",
        "讨论需深入分析理论贡献"
      ],
      submission: [
        "通过学校论文检测系统",
        "准备答辩PPT和答辩稿",
        "提交学位申请材料",
        "准备答辩问题预案"
      ]
    },
    onboardingSteps: [
      {
        step: 1,
        title: "确定研究方向",
        description: "与导师沟通后确定研究方向，AI帮助梳理研究思路",
        action: "开始研究方向分析"
      },
      {
        step: 2,
        title: "文献综述",
        description: "系统性梳理领域文献，构建研究框架",
        action: "开始文献梳理"
      },
      {
        step: 3,
        title: "论文写作",
        description: "按学位论文规范完成各章节写作",
        action: "开始写作"
      },
      {
        step: 4,
        title: "答辩准备",
        description: "准备答辩材料，AI帮助预测答辩问题",
        action: "准备答辩"
      }
    ],
    suitableVenues: ["硕士学位论文", "博士学位论文"],
    writingStyle: {
      tone: "学术规范，论证严密",
      depth: "深度研究，系统性完整",
      audience: "答辩委员会和同行专家"
    },
    aiPromptHints: [
      "研究需要系统性和完整性",
      "文献综述需要全面深入",
      "方法论需要详细说明",
      "创新点需要明确阐述"
    ]
  },
  {
    id: "academic-conference",
    category: "学术会议",
    name: "学术会议论文",
    shortName: "学术会议",
    description: "各类学术会议论文，包括国内学术会议、国际研讨会等，注重学术交流和新观点分享",
    icon: "🎤",
    requirements: {
      abstract: "150-300字，简洁明了地介绍研究内容",
      keywords: "3-5个关键词",
      length: "通常4-10页，视会议要求而定",
      structure: "摘要、引言、方法/分析、结果、结论、参考文献",
      references: "按会议指定格式，建议10-20篇",
      figures: "适量图表，清晰展示核心内容"
    },
    guidance: {
      preparation: [
        "了解会议主题和征稿范围",
        "准备会议演讲PPT",
        "注意会议的截稿日期",
        "了解会议的学术影响力"
      ],
      writing: [
        "突出研究的新颖性",
        "内容精炼，重点突出",
        "适合口头报告或海报展示",
        "预留讨论和交流空间"
      ],
      submission: [
        "按会议模板排版",
        "准备作者注册信息",
        "部分会议需要提前缴费",
        "准备会议演讲材料"
      ]
    },
    onboardingSteps: [
      {
        step: 1,
        title: "选择目标会议",
        description: "根据研究领域选择合适的学术会议",
        action: "浏览会议列表"
      },
      {
        step: 2,
        title: "准备论文",
        description: "按照会议要求撰写论文",
        action: "开始写作"
      },
      {
        step: 3,
        title: "准备演讲",
        description: "准备会议演讲或海报展示材料",
        action: "准备材料"
      }
    ],
    suitableVenues: ["国内学术年会", "国际研讨会", "专业学会会议", "研究生论坛"],
    writingStyle: {
      tone: "学术交流，观点新颖",
      depth: "中等深度，适合交流",
      audience: "会议参会者"
    },
    aiPromptHints: [
      "突出研究的新颖性和创新点",
      "内容精炼适合会议报告",
      "预留讨论空间",
      "适合口头或海报展示"
    ]
  },
  {
    id: "blog-technical",
    category: "技术文章",
    name: "博客/技术文章",
    shortName: "技术文章",
    description: "技术博客、科普文章或行业分析文章，注重可读性和实用价值",
    icon: "✍️",
    requirements: {
      abstract: "可选，通常用简短引言代替",
      keywords: "3-5个标签",
      length: "灵活，通常2000-5000字",
      structure: "引言、核心内容、总结、延伸阅读",
      references: "可选，建议标注参考来源",
      figures: "适量配图，增强可读性"
    },
    guidance: {
      preparation: [
        "确定目标读者群体",
        "选择有吸引力的主题",
        "准备案例和实例",
        "规划文章结构"
      ],
      writing: [
        "语言通俗易懂",
        "使用实例和案例说明",
        "适当使用图表增强表达",
        "提供实用建议或总结"
      ],
      submission: [
        "选择合适的发布平台",
        "优化标题和摘要",
        "添加适当的标签",
        "准备推广计划"
      ]
    },
    onboardingSteps: [
      {
        step: 1,
        title: "确定主题",
        description: "选择有吸引力的技术主题",
        action: "开始主题分析"
      },
      {
        step: 2,
        title: "规划结构",
        description: "设计文章结构和内容框架",
        action: "开始规划"
      },
      {
        step: 3,
        title: "撰写文章",
        description: "用通俗易懂的语言完成写作",
        action: "开始写作"
      }
    ],
    suitableVenues: ["技术博客平台", "公众号", "知乎专栏", "掘金", "CSDN"],
    writingStyle: {
      tone: "通俗易懂，实用性强",
      depth: "适度深入，注重应用",
      audience: "技术从业者和爱好者"
    },
    aiPromptHints: [
      "语言通俗易懂",
      "使用实例和案例",
      "提供实用建议",
      "适当使用图表"
    ]
  }
];

export function getPaperTypeById(id?: PaperCategory | null): PaperTypeProfile {
  if (!id) {
    return paperTypeProfiles[0];
  }
  
  return paperTypeProfiles.find((item) => item.id === id) ?? paperTypeProfiles[0];
}

export function getPaperTypeGuidance(paperType: PaperCategory): string {
  const profile = getPaperTypeById(paperType);
  return `您选择了${profile.name}，以下是AI为您准备的写作建议：

【格式要求】
• 摘要：${profile.requirements.abstract}
• 关键词：${profile.requirements.keywords}
• 篇幅：${profile.requirements.length}
• 结构：${profile.requirements.structure}

【写作风格】
• 语调：${profile.writingStyle.tone}
• 深度：${profile.writingStyle.depth}
• 目标读者：${profile.writingStyle.audience}

【准备建议】
${profile.guidance.preparation.map((item, index) => `${index + 1}. ${item}`).join('\n')}

【写作要点】
${profile.guidance.writing.map((item, index) => `${index + 1}. ${item}`).join('\n')}`;
}
