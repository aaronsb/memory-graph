import path from 'path';
import mysql from 'mysql2/promise';
import { MemoryNode } from '../types/graph.js';
import { DatabaseStorage } from './DatabaseStorage.js';

/**
 * MariaDB implementation of MemoryStorage
 */
export class MariaDbMemoryStorage extends DatabaseStorage {
  private pool: mysql.Pool | null = null;
  private config: mysql.PoolOptions;

  /**
   * Constructor
   * @param storageDir Storage directory - ignored for MariaDB, used for config consistency
   * @param dbConfig MariaDB connection configuration
   */
  constructor(storageDir: string, dbConfig?: mysql.PoolOptions) {
    super();
    
    // Default configuration
    this.config = dbConfig || {
      host: process.env.MARIADB_HOST || 'localhost',
      user: process.env.MARIADB_USER || 'root',
      password: process.env.MARIADB_PASSWORD || '',
      database: process.env.MARIADB_DATABASE || 'memory_graph',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    };
  }

  /**
   * Get database connection
   * @returns Database connection
   */
  protected async getConnection(): Promise<mysql.PoolConnection> {
    if (!this.pool) {
      this.pool = mysql.createPool(this.config);
    }
    return this.pool.getConnection();
  }

  /**
   * Initialize the storage
   * Creates necessary tables, indexes, and functions
   */
  async initialize(): Promise<void> {
    // Create the database if it doesn't exist
    await this.createDatabaseIfNeeded();
    
    const conn = await this.getConnection();
    
    try {
      // Enable foreign keys
      await conn.execute('SET FOREIGN_KEY_CHECKS=1');
      
      // Create tables
      await conn.execute(`
        -- Domains table
        CREATE TABLE IF NOT EXISTS DOMAINS (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            created VARCHAR(30) NOT NULL,
            lastAccess VARCHAR(30) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        -- Persistence state table (single row)
        CREATE TABLE IF NOT EXISTS PERSISTENCE (
            id INT PRIMARY KEY CHECK (id = 1),
            currentDomain VARCHAR(36) NOT NULL,
            lastAccess VARCHAR(30) NOT NULL,
            lastMemoryId VARCHAR(36),
            FOREIGN KEY (currentDomain) REFERENCES DOMAINS(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        -- Memory nodes table
        CREATE TABLE IF NOT EXISTS MEMORY_NODES (
            id VARCHAR(36) PRIMARY KEY,
            domain VARCHAR(36) NOT NULL,
            content TEXT NOT NULL,
            timestamp VARCHAR(30) NOT NULL,
            path VARCHAR(255) DEFAULT '/',
            content_summary TEXT,
            summary_timestamp VARCHAR(30),
            FOREIGN KEY (domain) REFERENCES DOMAINS(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        -- Memory tags table (many-to-many)
        CREATE TABLE IF NOT EXISTS MEMORY_TAGS (
            nodeId VARCHAR(36) NOT NULL,
            tag VARCHAR(255) NOT NULL,
            PRIMARY KEY (nodeId, tag),
            FOREIGN KEY (nodeId) REFERENCES MEMORY_NODES(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        -- Memory edges table
        CREATE TABLE IF NOT EXISTS MEMORY_EDGES (
            id VARCHAR(255) PRIMARY KEY,
            source VARCHAR(36) NOT NULL,
            target VARCHAR(36) NOT NULL,
            type VARCHAR(255) NOT NULL,
            strength DECIMAL(3,2) NOT NULL CHECK (strength >= 0 AND strength <= 1),
            timestamp VARCHAR(30) NOT NULL,
            domain VARCHAR(36) NOT NULL,
            FOREIGN KEY (source) REFERENCES MEMORY_NODES(id) ON DELETE CASCADE,
            FOREIGN KEY (target) REFERENCES MEMORY_NODES(id) ON DELETE CASCADE,
            FOREIGN KEY (domain) REFERENCES DOMAINS(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        -- Domain references table
        CREATE TABLE IF NOT EXISTS DOMAIN_REFS (
            nodeId VARCHAR(36) NOT NULL,
            domain VARCHAR(36) NOT NULL,
            targetDomain VARCHAR(36) NOT NULL,
            targetNodeId VARCHAR(36) NOT NULL,
            description TEXT,
            bidirectional BOOLEAN NOT NULL DEFAULT 0,
            PRIMARY KEY (nodeId, targetDomain, targetNodeId),
            FOREIGN KEY (nodeId) REFERENCES MEMORY_NODES(id) ON DELETE CASCADE,
            FOREIGN KEY (domain) REFERENCES DOMAINS(id),
            FOREIGN KEY (targetDomain) REFERENCES DOMAINS(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Create indexes
      await conn.execute(`
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

      // Full-text search indexes
      await conn.execute(`
        -- Add FULLTEXT index on content and summary
        ALTER TABLE MEMORY_NODES ADD FULLTEXT INDEX IF NOT EXISTS ft_memory_content (content, content_summary);
      `);

      // Create the tag concatenation function
      await this.createTagConcatFunction(conn);
      
      // Create view for combined search
      await conn.execute(`
        -- Create a view that combines memory node content with tags for full-text searching
        CREATE OR REPLACE VIEW memory_content_search AS
        SELECT 
            m.id,
            m.content,
            m.content_summary,
            m.path,
            m.domain,
            get_node_tags(m.id) AS tags
        FROM MEMORY_NODES m;
      `);
    } finally {
      conn.release();
    }
  }

  /**
   * Create the database if it doesn't exist
   */
  private async createDatabaseIfNeeded(): Promise<void> {
    const tempConfig = { ...this.config };
    delete tempConfig.database;
    
    const tempPool = mysql.createPool(tempConfig);
    let tempConn;
    
    try {
      tempConn = await tempPool.getConnection();
      await tempConn.execute(
        `CREATE DATABASE IF NOT EXISTS ${this.config.database} CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci`
      );
    } finally {
      if (tempConn) tempConn.release();
      await tempPool.end();
    }
  }

  /**
   * Create the tag concatenation function
   */
  private async createTagConcatFunction(conn: mysql.PoolConnection): Promise<void> {
    // Check if function exists
    const [rows] = await conn.execute(
      'SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_SCHEMA = ? AND ROUTINE_NAME = ?',
      [this.config.database, 'get_node_tags']
    );
    
    // If function doesn't exist, create it
    if (Array.isArray(rows) && rows.length === 0) {
      await conn.execute(`
        DROP FUNCTION IF EXISTS get_node_tags;
        DELIMITER //
        CREATE FUNCTION get_node_tags(node_id VARCHAR(36)) 
        RETURNS TEXT
        DETERMINISTIC
        BEGIN
          DECLARE result TEXT;
          SELECT GROUP_CONCAT(tag SEPARATOR ' ') INTO result FROM MEMORY_TAGS WHERE nodeId = node_id;
          RETURN result;
        END//
        DELIMITER ;
      `);
    }
  }

  /**
   * Search memory content using MariaDB FULLTEXT search
   * @param query Search query
   * @param domain Optional domain to restrict search to
   * @param maxResults Maximum number of results to return
   * @returns Array of matching memory nodes
   */
  async searchContent(query: string, domain?: string, maxResults: number = 20): Promise<MemoryNode[]> {
    const conn = await this.getConnection();
    
    try {
      // Clean the query for use with MATCH AGAINST
      const cleanQuery = query.replace(/[+\-><()~*"@]+/g, ' ').trim();
      
      let sql = `
        SELECT m.* FROM MEMORY_NODES m
        WHERE MATCH(m.content, m.content_summary) AGAINST(? IN NATURAL LANGUAGE MODE)
      `;
      
      const params: any[] = [cleanQuery];
      
      if (domain) {
        sql += ' AND m.domain = ?';
        params.push(domain);
      }
      
      sql += ' LIMIT ?';
      params.push(maxResults);
      
      const [rows] = await conn.execute(sql, params);
      const results: MemoryNode[] = [];
      
      if (Array.isArray(rows)) {
        for (const row of rows as any[]) {
          // Get tags for this node
          const [tagRows] = await conn.execute('SELECT tag FROM MEMORY_TAGS WHERE nodeId = ?', [row.id]);
          const tags = (tagRows as any[]).map(t => t.tag);
          
          // Get domain refs for this node
          const [refRows] = await conn.execute('SELECT * FROM DOMAIN_REFS WHERE nodeId = ?', [row.id]);
          const domainRefs = (refRows as any[]).map(ref => ({
            domain: ref.targetDomain,
            nodeId: ref.targetNodeId,
            description: ref.description,
            bidirectional: this.getBooleanValue(ref.bidirectional)
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
      }
      
      return results;
    } finally {
      conn.release();
    }
  }

  /**
   * Execute a query that returns multiple rows
   */
  protected async executeQuery(connection: mysql.PoolConnection, sql: string, params: any[] = []): Promise<any[]> {
    const [rows] = await connection.execute(sql, params);
    return rows as any[];
  }

  /**
   * Execute a query that returns a single row
   */
  protected async executeQuerySingle(connection: mysql.PoolConnection, sql: string, params: any[] = []): Promise<any> {
    const [rows] = await connection.execute(sql, params);
    const rowsArray = rows as any[];
    return rowsArray.length > 0 ? rowsArray[0] : null;
  }

  /**
   * Execute an update statement
   */
  protected async executeUpdate(connection: mysql.PoolConnection, sql: string, params: any[] = []): Promise<any> {
    const result = await connection.execute(sql, params);
    return result;
  }

  /**
   * Begin a database transaction
   */
  protected async beginTransaction(connection: mysql.PoolConnection): Promise<void> {
    await connection.beginTransaction();
  }

  /**
   * Commit a database transaction
   */
  protected async commitTransaction(connection: mysql.PoolConnection): Promise<void> {
    await connection.commit();
  }

  /**
   * Rollback a database transaction
   */
  protected async rollbackTransaction(connection: mysql.PoolConnection): Promise<void> {
    await connection.rollback();
  }

  /**
   * Get the appropriate INSERT IGNORE statement for MariaDB
   */
  protected getInsertIgnoreStatement(table: string, valuesClause: string): string {
    return `INSERT IGNORE INTO ${table} ${valuesClause}`;
  }

  /**
   * Get the appropriate INSERT REPLACE statement for MariaDB
   */
  protected getInsertReplaceStatement(table: string, valuesClause: string): string {
    return `REPLACE INTO ${table} ${valuesClause}`;
  }

  /**
   * Convert a MariaDB boolean value to a JavaScript boolean
   */
  protected getBooleanValue(value: any): boolean {
    return !!value;
  }

  /**
   * Convert a JavaScript boolean to a MariaDB value
   */
  protected setBooleanValue(value?: boolean): boolean {
    return !!value;
  }

  /**
   * Close the database connection pool
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}