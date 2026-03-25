import { Database, open } from 'sqlite';
import sqlite3 from 'sqlite3';

let db: Database | null = null;

export async function getDatabase() {
  if (!db) {
    db = await open({
      filename: './data.db',
      driver: sqlite3.Database
    });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        venueId TEXT
      );

      CREATE TABLE IF NOT EXISTS project_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        projectId TEXT NOT NULL,
        key TEXT NOT NULL,
        fingerprint TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT,
        payload TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY (projectId) REFERENCES projects(id)
      );

      CREATE TABLE IF NOT EXISTS academic_papers (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        abstract TEXT,
        authors TEXT NOT NULL,
        year INTEGER,
        source TEXT NOT NULL,
        url TEXT,
        venue TEXT,
        citations INTEGER,
        matchedQueries TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS project_references (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        projectId TEXT NOT NULL,
        paperId TEXT NOT NULL,
        addedAt INTEGER NOT NULL,
        FOREIGN KEY (projectId) REFERENCES projects(id),
        FOREIGN KEY (paperId) REFERENCES academic_papers(id)
      );
    `);
  }

  return db;
}

export async function closeDatabase() {
  if (db) {
    await db.close();
    db = null;
  }
}
