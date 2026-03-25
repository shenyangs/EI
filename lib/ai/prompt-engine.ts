// AI驱动的动态Prompt生成引擎
// 核心理念：用AI生成Prompt，用AI评估内容，用AI动态调整

import { generatePaperDraft, getDefaultModel, type AIModel } from './ai-client';

// 领域定义
export type Domain = 
  | 'fashion-design'      // 服装设计
  | 'textile-engineering' // 纺织工程
  | 'interaction-design'  // 交互设计
  | 'digital-humanities'  // 数字人文
  | 'cultural-heritage'   // 文化遗产
  | 'smart-clothing'      // 智能服饰
  | 'user-experience'     // 用户体验
  | 'design-theory';      // 设计理论

// 研究类型
export type ResearchType =
  | 'experimental'        // 实验研究
  | 'design-case'         // 设计案例
  | 'theoretical'         // 理论研究
  | 'review'              // 综述
  | 'methodology'         // 方法论
  | 'application';        // 应用研究

// 内容质量等级
export type ContentQuality = 'excellent' | 'good' | 'acceptable' | 'poor';

// Prompt生成上下文
export interface PromptContext {
  domain: Domain;
  researchType: ResearchType;
  topic: string;
  keywords: string[];
  targetVenue?: string;
  userLevel: 'undergraduate' | 'master' | 'phd' | 'professor';
  language: 'zh' | 'en';
  depth: 'overview' | 'detailed' | 'expert';
  creativity: 'conservative' | 'balanced' | 'innovative';
}

// 生成的Prompt结构
export interface GeneratedPrompt {
  systemPrompt: string;
  userPrompt: string;
  qualityCriteria: QualityCriterion[];
  expectedOutput: ExpectedOutput;
  fallbackStrategy: FallbackStrategy;
}

// 质量评估维度
export interface QualityCriterion {
  name: string;
  weight: number;
  description: string;
  checkMethod: 'ai-evaluate' | 'regex-check' | 'length-check' | 'keyword-check';
  threshold: number;
}

// 预期输出结构
export interface ExpectedOutput {
  format: 'structured' | 'narrative' | 'json' | 'markdown';
  sections: OutputSection[];
  minLength: number;
  maxLength: number;
}

export interface OutputSection {
  name: string;
  required: boolean;
  description: string;
  evaluationPoints: string[];
}

// Fallback策略
export interface FallbackStrategy {
  triggerConditions: string[];
  fallbackPrompt: string;
  maxRetries: number;
}

// 领域专家角色定义
const DOMAIN_EXPERTS: Record<Domain, {
  role: string;
  expertise: string[];
  methodologies: string[];
  keyJournals: string[];
  researchTrends: string[];
}> = {
  'fashion-design': {
    role: '服装设计研究专家',
    expertise: ['服装美学', '可持续时尚', '数字化服装设计', '服装消费行为'],
    methodologies: ['设计民族志', '参与式设计', '原型测试', '视觉分析'],
    keyJournals: ['Fashion Practice', 'International Journal of Fashion Design', 'Sustainability'],
    researchTrends: ['可持续材料创新', '虚拟试衣技术', '慢时尚消费', '传统技艺数字化']
  },
  'textile-engineering': {
    role: '纺织工程专家',
    expertise: ['功能性纺织品', '智能纺织材料', '纺织制造工艺', '材料测试标准'],
    methodologies: ['材料表征分析', '性能测试', '工艺优化', '生命周期评估'],
    keyJournals: ['Textile Research Journal', 'Composites Part B', 'Materials & Design'],
    researchTrends: ['相变材料应用', '自清洁纺织品', '生物基纤维', '可穿戴传感器集成']
  },
  'interaction-design': {
    role: '交互设计研究专家',
    expertise: ['人机交互', '可穿戴交互', '触觉反馈', '多模态交互'],
    methodologies: ['用户研究', '原型迭代', '可用性测试', '体验评估'],
    keyJournals: ['CHI', 'UIST', 'TEI', 'Interaction Design and Architectures'],
    researchTrends: ['触觉界面', '情境感知系统', '无障碍设计', '情感计算']
  },
  'digital-humanities': {
    role: '数字人文研究专家',
    expertise: ['文化遗产数字化', '数字档案', '人文计算', '文化数据可视化'],
    methodologies: ['数字民族志', '文本挖掘', '网络分析', '可视化叙事'],
    keyJournals: ['Digital Humanities Quarterly', 'Cultural Analytics', 'Digital Scholarship'],
    researchTrends: ['AI辅助文化分析', '数字记忆', '开放文化数据', '沉浸式文化体验']
  },
  'cultural-heritage': {
    role: '文化遗产研究专家',
    expertise: ['传统技艺保护', '非遗数字化', '文化符号研究', '传承机制'],
    methodologies: ['田野调查', '口述史', '技艺记录', '传播分析'],
    keyJournals: ['Journal of Cultural Heritage', 'Heritage Science', 'Museum Management'],
    researchTrends: ['数字化保护', '活态传承', '文创转化', '社区参与']
  },
  'smart-clothing': {
    role: '智能服饰研究专家',
    expertise: ['可穿戴计算', '电子纺织品', '健康监测', '温控系统'],
    methodologies: ['系统集成', '传感器测试', '穿戴实验', '能耗分析'],
    keyJournals: ['IEEE Sensors', 'Advanced Materials Technologies', 'Biosensors'],
    researchTrends: ['柔性电子', '能量收集', '生理信号监测', '个性化适配']
  },
  'user-experience': {
    role: '用户体验研究专家',
    expertise: ['体验设计', '情感体验', '服务设计', '体验评估'],
    methodologies: ['体验采样', '日记研究', '深度访谈', '体验地图'],
    keyJournals: ['Behaviour & Information Technology', 'User Experience', 'Design Studies'],
    researchTrends: ['情感化设计', '体验量化', '跨设备体验', 'AI辅助体验设计']
  },
  'design-theory': {
    role: '设计理论研究专家',
    expertise: ['设计方法论', '设计知识', '设计思维', '批判性设计'],
    methodologies: ['理论建构', '案例研究', '比较分析', '概念分析'],
    keyJournals: ['Design Studies', 'Design Issues', 'CoDesign', 'She Ji'],
    researchTrends: ['设计知识系统化', '设计伦理', '后人类设计', '去殖民化设计']
  }
};

// Prompt模板生成器
class PromptTemplateGenerator {
  
  // 生成领域专家系统Prompt
  generateExpertSystemPrompt(context: PromptContext): string {
    const expert = DOMAIN_EXPERTS[context.domain];
    const depthGuide = this.getDepthGuide(context.depth);
    const creativityGuide = this.getCreativityGuide(context.creativity);
    
    return `你是一位资深的${expert.role}，在${expert.expertise.join('、')}等领域有深厚的研究积累。

你的专业背景：
- 熟悉${expert.methodologies.join('、')}等研究方法
- 长期关注${expert.keyJournals.join('、')}等权威期刊
- 对${expert.researchTrends.join('、')}等前沿趋势有深入洞察

你的写作风格：
${depthGuide}

你的创新倾向：
${creativityGuide}

你的核心原则：
1. 基于真实学术脉络分析问题，不编造不存在的理论或文献
2. 提供具体、可操作的研究建议，避免空泛的通用表述
3. 结合领域最新趋势，指出真正的研究机会（research gap）
4. 评估研究可行性时考虑实际的数据、技术、时间约束
5. 使用学术规范的语言，但保持表达的生动性和针对性

用户水平：${this.getUserLevelDescription(context.userLevel)}
输出语言：${context.language === 'zh' ? '中文' : '英文'}

重要提醒：
- 不要输出思考过程、推理标签或<think>内容
- 不要编造具体的参考文献（作者、年份、标题）
- 确保建议具有领域针对性，避免放之四海而皆准的通用建议`;
  }

  // 生成研究方向探索Prompt
  generateDirectionExplorationPrompt(context: PromptContext): string {
    const expert = DOMAIN_EXPERTS[context.domain];
    
    return `请基于以下主题，生成3-5个具有学术价值和可行性的研究方向：

【主题】${context.topic}
【关键词】${context.keywords.join('、')}
【目标会议/期刊】${context.targetVenue || '待定'}

对于每个研究方向，请提供：

1. **方向名称**（15字以内，准确概括核心研究问题）

2. **研究背景与动机**（2-3句）
   - 当前领域面临什么具体问题或挑战？
   - 为什么这个问题值得研究？

3. **核心研究问题**（1个主问题+2-3个子问题）
   - 主问题要具体、可回答
   - 子问题支撑主问题的不同维度

4. **研究创新点**（2-3点）
   - 与现有研究相比，这个方向的新意在哪里？
   - 理论贡献或实践价值是什么？

5. **建议的研究方法**（具体方法组合）
   - 数据收集：如何获取研究数据？（样本量、来源、采集方式）
   - 分析方法：使用什么理论框架或分析工具？
   - 验证方式：如何确保研究的可靠性？

6. **可行性评估**（按以下维度）
   - 数据可获取性：★☆☆☆☆ 到 ★★★★★
   - 技术难度：★☆☆☆☆ 到 ★★★★★
   - 时间成本：短期（3-6月）/中期（6-12月）/长期（1年+）
   - 资源需求：列出关键资源（设备、软件、合作方等）

7. **潜在风险与应对**
   - 可能遇到什么困难？
   - 如何规避或解决？

8. **相关研究脉络**（不编造具体文献，但描述研究 lineage）
   - 这个方向继承或回应了哪些已有研究？
   - 可能借鉴哪些相邻领域的理论或方法？

当前领域趋势参考：
${expert.researchTrends.map(t => `- ${t}`).join('\n')}

请确保每个方向都具有：
- 明确的学术价值（能解决真实问题或填补知识空白）
- 可操作的研究路径（不是空中楼阁）
- 领域针对性（体现${expert.role}的专业视角）`;
  }

  // 生成论文评审Prompt
  generateReviewPrompt(context: PromptContext & { content: string }): string {
    return `请对以下论文稿件进行专业评审，按照EI/SCI会议期刊的审稿标准进行评估。

【论文内容】
${context.content}

【论文信息】
- 领域：${DOMAIN_EXPERTS[context.domain].role}
- 目标会议/期刊：${context.targetVenue || '未指定'}
- 作者水平：${context.userLevel}

请按照以下维度进行详细评审：

---

## 一、整体评价

**质量评分**：X.X/10（保留一位小数）

**录用建议**：
- [ ] 直接录用（Strong Accept）
- [ ] 小修后录用（Accept with Minor Revisions）
- [ ] 大修后重审（Major Revisions）
- [ ] 拒稿（Reject）

**一句话总结**：用一句话概括论文的核心贡献和主要问题

---

## 二、详细评审维度

### 1. 研究问题与动机（权重20%）
**评分**：X/10
- 研究问题是否明确、具体？
- 研究动机是否充分？是否解决了真实存在的问题？
- 研究gap（空白点）是否清晰？

**具体问题**：
- [问题1]
- [问题2]

**改进建议**：
- [建议1]
- [建议2]

### 2. 创新性与贡献（权重25%）
**评分**：X/10
- 与现有工作相比，创新点是什么？
- 理论贡献或实践价值是否明确？
- 创新程度是否达到会议/期刊要求？

**具体问题**：
- [问题1]
- [问题2]

**改进建议**：
- [建议1]
- [建议2]

### 3. 研究方法与技术路线（权重20%）
**评分**：X/10
- 研究方法是否适合解决该问题？
- 技术路线是否清晰、可复现？
- 样本量/实验设计是否充分？
- 数据收集和分析是否规范？

**具体问题**：
- [问题1]
- [问题2]

**改进建议**：
- [建议1]
- [建议2]

### 4. 实验验证与结果（权重20%）
**评分**：X/10
- 实验设计是否合理？
- 结果是否充分支撑结论？
- 与baseline/现有方法的对比是否充分？
- 统计显著性是否报告？

**具体问题**：
- [问题1]
- [问题2]

**改进建议**：
- [建议1]
- [建议2]

### 5. 写作质量与规范（权重15%）
**评分**：X/10
- 结构是否清晰？逻辑是否连贯？
- 图表质量如何？是否清晰、规范？
- 引用是否充分、恰当？
- 语言表达是否准确、流畅？
- 是否存在语法错误或表述不清？

**具体问题**：
- [问题1]
- [问题2]

**改进建议**：
- [建议1]
- [建议2]

---

## 三、主要优点（列出3-5点）

1. [优点1]
2. [优点2]
3. [优点3]

---

## 四、主要问题（按优先级排序）

**致命问题**（必须解决，否则无法录用）：
- [问题1]

**严重问题**（大幅影响质量）：
- [问题1]
- [问题2]

**一般问题**（建议改进）：
- [问题1]
- [问题2]

---

## 五、具体修改建议（按章节）

### 摘要
- [建议1]
- [建议2]

### 引言
- [建议1]
- [建议2]

### 相关工作
- [建议1]
- [建议2]

### 方法
- [建议1]
- [建议2]

### 实验/结果
- [建议1]
- [建议2]

### 讨论
- [建议1]
- [建议2]

### 结论
- [建议1]
- [建议2]

---

## 六、给作者的建议

**如果继续这个研究**：
- [建议1]
- [建议2]

**如果重新定位**：
- [建议1]
- [建议2]

---

评审标准参考：
- 8-10分：优秀，创新性强，实验充分，写作规范
- 6-7分：良好，有小问题但可修改
- 4-5分：一般，需要大幅修改
- 1-3分：较差，建议拒稿或重写

请确保评审意见：
- 具体、可操作（避免"需要改进"这种空话）
- 有建设性（指出问题的同时给出解决方向）
- 符合领域规范（体现${DOMAIN_EXPERTS[context.domain].role}的专业判断）`;
  }

  // 辅助方法
  private getDepthGuide(depth: PromptContext['depth']): string {
    const guides = {
      overview: '- 提供宏观视角和关键要点\n- 适合快速了解领域概况\n- 突出最重要的概念和趋势',
      detailed: '- 深入分析具体问题和解决方案\n- 提供足够的技术细节\n- 平衡广度和深度',
      expert: '- 深入专业细节和前沿问题\n- 假设读者具备领域基础知识\n- 讨论复杂性和边界情况'
    };
    return guides[depth];
  }

  private getCreativityGuide(creativity: PromptContext['creativity']): string {
    const guides = {
      conservative: '- 优先选择经过验证的方法\n- 强调可靠性和可预测性\n- 在已有研究基础上小幅改进',
      balanced: '- 结合成熟方法与创新思路\n- 在可靠性和创新性之间平衡\n- 适度探索新方向',
      innovative: '- 鼓励突破性思路\n- 探索前沿和跨学科方法\n- 接受一定风险以追求更大创新'
    };
    return guides[creativity];
  }

  private getUserLevelDescription(level: PromptContext['userLevel']): string {
    const descriptions = {
      undergraduate: '本科生（需要更多基础概念解释和方法指导）',
      master: '硕士研究生（具备基础研究方法知识，需要深入指导）',
      phd: '博士研究生（具备独立研究能力，需要前沿洞察和批判性反馈）',
      professor: '教授/研究员（专家级对话，关注创新性和学术价值）'
    };
    return descriptions[level];
  }
}

// AI内容质量评估器
export class ContentQualityEvaluator {
  
  // 评估内容质量
  async evaluateContent(
    content: string,
    criteria: QualityCriterion[],
    context: PromptContext
  ): Promise<{ score: number; passed: boolean; feedback: string[] }> {
    const feedback: string[] = [];
    let totalScore = 0;
    let totalWeight = 0;

    for (const criterion of criteria) {
      const result = await this.evaluateCriterion(content, criterion, context);
      totalScore += result.score * criterion.weight;
      totalWeight += criterion.weight;
      if (!result.passed) {
        feedback.push(`${criterion.name}: ${result.feedback}`);
      }
    }

    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    const passed = finalScore >= 6.0; // 及格线6分

    return { score: finalScore, passed, feedback };
  }

  // 评估单个维度
  private async evaluateCriterion(
    content: string,
    criterion: QualityCriterion,
    context: PromptContext
  ): Promise<{ score: number; passed: boolean; feedback: string }> {
    switch (criterion.checkMethod) {
      case 'ai-evaluate':
        return this.aiEvaluate(content, criterion, context);
      case 'regex-check':
        return this.regexCheck(content, criterion);
      case 'length-check':
        return this.lengthCheck(content, criterion);
      case 'keyword-check':
        return this.keywordCheck(content, criterion);
      default:
        return { score: 5, passed: true, feedback: '未实现的质量检查方法' };
    }
  }

  // AI评估
  private async aiEvaluate(
    content: string,
    criterion: QualityCriterion,
    context: PromptContext
  ): Promise<{ score: number; passed: boolean; feedback: string }> {
    const evalPrompt = `请评估以下内容在"${criterion.name}"维度的质量。

评估标准：${criterion.description}

【待评估内容】
${content.substring(0, 2000)}...

请输出JSON格式：
{
  "score": 0-10的数字,
  "passed": true/false（是否达到${criterion.threshold}分）,
  "feedback": "具体评价和改进建议"
}`;

    try {
      const model = await getDefaultModel();
      if (!model) {
        return { score: 5, passed: false, feedback: '无法获取AI模型进行评估' };
      }

      const result = await generatePaperDraft({
        prompt: evalPrompt,
        temperature: 0.3,
        modelId: model.id
      });

      // 尝试解析JSON
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const evaluation = JSON.parse(jsonMatch[0]);
        return {
          score: evaluation.score || 5,
          passed: evaluation.score >= criterion.threshold,
          feedback: evaluation.feedback || '评估完成'
        };
      }
    } catch (error) {
      console.error('AI评估失败:', error);
    }

    return { score: 5, passed: false, feedback: '评估过程出错' };
  }

  // 正则检查
  private regexCheck(
    content: string,
    criterion: QualityCriterion
  ): { score: number; passed: boolean; feedback: string } {
    // 检查是否包含空洞词汇
    const vaguePatterns = [
      /很重要/g, /非常有意义/g, /具有重要价值/g,
      /值得研究/g, /有待进一步/g, /具有重要意义/g
    ];
    
    let vagueCount = 0;
    for (const pattern of vaguePatterns) {
      const matches = content.match(pattern);
      if (matches) vagueCount += matches.length;
    }

    const score = Math.max(0, 10 - vagueCount * 2);
    return {
      score,
      passed: score >= criterion.threshold,
      feedback: vagueCount > 0 ? `检测到${vagueCount}处空洞表述` : '表述具体'
    };
  }

  // 长度检查
  private lengthCheck(
    content: string,
    criterion: QualityCriterion
  ): { score: number; passed: boolean; feedback: string } {
    const length = content.length;
    const minLength = criterion.threshold;
    
    if (length < minLength) {
      return {
        score: (length / minLength) * 10,
        passed: false,
        feedback: `内容长度${length}，低于要求${minLength}`
      };
    }
    return { score: 10, passed: true, feedback: '长度符合要求' };
  }

  // 关键词检查
  private keywordCheck(
    content: string,
    criterion: QualityCriterion
  ): { score: number; passed: boolean; feedback: string } {
    // 检查是否包含必要的学术关键词
    const requiredKeywords = ['方法', '数据', '分析', '结果', '结论'];
    const found = requiredKeywords.filter(kw => content.includes(kw));
    const score = (found.length / requiredKeywords.length) * 10;
    
    return {
      score,
      passed: score >= criterion.threshold,
      feedback: `包含${found.length}/${requiredKeywords.length}个必要关键词`
    };
  }
}

// Prompt生成器实例
const promptGenerator = new PromptTemplateGenerator();
const qualityEvaluator = new ContentQualityEvaluator();

// 导出主要功能
export async function generateDynamicPrompt(
  context: PromptContext
): Promise<GeneratedPrompt> {
  const systemPrompt = promptGenerator.generateExpertSystemPrompt(context);
  const userPrompt = promptGenerator.generateDirectionExplorationPrompt(context);

  return {
    systemPrompt,
    userPrompt,
    qualityCriteria: [
      {
        name: '内容具体性',
        weight: 0.25,
        description: '避免空洞表述，提供具体、可操作的建议',
        checkMethod: 'regex-check',
        threshold: 7
      },
      {
        name: '领域针对性',
        weight: 0.25,
        description: '体现领域专业视角，不是通用建议',
        checkMethod: 'ai-evaluate',
        threshold: 7
      },
      {
        name: '学术规范性',
        weight: 0.2,
        description: '符合学术写作规范，逻辑清晰',
        checkMethod: 'ai-evaluate',
        threshold: 6
      },
      {
        name: '创新价值',
        weight: 0.2,
        description: '具有研究价值，不是重复性工作',
        checkMethod: 'ai-evaluate',
        threshold: 6
      },
      {
        name: '可行性',
        weight: 0.1,
        description: '研究方案具有可操作性',
        checkMethod: 'ai-evaluate',
        threshold: 6
      }
    ],
    expectedOutput: {
      format: 'structured',
      sections: [
        { name: '方向名称', required: true, description: '准确概括核心研究问题', evaluationPoints: ['简洁', '准确', '有吸引力'] },
        { name: '研究背景', required: true, description: '说明研究动机和重要性', evaluationPoints: ['真实', '具体', '有说服力'] },
        { name: '核心问题', required: true, description: '明确的研究问题', evaluationPoints: ['具体', '可回答', '有学术价值'] },
        { name: '创新点', required: true, description: '与现有研究的差异', evaluationPoints: ['清晰', '有价值', '可实现'] },
        { name: '研究方法', required: true, description: '具体的研究路径', evaluationPoints: ['合适', '详细', '可复现'] },
        { name: '可行性评估', required: true, description: '实际可行性分析', evaluationPoints: ['全面', '客观', '有数据支撑'] }
      ],
      minLength: 800,
      maxLength: 3000
    },
    fallbackStrategy: {
      triggerConditions: ['内容质量评分低于6分', '缺少必要章节', '包含虚假信息'],
      fallbackPrompt: '请重新生成，确保内容具体、有深度、符合学术规范',
      maxRetries: 2
    }
  };
}

export async function evaluateContentQuality(
  content: string,
  context: PromptContext
): Promise<{ score: number; passed: boolean; feedback: string[] }> {
  const prompt = await generateDynamicPrompt(context);
  return qualityEvaluator.evaluateContent(content, prompt.qualityCriteria, context);
}

export { promptGenerator, qualityEvaluator, DOMAIN_EXPERTS };
export default promptGenerator;
