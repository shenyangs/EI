# 部署检查清单

## 环境变量配置

以下环境变量必须在 Vercel 面板中配置：

### 核心配置
- `JWT_SECRET` - JWT 密钥，至少 32 字符
- `DB_TYPE` - 数据库类型，设置为 `supabase`
- `SUPABASE_URL` - Supabase 项目 URL
- `SUPABASE_ANON_KEY` - Supabase 匿名访问密钥

### AI 模型配置
- `MINIMAX_API_KEY` - MiniMax API 密钥
- `MINIMAX_MODEL` - MiniMax 模型名称，默认 `MiniMax-M2.7`
- `MINIMAX_BASE_URL` - MiniMax API 基础 URL，默认 `https://api.minimaxi.com/v1`
- `AI_PROVIDER` - AI 提供商，默认 `minimax`

### 可选配置
- `GEMINI_API_KEY` - Gemini API 密钥（如果使用 Gemini）
- `GEMINI_MODEL` - Gemini 模型名称，默认 `gemini-pro`
- `GEMINI_BASE_URL` - Gemini API 基础 URL，默认 `https://generativelanguage.googleapis.com/v1beta`

## 部署步骤

1. **Supabase 配置**
   - 创建 Supabase 项目
   - 在 Supabase 控制台中创建数据库表结构
   - 获取项目 URL 和匿名密钥

2. **Vercel 配置**
   - 在 Vercel 中导入项目
   - 配置上述环境变量
   - 设置构建命令：`npm run build`
   - 设置输出目录：`.next`

3. **数据库迁移**
   - 确保 Supabase 数据库表结构正确
   - 测试数据库连接

4. **AI 服务配置**
   - 确保 MiniMax API 密钥有效
   - 测试 AI 模型连接

5. **测试部署**
   - 访问部署后的网站
   - 测试用户注册/登录
   - 测试 AI 生成功能
   - 测试项目保存和加载

## 常见问题排查

### 数据库连接失败
- 检查 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY` 是否正确
- 确保 Supabase 项目状态正常
- 检查网络连接

### AI 模型调用失败
- 检查 `MINIMAX_API_KEY` 是否有效
- 确保 API 密钥有足够的配额
- 检查网络连接

### 环境变量缺失
- 确保所有必需的环境变量都已配置
- 检查环境变量名称是否正确
- 重新部署以应用新的环境变量

## 性能优化

- 启用 Vercel 边缘函数（Edge Functions）
- 配置适当的缓存策略
- 优化 AI 模型调用频率

## 安全注意事项

- 不要在代码中硬编码 API 密钥
- 使用 Vercel 环境变量管理敏感信息
- 定期轮换 JWT_SECRET
- 限制 Supabase 密钥的权限范围