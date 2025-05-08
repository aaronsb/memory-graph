import path from 'path';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { MemoryNode } from '../types/graph.js';
import { DatabaseStorage } from './DatabaseStorage.js';

/**
 * SQLite implementation of MemoryStorage
 */
export class SqliteMemoryStorage extends DatabaseStorage {
  private dbPath: string;
  private db: Database | null = null;

  /**
   * Constructor
   * @param storageDir Storage directory
   */
  constructor(storageDir: string) {
    super();
    this.dbPath = path.join(storageDir, 'memory-graph.db');
  }

  /**
   * Get database connection
   * @returns Database connection
   */
  protected async getConnection(): Promise<Database> {
    if (!this.db) {
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });
    }
    return this.db;
  }

  /**
   * Initialize the storage
   * Creates necessary tables, indexes, and triggers
   */
  async initialize(): Promise<void> {
    const db = await this.getConnection();
    
    // Create tables
    await db.exec(`
      -- Domains table
      CREATE TABLE IF NOT EXISTS DOMAINS (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          created TEXT NOT NULL,
          lastAccess TEXT NOT NULL
      );

      -- Persistence state table (single row)
      CREATE TABLE IF NOT EXISTS PERSISTENCE (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          currentDomain TEXT NOT NULL,
          lastAccess TEXT NOT NULL,
          lastMemoryId TEXT,
          FOREIGN KEY (currentDomain) REFERENCES DOMAINS(id)
      );

      -- Memory nodes table
      CREATE TABLE IF NOT EXISTS MEMORY_NODES (
          id TEXT PRIMARY KEY,
          domain TEXT NOT NULL,
          content TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          path TEXT DEFAULT '/',
          content_summary TEXT,
          summary_timestamp TEXT,
          FOREIGN KEY (domain) REFERENCES DOMAINS(id)
      );

      -- Memory tags table (many-to-many)
      CREATE TABLE IF NOT EXISTS MEMORY_TAGS (
          nodeId TEXT NOT NULL,
          tag TEXT NOT NULL,
          PRIMARY KEY (nodeId, tag),
          FOREIGN KEY (nodeId) REFERENCES MEMORY_NODES(id) ON DELETE CASCADE
      );

      -- Memory edges table
      CREATE TABLE IF NOT EXISTS MEMORY_EDGES (
          id TEXT PRIMARY KEY,
          source TEXT NOT NULL,
          target TEXT NOT NULL,
          type TEXT NOT NULL,
          strength REAL NOT NULL CHECK (strength >= 0 AND strength <= 1),
          timestamp TEXT NOT NULL,
          domain TEXT NOT NULL,
          FOREIGN KEY (source) REFERENCES MEMORY_NODES(id) ON DELETE CASCADE,
          FOREIGN KEY (target) REFERENCES MEMORY_NODES(id) ON DELETE CASCADE,
          FOREIGN KEY (domain) REFERENCES DOMAINS(id)
      );

      -- Domain references table
      CREATE TABLE IF NOT EXISTS DOMAIN_REFS (
          nodeId TEXT NOT NULL,
          domain TEXT NOT NULL,
          targetDomain TEXT NOT NULL,
          targetNodeId TEXT NOT NULL,
          description TEXT,
          bidirectional INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (nodeId, targetDomain, targetNodeId),
          FOREIGN KEY (nodeId) REFERENCES MEMORY_NODES(id) ON DELETE CASCADE,
          FOREIGN KEY (domain) REFERENCES DOMAINS(id),
          FOREIGN KEY (targetDomain) REFERENCES DOMAINS(id)
      );
    `);

    // Create indexes
    await db.exec(`
      -- For fast domain-based filtering
      CREATE INDEX IF NOT EXISTS idx_memory_nodes_domain ON MEMORY_NODES(domain);

      -- For fast tag lookups
      CREATE INDEX IF NOT EXISTS idx_memory_tags_tag ON MEMORY_TAGS(tag);

      -- For fast edge traversal
      CREATE INDEX IF NOT EXISTS idx_memory_edges_source ON MEMORY_EDGES(source, domain);
      CREATE INDEX IF NOT EXISTS idx_memory_edges_target ON MEMORY_EDGES(target, domain);

      -- For fast domain reference lookups
      CREATE INDEX IF NOT EXISTS idx_domain_refs_target ON DOMAIN_REFS(targetDomain, targetNodeId);
    `);

    // Create FTS virtual table and triggers
    await db.exec(`
      -- Enable FTS5 extension for full-text search
      CREATE VIRTUAL TABLE IF NOT EXISTS memory_content_fts USING fts5(
          id,              -- Memory ID
          content,         -- Memory content
          content_summary, -- Memory summary
          path,            -- Organization path
          tags,            -- Concatenated tags for searching
          domain,          -- Domain ID
          tokenize="porter unicode61"  -- Use Porter stemming algorithm
      );

      -- Triggers to keep FTS index in sync with memory nodes
      CREATE TRIGGER IF NOT EXISTS memory_nodes_ai AFTER INSERT ON MEMORY_NODES BEGIN
          INSERT INTO memory_content_fts(id, content, content_summary, path, domain)
          VALUES (new.id, new.content, new.content_summary, new.path, new.domain);
      END;

      CREATE TRIGGER IF NOT EXISTS memory_nodes_ad AFTER DELETE ON MEMORY_NODES BEGIN
          DELETE FROM memory_content_fts WHERE id = old.id;
      END;

      CREATE TRIGGER IF NOT EXISTS memory_nodes_au AFTER UPDATE ON MEMORY_NODES BEGIN
          DELETE FROM memory_content_fts WHERE id = old.id;
          INSERT INTO memory_content_fts(id, content, content_summary, path, domain)
          VALUES (new.id, new.content, new.content_summary, new.path, new.domain);
      END;

      -- Trigger to update tags in FTS when tags are added/removed
      CREATE TRIGGER IF NOT EXISTS memory_tags_ai AFTER INSERT ON MEMORY_TAGS BEGIN
          UPDATE memory_content_fts 
          SET tags = (SELECT group_concat(tag, ' ') FROM MEMORY_TAGS WHERE nodeId = new.nodeId)
          WHERE id = new.nodeId;
      END;

      CREATE TRIGGER IF NOT EXISTS memory_tags_ad AFTER DELETE ON MEMORY_TAGS BEGIN
          UPDATE memory_content_fts 
          SET tags = (SELECT group_concat(tag, ' ') FROM MEMORY_TAGS WHERE nodeId = old.nodeId)
          WHERE id = old.nodeId;
      END;
    `);
  }

  /**
   * Search memory content using full-text search
   * @param query Search query
   * @param domain Optional domain to restrict search to
   * @param maxResults Maximum number of results to return
   * @returns Array of matching memory nodes
   */
  async searchContent(query: string, domain?: string, maxResults: number = 20): Promise<MemoryNode[]> {
    const db = await this.getConnection();
    
    let sql = `
      SELECT m.* FROM MEMORY_NODES m
      JOIN memory_content_fts fts ON m.id = fts.id
      WHERE memory_content_fts MATCH ?
    `;
    
    const params: any[] = [query];
    
    if (domain) {
      sql += ' AND m.domain = ?';
      params.push(domain);
    }
    
    sql += ' LIMIT ?';
    params.push(maxResults);
    
    const rows = await db.all(sql, params);
    const results: MemoryNode[] = [];
    
    for (const row of rows) {
      // Get tags for this node
      const tagRows = await db.all('SELECT tag FROM MEMORY_TAGS WHERE nodeId = ?', [row.id]);
      const tags = tagRows.map((t: { tag: string }) => t.tag);
      
      // Get domain refs for this node
      const refRows = await db.all('SELECT * FROM DOMAIN_REFS WHERE nodeId = ?', [row.id]);
      const domainRefs = refRows.map((ref: any) => ({
        domain: ref.targetDomain,
        nodeId: ref.targetNodeId,
        description: ref.description,
        bidirectional: ref.bidirectional === 1
      }));
      
      results.push({
        id: row.id,
        content: row.content,
        timestamp: row.timestamp,
        path: row.path,
        tags: tags.length > 0 ? tags : undefined,
        domainRefs: domainRefs.length > 0 ? domainRefs : undefined,
        content_summary: row.content_summary,
        summary_timestamp: row.summary_timestamp
      });
    }
    
    return results;
  }

  /**
   * Execute a query that returns multiple rows
   */
  protected async executeQuery(connection: Database, sql: string, params: any[] = []): Promise<any[]> {
    return connection.all(sql, params);
  }

  /**
   * Execute a query that returns a single row
   */
  protected async executeQuerySingle(connection: Database, sql: string, params: any[] = []): Promise<any> {
    return connection.get(sql, params);
  }

  /**
   * Execute an update statement
   */
  protected async executeUpdate(connection: Database, sql: string, params: any[] = []): Promise<any> {
    return connection.run(sql, params);
  }

  /**
   * Begin a database transaction
   */
  protected async beginTransaction(connection: Database): Promise<void> {
    await connection.run('BEGIN TRANSACTION');
  }

  /**
   * Commit a database transaction
   */
  protected async commitTransaction(connection: Database): Promise<void> {
    await connection.run('COMMIT');
  }

  /**
   * Rollback a database transaction
   */
  protected async rollbackTransaction(connection: Database): Promise<void> {
    await connection.run('ROLLBACK');
  }

  /**
   * Get the appropriate INSERT IGNORE statement for SQLite
   */
  protected getInsertIgnoreStatement(table: string, valuesClause: string): string {
    return `INSERT OR IGNORE INTO ${table} ${valuesClause}`;
  }

  /**
   * Get the appropriate INSERT REPLACE statement for SQLite
   */
  protected getInsertReplaceStatement(table: string, valuesClause: string): string {
    return `INSERT OR REPLACE INTO ${table} ${valuesClause}`;
  }

  /**
   * Convert a SQLite boolean value (0/1) to a JavaScript boolean
   */
  protected getBooleanValue(value: any): boolean {
    return value === 1;
  }

  /**
   * Convert a JavaScript boolean to a SQLite value (0/1)
   */
  protected setBooleanValue(value?: boolean): number {
    return value ? 1 : 0;
  }
}