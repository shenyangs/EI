// 内存存储模拟数据库
const memoryStore: {
  projects: any[];
  projectVersions: any[];
  academicPapers: any[];
  projectReferences: any[];
} = {
  projects: [],
  projectVersions: [],
  academicPapers: [],
  projectReferences: []
};

export async function getDatabase() {
  // 返回内存存储对象
  return {
    run: async (sql: string, params?: any[]) => {
      // 模拟 SQL 执行
      console.log('Executing SQL:', sql, params);
      
      // 简单的 SQL 解析和执行
      if (sql.includes('INSERT INTO projects')) {
        const [id, title, description, createdAt, updatedAt, venueId] = params || [];
        memoryStore.projects.push({
          id,
          title,
          description,
          createdAt,
          updatedAt,
          venueId
        });
      } else if (sql.includes('INSERT INTO project_versions')) {
        const [projectId, key, fingerprint, title, summary, payload, createdAt] = params || [];
        memoryStore.projectVersions.push({
          id: memoryStore.projectVersions.length + 1,
          projectId,
          key,
          fingerprint,
          title,
          summary,
          payload,
          createdAt
        });
      }
    },
    get: async (sql: string, params?: any[]) => {
      console.log('Executing SQL:', sql, params);
      
      if (sql.includes('SELECT * FROM projects WHERE id =')) {
        const [id] = params || [];
        return memoryStore.projects.find(p => p.id === id);
      } else if (sql.includes('SELECT * FROM project_versions WHERE projectId =')) {
        const [projectId, key, fingerprint] = params || [];
        return memoryStore.projectVersions.find(
          v => v.projectId === projectId && v.key === key && v.fingerprint === fingerprint
        );
      }
      return null;
    },
    all: async (sql: string, params?: any[]) => {
      console.log('Executing SQL:', sql, params);
      
      if (sql.includes('SELECT * FROM projects')) {
        return memoryStore.projects;
      } else if (sql.includes('SELECT * FROM project_versions')) {
        const [projectId, key] = params || [];
        if (key) {
          return memoryStore.projectVersions.filter(v => v.projectId === projectId && v.key === key);
        } else {
          return memoryStore.projectVersions.filter(v => v.projectId === projectId);
        }
      }
      return [];
    },
    lastID: 1
  };
}

export async function closeDatabase() {
  // 内存存储不需要关闭
  console.log('Closing database connection');
}
