import { getDatabase, closeDatabase, memoryStore, type Project, type User, type AIModel } from '@/lib/server/db';

describe('Database', () => {
  beforeEach(() => {
    // 清空内存存储
    memoryStore.projects = [];
    memoryStore.users = [];
    memoryStore.aiModels = [];
    memoryStore.projectVersions = [];
    memoryStore.aiModuleConfigs = [];
  });

  describe('getDatabase', () => {
    it('should return database interface', async () => {
      const db = await getDatabase();
      expect(db).toHaveProperty('run');
      expect(db).toHaveProperty('get');
      expect(db).toHaveProperty('all');
      expect(db).toHaveProperty('lastID');
    });
  });

  describe('Projects', () => {
    it('should insert and retrieve project', async () => {
      const db = await getDatabase();
      
      const project: Project = {
        id: 'test-project-1',
        title: 'Test Project',
        description: 'Test Description',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        venueId: 'ieee-iccci-2026'
      };

      await db.run(
        'INSERT INTO projects (id, title, description, createdAt, updatedAt, venueId) VALUES (?, ?, ?, ?, ?, ?)',
        [project.id, project.title, project.description, project.createdAt, project.updatedAt, project.venueId]
      );

      const retrieved = await db.get('SELECT * FROM projects WHERE id = ?', [project.id]);
      expect(retrieved).toMatchObject(project);
    });

    it('should return all projects', async () => {
      const db = await getDatabase();
      
      const project1 = {
        id: 'project-1',
        title: 'Project 1',
        description: 'Description 1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        venueId: 'venue-1'
      };

      const project2 = {
        id: 'project-2',
        title: 'Project 2',
        description: 'Description 2',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        venueId: 'venue-2'
      };

      await db.run(
        'INSERT INTO projects (id, title, description, createdAt, updatedAt, venueId) VALUES (?, ?, ?, ?, ?, ?)',
        [project1.id, project1.title, project1.description, project1.createdAt, project1.updatedAt, project1.venueId]
      );

      await db.run(
        'INSERT INTO projects (id, title, description, createdAt, updatedAt, venueId) VALUES (?, ?, ?, ?, ?, ?)',
        [project2.id, project2.title, project2.description, project2.createdAt, project2.updatedAt, project2.venueId]
      );

      const allProjects = await db.all('SELECT * FROM projects');
      expect(allProjects).toHaveLength(2);
    });

    it('should return null for non-existent project', async () => {
      const db = await getDatabase();
      const result = await db.get('SELECT * FROM projects WHERE id = ?', ['non-existent']);
      expect(result).toBeUndefined();
    });
  });

  describe('Users', () => {
    it('should insert and retrieve user', async () => {
      const db = await getDatabase();
      
      const user: User = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword',
        fullName: 'Test User',
        userType: 'student',
        institution: 'Test University',
        department: 'Computer Science',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.run(
        'INSERT INTO users (id, username, email, password, fullName, userType, institution, department, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [user.id, user.username, user.email, user.password, user.fullName, user.userType, user.institution, user.department, user.createdAt, user.updatedAt]
      );

      const retrieved = await db.get('SELECT * FROM users WHERE email = ?', [user.email]);
      expect(retrieved).toMatchObject(user);
    });

    it('should find user by id', async () => {
      const db = await getDatabase();
      
      const user = {
        id: 'user-2',
        username: 'testuser2',
        email: 'test2@example.com',
        password: 'password',
        fullName: 'Test User 2',
        userType: 'student',
        institution: 'University',
        department: 'CS',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.run(
        'INSERT INTO users (id, username, email, password, fullName, userType, institution, department, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [user.id, user.username, user.email, user.password, user.fullName, user.userType, user.institution, user.department, user.createdAt, user.updatedAt]
      );

      const retrieved = await db.get('SELECT * FROM users WHERE id = ?', [user.id]);
      expect(retrieved).toMatchObject(user);
    });
  });

  describe('AI Models', () => {
    it('should insert and retrieve AI model', async () => {
      const db = await getDatabase();
      
      const model: AIModel = {
        id: 1,
        name: 'Test Model',
        provider: 'test-provider',
        model: 'test-model-v1',
        baseUrl: 'https://api.test.com',
        apiKey: 'test-api-key',
        isDefault: true,
        createdAt: new Date().toISOString()
      };

      await db.run(
        'INSERT INTO ai_models (id, name, provider, model, baseUrl, apiKey, isDefault, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [model.id, model.name, model.provider, model.model, model.baseUrl, model.apiKey, model.isDefault, model.createdAt]
      );

      const retrieved = await db.get('SELECT * FROM ai_models WHERE id = ?', [model.id]);
      expect(retrieved).toMatchObject(model);
    });

    it('should get default model', async () => {
      const db = await getDatabase();
      
      const defaultModel = {
        id: 1,
        name: 'Default Model',
        provider: 'provider',
        model: 'model-v1',
        baseUrl: 'https://api.provider.com',
        apiKey: 'api-key',
        isDefault: true,
        createdAt: new Date().toISOString()
      };

      await db.run(
        'INSERT INTO ai_models (id, name, provider, model, baseUrl, apiKey, isDefault, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [defaultModel.id, defaultModel.name, defaultModel.provider, defaultModel.model, defaultModel.baseUrl, defaultModel.apiKey, defaultModel.isDefault, defaultModel.createdAt]
      );

      const retrieved = await db.get('SELECT * FROM ai_models WHERE isDefault = 1');
      expect(retrieved).toMatchObject(defaultModel);
    });

    it('should update AI model', async () => {
      const db = await getDatabase();
      
      const model = {
        id: 1,
        name: 'Original Name',
        provider: 'provider',
        model: 'model-v1',
        baseUrl: 'https://api.provider.com',
        apiKey: 'api-key',
        isDefault: false,
        createdAt: new Date().toISOString()
      };

      await db.run(
        'INSERT INTO ai_models (id, name, provider, model, baseUrl, apiKey, isDefault, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [model.id, model.name, model.provider, model.model, model.baseUrl, model.apiKey, model.isDefault, model.createdAt]
      );

      await db.run(
        'UPDATE ai_models SET name = ?, provider = ?, model = ?, baseUrl = ?, apiKey = ?, isDefault = ? WHERE id = ?',
        ['Updated Name', model.provider, model.model, model.baseUrl, model.apiKey, true, model.id]
      );

      const retrieved = await db.get('SELECT * FROM ai_models WHERE id = ?', [model.id]);
      expect(retrieved.name).toBe('Updated Name');
      expect(retrieved.isDefault).toBe(true);
    });

    it('should delete AI model', async () => {
      const db = await getDatabase();
      
      const model = {
        id: 1,
        name: 'Model to Delete',
        provider: 'provider',
        model: 'model-v1',
        baseUrl: 'https://api.provider.com',
        apiKey: 'api-key',
        isDefault: false,
        createdAt: new Date().toISOString()
      };

      await db.run(
        'INSERT INTO ai_models (id, name, provider, model, baseUrl, apiKey, isDefault, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [model.id, model.name, model.provider, model.model, model.baseUrl, model.apiKey, model.isDefault, model.createdAt]
      );

      await db.run('DELETE FROM ai_models WHERE id = ?', [model.id]);

      const retrieved = await db.get('SELECT * FROM ai_models WHERE id = ?', [model.id]);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('closeDatabase', () => {
    it('should close database connection', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      await closeDatabase();
      expect(consoleSpy).toHaveBeenCalledWith('Closing database connection');
      consoleSpy.mockRestore();
    });
  });
});
