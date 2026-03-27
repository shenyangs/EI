// 类型定义
export interface Project {
  id: string;
  title: string;
  subject?: string;
  keywords?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  venueId?: string;
}

export interface ProjectVersion {
  id: number;
  projectId: string;
  key: string;
  fingerprint: string;
  title: string;
  summary: string;
  payload: any;
  createdAt: string;
}

export interface AIModel {
  id: number;
  name: string;
  provider: string;
  model: string;
  baseUrl: string;
  apiKey: string;
  isDefault: boolean;
  createdAt: string;
}

export interface AiModuleConfig {
  id: number;
  moduleKey: string;
  moduleName: string;
  modelId: number;
  useAutomatic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  fullName: string;
  userType: string;
  institution: string;
  department: string;
  createdAt: string;
  updatedAt: string;
}

// 内存存储模拟数据库
type MemoryStore = {
  projects: Project[];
  projectVersions: ProjectVersion[];
  academicPapers: any[];
  projectReferences: any[];
  aiModels: AIModel[];
  aiModuleConfigs: AiModuleConfig[];
  users: User[];
};

function createMemoryStore(): MemoryStore {
  return {
    projects: [],
    projectVersions: [],
    academicPapers: [],
    projectReferences: [],
    aiModels: [],
    aiModuleConfigs: [],
    users: []
  };
}

declare global {
  var __EI_MEMORY_STORE__: MemoryStore | undefined;
}

export const memoryStore: MemoryStore = globalThis.__EI_MEMORY_STORE__ || createMemoryStore();

if (!globalThis.__EI_MEMORY_STORE__) {
  globalThis.__EI_MEMORY_STORE__ = memoryStore;
}

// 数据库接口
export interface Database {
  run: (sql: string, params?: any[]) => Promise<void>;
  get: (sql: string, params?: any[]) => Promise<any>;
  all: (sql: string, params?: any[]) => Promise<any[]>;
  lastID: number;
}

// SQL执行器类
class SqlExecutor {
  private store: typeof memoryStore;

  constructor(store: typeof memoryStore) {
    this.store = store;
  }

  // 执行 INSERT/UPDATE/DELETE 语句
  async run(sql: string, params?: any[]): Promise<void> {
    console.log('Executing SQL:', sql, params);

    if (sql.includes('INSERT INTO projects')) {
      this.handleInsertProjects(params);
    } else if (sql.includes('UPDATE projects')) {
      this.handleUpdateProjects(params);
    } else if (sql.includes('DELETE FROM projects')) {
      this.handleDeleteProjects(params);
    } else if (sql.includes('INSERT INTO project_versions')) {
      this.handleInsertProjectVersions(params);
    } else if (sql.includes('INSERT INTO ai_models')) {
      this.handleInsertAiModels(params);
    } else if (sql.includes('INSERT INTO ai_module_configs')) {
      this.handleInsertAiModuleConfigs(params);
    } else if (sql.includes('UPDATE ai_module_configs')) {
      this.handleUpdateAiModuleConfigs(params);
    } else if (sql.includes('UPDATE ai_models')) {
      this.handleUpdateAiModels(params);
    } else if (sql.includes('DELETE FROM ai_models')) {
      this.handleDeleteAiModels(params);
    } else if (sql.includes('INSERT INTO users')) {
      this.handleInsertUsers(params);
    }
  }

  // 执行单条SELECT语句
  async get(sql: string, params?: any[]): Promise<any> {
    console.log('Executing SQL:', sql, params);

    if (sql.includes('SELECT * FROM projects WHERE id =')) {
      return this.handleGetProjectById(params);
    } else if (sql.includes('SELECT * FROM project_versions WHERE projectId =')) {
      return this.handleGetProjectVersion(params);
    } else if (sql.includes('SELECT * FROM ai_models WHERE id =')) {
      return this.handleGetAiModelById(params);
    } else if (sql.includes('SELECT * FROM ai_models WHERE isDefault = 1')) {
      return this.handleGetDefaultAiModel();
    } else if (sql.includes('SELECT * FROM ai_module_configs WHERE moduleKey =')) {
      return this.handleGetAiModuleConfig(params);
    } else if (sql.includes('SELECT * FROM ai_module_configs')) {
      return this.store.aiModuleConfigs;
    } else if (sql.includes('SELECT * FROM users WHERE email =')) {
      return this.handleGetUserByEmail(params);
    } else if (sql.includes('SELECT * FROM users WHERE id =')) {
      return this.handleGetUserById(params);
    }

    return null;
  }

  // 执行多条SELECT语句
  async all(sql: string, params?: any[]): Promise<any[]> {
    console.log('Executing SQL:', sql, params);

    if (sql.includes('SELECT * FROM projects')) {
      return this.store.projects;
    } else if (sql.includes('SELECT * FROM project_versions')) {
      return this.handleGetProjectVersions(params);
    } else if (sql.includes('SELECT * FROM ai_models WHERE provider =')) {
      return this.handleGetAiModelsByProvider(params);
    } else if (sql.includes('SELECT * FROM ai_models')) {
      return this.store.aiModels;
    } else if (sql.includes('SELECT * FROM ai_module_configs')) {
      return this.store.aiModuleConfigs;
    } else if (sql.includes('SELECT * FROM users WHERE email =')) {
      return this.handleGetUsersByEmail(params);
    } else if (sql.includes('SELECT * FROM users WHERE id =')) {
      return this.handleGetUsersById(params);
    } else if (sql.includes('SELECT * FROM users')) {
      return this.store.users;
    }

    return [];
  }

  // 处理INSERT INTO projects
  private handleInsertProjects(params?: any[]): void {
    if ((params || []).length === 6) {
      const [id, title, description, createdAt, updatedAt, venueId] = params || [];
      this.store.projects.push({
        id,
        title,
        subject: '',
        keywords: '',
        description,
        createdAt,
        updatedAt,
        venueId
      });
      return;
    }

    const [id, title, subject, keywords, description, createdAt, updatedAt, venueId] = params || [];
    this.store.projects.push({
      id,
      title,
      subject,
      keywords,
      description,
      createdAt,
      updatedAt,
      venueId
    });
  }

  // 处理INSERT INTO project_versions
  private handleInsertProjectVersions(params?: any[]): void {
    const [projectId, key, fingerprint, title, summary, payload, createdAt] = params || [];
    this.store.projectVersions.push({
      id: this.store.projectVersions.length + 1,
      projectId,
      key,
      fingerprint,
      title,
      summary,
      payload,
      createdAt
    });
  }

  // 处理INSERT INTO ai_models
  private handleInsertAiModels(params?: any[]): void {
    let id;
    let name;
    let provider;
    let model;
    let baseUrl;
    let apiKey;
    let isDefault;
    let createdAt;

    if ((params || []).length === 7) {
      [name, provider, model, baseUrl, apiKey, isDefault, createdAt] = params || [];
    } else {
      [id, name, provider, model, baseUrl, apiKey, isDefault, createdAt] = params || [];
    }

    this.store.aiModels.push({
      id: id || this.store.aiModels.length + 1,
      name,
      provider,
      model,
      baseUrl,
      apiKey,
      isDefault,
      createdAt
    });
  }

  // 处理INSERT INTO ai_module_configs
  private handleInsertAiModuleConfigs(params?: any[]): void {
    const [id, moduleKey, moduleName, modelId, useAutomatic, createdAt, updatedAt] = params || [];
    this.store.aiModuleConfigs.push({
      id: id || this.store.aiModuleConfigs.length + 1,
      moduleKey,
      moduleName,
      modelId,
      useAutomatic,
      createdAt,
      updatedAt
    });
  }

  // 处理UPDATE ai_module_configs
  private handleUpdateAiModuleConfigs(params?: any[]): void {
    const [modelId, useAutomatic, updatedAt, moduleKey] = params || [];
    const index = this.store.aiModuleConfigs.findIndex(c => c.moduleKey === moduleKey);
    if (index !== -1) {
      this.store.aiModuleConfigs[index] = {
        ...this.store.aiModuleConfigs[index],
        modelId,
        useAutomatic,
        updatedAt
      };
    } else {
      const now = new Date().toISOString();
      this.store.aiModuleConfigs.push({
        id: this.store.aiModuleConfigs.length + 1,
        moduleKey,
        moduleName: moduleKey,
        modelId,
        useAutomatic,
        createdAt: now,
        updatedAt: now
      });
    }
  }

  // 处理UPDATE ai_models
  private handleUpdateAiModels(params?: any[]): void {
    if ((params || []).length === 2) {
      const [isDefault, id] = params || [];
      const index = this.store.aiModels.findIndex(m => m.id === id);
      if (index !== -1) {
        this.store.aiModels[index] = {
          ...this.store.aiModels[index],
          isDefault
        };
      }
      return;
    }

    const [name, provider, model, baseUrl, apiKey, isDefault, id] = params || [];
    const index = this.store.aiModels.findIndex(m => m.id === id);
    if (index !== -1) {
      this.store.aiModels[index] = {
        ...this.store.aiModels[index],
        name,
        provider,
        model,
        baseUrl,
        apiKey,
        isDefault
      };
    }
  }

  // 处理 DELETE FROM ai_models
  private handleDeleteAiModels(params?: any[]): void {
    const [id] = params || [];
    this.store.aiModels = this.store.aiModels.filter(m => m.id !== id);
  }

  // 处理 UPDATE projects
  private handleUpdateProjects(params?: any[]): void {
    // params 顺序：title, subject, keywords, description, updatedAt, venueId, id
    const [title, subject, keywords, description, updatedAt, venueId, id] = params || [];
    const index = this.store.projects.findIndex(p => p.id === id);
    if (index !== -1) {
      const project = this.store.projects[index];
      this.store.projects[index] = {
        ...project,
        title: title !== undefined ? title : project.title,
        subject: subject !== undefined ? subject : project.subject,
        keywords: keywords !== undefined ? keywords : project.keywords,
        description: description !== undefined ? description : project.description,
        updatedAt,
        venueId: venueId !== undefined ? venueId : project.venueId
      };
    }
  }

  // 处理 DELETE FROM projects
  private handleDeleteProjects(params?: any[]): void {
    const [id] = params || [];
    this.store.projects = this.store.projects.filter(p => p.id !== id);
  }

  // 处理 INSERT INTO users
  private handleInsertUsers(params?: any[]): void {
    const [id, username, email, password, fullName, userType, institution, department, createdAt, updatedAt] = params || [];
    this.store.users.push({
      id,
      username,
      email,
      password,
      fullName,
      userType,
      institution,
      department,
      createdAt,
      updatedAt
    });
  }

  // 处理SELECT * FROM projects WHERE id =
  private handleGetProjectById(params?: any[]): Project | undefined {
    const [id] = params || [];
    return this.store.projects.find(p => p.id === id);
  }

  // 处理SELECT * FROM project_versions WHERE projectId =
  private handleGetProjectVersion(params?: any[]): ProjectVersion | undefined {
    const [projectId, key, fingerprint] = params || [];
    return this.store.projectVersions.find(
      v => v.projectId === projectId && v.key === key && v.fingerprint === fingerprint
    );
  }

  // 处理SELECT * FROM ai_models WHERE id =
  private handleGetAiModelById(params?: any[]): AIModel | undefined {
    const [id] = params || [];
    return this.store.aiModels.find(m => m.id === id);
  }

  // 处理SELECT * FROM ai_models WHERE provider =
  private handleGetAiModelsByProvider(params?: any[]): AIModel[] {
    const [provider] = params || [];
    return this.store.aiModels.filter(m => m.provider === provider);
  }

  // 处理SELECT * FROM ai_models WHERE isDefault = 1
  private handleGetDefaultAiModel(): AIModel | undefined {
    return this.store.aiModels.find(m => m.isDefault);
  }

  // 处理SELECT * FROM ai_module_configs WHERE moduleKey =
  private handleGetAiModuleConfig(params?: any[]): AiModuleConfig | undefined {
    const [moduleKey] = params || [];
    return this.store.aiModuleConfigs.find(c => c.moduleKey === moduleKey);
  }

  // 处理SELECT * FROM users WHERE email =
  private handleGetUserByEmail(params?: any[]): User | undefined {
    const [email] = params || [];
    return this.store.users.find(u => u.email === email);
  }

  // 处理SELECT * FROM users WHERE id =
  private handleGetUserById(params?: any[]): User | undefined {
    const [id] = params || [];
    return this.store.users.find(u => u.id === id);
  }

  // 处理SELECT * FROM project_versions
  private handleGetProjectVersions(params?: any[]): ProjectVersion[] {
    const [projectId, key] = params || [];
    if (key) {
      return this.store.projectVersions.filter(v => v.projectId === projectId && v.key === key);
    } else {
      return this.store.projectVersions.filter(v => v.projectId === projectId);
    }
  }

  // 处理SELECT * FROM users WHERE email =
  private handleGetUsersByEmail(params?: any[]): User[] {
    const [email] = params || [];
    return [this.store.users.find(u => u.email === email)].filter(Boolean) as User[];
  }

  // 处理SELECT * FROM users WHERE id =
  private handleGetUsersById(params?: any[]): User[] {
    const [id] = params || [];
    return [this.store.users.find(u => u.id === id)].filter(Boolean) as User[];
  }
}

// Supabase执行器类
class SupabaseExecutor {
  private supabase: any;

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  // 执行 INSERT/UPDATE/DELETE 语句
  async run(sql: string, params?: any[]): Promise<void> {
    console.log('Executing SQL with Supabase:', sql, params);
    // 这里需要实现Supabase的具体操作
    // 由于Supabase使用的是REST API而不是SQL，需要将SQL语句转换为Supabase操作
  }

  // 执行单条SELECT语句
  async get(sql: string, params?: any[]): Promise<any> {
    console.log('Executing SQL with Supabase:', sql, params);
    // 这里需要实现Supabase的具体操作
    return null;
  }

  // 执行多条SELECT语句
  async all(sql: string, params?: any[]): Promise<any[]> {
    console.log('Executing SQL with Supabase:', sql, params);
    // 这里需要实现Supabase的具体操作
    return [];
  }
}

export async function getDatabase() {
  const { getDatabaseConfig, createConnection } = await import('./database-config');
  const config = getDatabaseConfig();
  
  if (config.type === 'supabase') {
    const connection = createConnection();
    await connection.connect();
    const supabase = connection.getConnection();
    const executor = new SupabaseExecutor(supabase);
    
    return {
      run: executor.run.bind(executor),
      get: executor.get.bind(executor),
      all: executor.all.bind(executor),
      lastID: 1
    };
  } else {
    // 创建SQL执行器实例
    const executor = new SqlExecutor(memoryStore);
    
    // 返回数据库接口
    return {
      run: executor.run.bind(executor),
      get: executor.get.bind(executor),
      all: executor.all.bind(executor),
      lastID: 1
    };
  }
}

export async function closeDatabase() {
  // 内存存储不需要关闭
  console.log('Closing database connection');
}
