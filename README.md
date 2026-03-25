# 跨学科 EI 论文工作台

一个面向服装、设计、时尚、人文社科与技术交叉研究的 EI 会议论文生成与规范化工作台。

## 项目简介

本项目旨在帮助研究人员更高效地生成符合 EI 会议要求的论文，特别是针对跨学科研究领域。系统提供了从主题选择、大纲生成、章节写作到格式导出的完整工作流程。

## 核心功能

- **智能主题方向生成**：基于用户输入的主题，生成具体的研究方向建议
- **分阶段论文写作**：按章节生成内容，支持逐章修改和确认
- **会议规则适配**：根据目标会议的要求自动调整论文格式和结构
- **质量检查**：从学术性、逻辑性、完整性等多个维度评估论文质量
- **多格式导出**：支持导出 LaTeX、DOCX 和 PDF 格式
- **参考文献管理**：支持 BibTeX 导入和管理

## 技术栈

- **前端**：Next.js 15, React 19, TypeScript
- **后端**：Next.js API 路由
- **AI 集成**：支持多种 AI 模型（Minimax, Google Gemini）
- **数据库**：SQLite（开发环境）
- **样式**：CSS3（自定义变量和响应式设计）

## 快速开始

### 环境要求

- Node.js 18.0 或更高版本
- npm 或 yarn 包管理器

### 安装步骤

1. 克隆项目

```bash
git clone https://github.com/yourusername/ei-fashion-workbench.git
cd ei-fashion-workbench
```

2. 安装依赖

```bash
npm install
```

3. 配置环境变量

复制 `.env.example` 文件并重命名为 `.env`，然后填写相应的环境变量：

```bash
cp .env.example .env
```

4. 启动开发服务器

```bash
npm run dev
```

5. 访问应用

打开浏览器访问 `http://localhost:3000`

## 项目结构

```
├── app/                # Next.js 应用目录
│   ├── api/            # API 路由
│   ├── admin/          # 管理界面
│   ├── login/          # 登录页面
│   ├── profile/        # 用户个人资料
│   ├── projects/       # 项目管理
│   └── register/       # 注册页面
├── components/         # 可复用组件
├── docs/               # 文档目录
│   └── plans/          # 设计规划文档
├── lib/                # 核心库
│   ├── ai/             # AI 相关功能
│   ├── server/         # 服务器端功能
│   └── *.ts            # 通用工具函数
├── __tests__/          # 测试文件
├── .env.example        # 环境变量示例
├── next.config.ts      # Next.js 配置
├── package.json        # 项目配置和依赖
└── tsconfig.json       # TypeScript 配置
```

## 使用指南

### 1. 新建论文项目

- 访问 `/projects/new` 页面
- 输入研究主题、关键词和目标会议
- 选择论文类型

### 2. 生成论文大纲

- 系统会根据主题自动生成论文大纲
- 您可以调整大纲结构和内容

### 3. 逐章写作

- 进入 `/projects/[projectId]/writing` 页面
- 选择章节进行写作
- AI 会辅助生成章节内容
- 您可以编辑和确认每章内容

### 4. 质量检查

- 系统会自动检查论文质量
- 提供改进建议

### 5. 格式导出

- 进入 `/projects/[projectId]/export` 页面
- 选择导出格式（LaTeX、DOCX、PDF）
- 下载导出文件

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详见 LICENSE 文件

## 联系方式

- 项目维护者：[Your Name]
- 邮箱：[your.email@example.com]
- 项目链接：[https://github.com/yourusername/ei-fashion-workbench](https://github.com/yourusername/ei-fashion-workbench)
