# Supabase 设置指南

## 1. 创建 Supabase 项目

1. 访问 [Supabase](https://supabase.com/) 并登录
2. 点击 "New Project"
3. 填写项目名称（如：ei-workbench）
4. 选择区域（建议选择离你用户最近的区域）
5. 等待项目创建完成

## 2. 获取连接信息

项目创建完成后，在 Project Settings 中找到：

- **Project URL**: `https://your-project-ref.supabase.co`
- **Anon Key**: 在 Project Settings > API 中找到 `anon public`

## 3. 创建数据库表

在 Supabase Dashboard 中，进入 SQL Editor，执行以下 SQL：

```sql
-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  full_name TEXT,
  user_type TEXT DEFAULT 'student',
  institution TEXT,
  department TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 项目表
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  venue_id TEXT,
  user_id TEXT,
  status TEXT DEFAULT 'draft',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 项目版本表
CREATE TABLE IF NOT EXISTS project_versions (
  id SERIAL PRIMARY KEY,
  project_id TEXT NOT NULL,
  key TEXT NOT NULL,
  fingerprint TEXT,
  title TEXT,
  summary TEXT,
  payload JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- AI模型表
CREATE TABLE IF NOT EXISTS ai_models (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  base_url TEXT,
  api_key TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI模块配置表
CREATE TABLE IF NOT EXISTS ai_module_configs (
  id SERIAL PRIMARY KEY,
  module_key TEXT NOT NULL UNIQUE,
  module_name TEXT,
  model_id INTEGER,
  use_automatic BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (model_id) REFERENCES ai_models(id) ON DELETE SET NULL
);

-- 学术论文表
CREATE TABLE IF NOT EXISTS academic_papers (
  id SERIAL PRIMARY KEY,
  project_id TEXT,
  title TEXT NOT NULL,
  authors TEXT,
  abstract TEXT,
  keywords TEXT,
  venue TEXT,
  year INTEGER,
  doi TEXT,
  url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- 项目参考文献表
CREATE TABLE IF NOT EXISTS project_references (
  id SERIAL PRIMARY KEY,
  project_id TEXT NOT NULL,
  paper_id INTEGER NOT NULL,
  citation_key TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (paper_id) REFERENCES academic_papers(id) ON DELETE CASCADE
);

-- 项目协作者表
CREATE TABLE IF NOT EXISTS project_collaborators (
  id SERIAL PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'editor',
  permissions TEXT,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(project_id, user_id)
);

-- 项目变更历史表
CREATE TABLE IF NOT EXISTS project_changes (
  id SERIAL PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT,
  change_type TEXT NOT NULL,
  change_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 用户会话表
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## 4. 配置 Row Level Security (RLS)

为了安全起见，需要为表启用 RLS：

```sql
-- 启用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_versions ENABLE ROW LEVEL SECURITY;

-- 创建策略（示例）
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);
```

## 5. 配置环境变量

在 Vercel 中配置以下环境变量：

```
DB_TYPE=supabase
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

## 6. 测试连接

部署后，访问 `/api/monitoring/health` 检查数据库连接状态。

## 注意事项

1. **免费额度**: Supabase 免费版有数据库大小和请求次数限制
2. **备份**: 定期备份重要数据
3. **安全**: 不要将 `service_role` key 暴露给客户端
4. **性能**: 大表建议添加索引优化查询

## 常见问题

### 连接失败
- 检查 URL 和 Key 是否正确
- 确认项目状态正常
- 检查网络连接

### 权限错误
- 确认 RLS 策略配置正确
- 检查用户是否有相应权限

### 数据不保存
- 检查表结构是否正确
- 确认外键约束是否满足