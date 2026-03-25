# 跨学科时尚与设计 EI 论文工作台

这是一个面向服装服饰设计、艺术、时尚、人文、社科、技术及交叉学科的 EI 论文工作台前端原型。

## 当前已完成

- `Next.js + TypeScript` 前端骨架
- 项目首页
- 新建论文项目页
- 项目概览页
- 研究画像页
- 论文提纲页
- 章节写作页
- 检查与导出页
- 全局样式和演示数据
- `MiniMax / 联网搜索` 配置骨架
- 服务端 AI API 骨架

## 目录说明

- `app/`
  页面和全局样式
- `components/`
  可复用界面组件
- `lib/demo-data.ts`
  演示项目数据
- `docs/plans/`
  前面的架构、产品和页面设计文档

## 下一步建议

1. 安装依赖
2. 本地启动页面
3. 接主写作模型
4. 接联网搜索工具层
5. 再继续接数据库和接口

## 联网能力现状

- 现在还没有真正联网搜索
- 目前只是把配置骨架预留好了
- 参考配置在 `.env.example`
- 运行时读取逻辑在 `lib/ai-runtime.ts`
- 服务端状态接口在 `app/api/ai/status/route.ts`
- 服务端草稿生成接口在 `app/api/ai/draft/route.ts`

## 本地 TLS 说明

如果你本机的 Node HTTPS 环境报 `SELF_SIGNED_CERT_IN_CHAIN`，可以只在本地验证时使用：

- `npm run dev:local-insecure-tls`
- `npm run start:local-insecure-tls`

这两个脚本只对当前进程关闭 TLS 严格校验，不会修改系统全局配置。

## 密钥提醒

- 不要把真实 API Key 写进代码仓库
- 建议只放在本地 `.env.local`
- 如果真实密钥已经发到聊天里，建议立刻旋转

## 计划中的下一阶段

- 数据库表结构
- API 设计
- 参考文献与图文材料页
- 真实项目创建流程
- 导出与检查逻辑接入
