import { promises as fs } from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { DomainInfo, GraphEdge, MemoryNode, PersistenceState } from '../types/graph.js';
import { MemoryStorage } from './MemoryStorage.js';

/**
 * SQLite implementation of MemoryStorage
 */
export class SqliteMemoryStorage implements MemoryStorage {
  private dbPath: string;
  private db: Database | null = null;

  /**
   * Constructor
   * @param storageDir Storage directory
   */
  constructor(storageDir: string) {
    this.dbPath = path.join(storageDir, 'memory-graph.db');
  }

  /**
   * Get database connection
   * @returns Database connection
   */
  private async getDatabase(): Promise<Database> {
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
    const db = await this.getDatabase();
    
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
          path,            -- Organization path
          tags,            -- Concatenated tags for searching
          domain,          -- Domain ID
          tokenize="porter unicode61"  -- Use Porter stemming algorithm
      );

      -- Triggers to keep FTS index in sync with memory nodes
      CREATE TRIGGER IF NOT EXISTS memory_nodes_ai AFTER INSERT ON MEMORY_NODES BEGIN
          INSERT INTO memory_content_fts(id, content, path, domain)
          VALUES (new.id, new.content, new.path, new.domain);
      END;

      CREATE TRIGGER IF NOT EXISTS memory_nodes_ad AFTER DELETE ON MEMORY_NODES BEGIN
          DELETE FROM memory_content_fts WHERE id = old.id;
      END;

      CREATE TRIGGER IF NOT EXISTS memory_nodes_au AFTER UPDATE ON MEMORY_NODES BEGIN
          DELETE FROM memory_content_fts WHERE id = old.id;
          INSERT INTO memory_content_fts(id, content, path, domain)
          VALUES (new.id, new.content, new.path, new.domain);
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
   * Get all domains
   * @returns Map of domain IDs to domain info
   */
  async getDomains(): Promise<Map<string, DomainInfo>> {
    const db = await this.getDatabase();
    const rows = await db.all('SELECT * FROM DOMAINS');
    
    const domains = new Map<string, DomainInfo>();
    for (const row of rows) {
      domains.set(row.id, {
        id: row.id,
        name: row.name,
        description: row.description,
        created: row.created,
        lastAccess: row.lastAccess
      });
    }
    
    return domains;
  }

  /**
   * Save domains
   * @param domains Map of domain IDs to domain info
   */
  async saveDomains(domains: Map<string, DomainInfo>): Promise<void> {
    const db = await this.getDatabase();
    
    // Start a transaction
    await db.run('BEGIN TRANSACTION');
    
    try {
      // Clear existing domains
      await db.run('DELETE FROM DOMAINS');
      
      // Insert new domains
      for (const domain of domains.values()) {
        await db.run(
          'INSERT INTO DOMAINS (id, name, description, created, lastAccess) VALUES (?, ?, ?, ?, ?)',
          [domain.id, domain.name, domain.description, domain.created, domain.lastAccess]
        );
      }
      
      // Commit the transaction
      await db.run('COMMIT');
    } catch (error) {
      // Rollback on error
      await db.run('ROLLBACK');
      throw error;
    }
  }

  /**
   * Create a new domain
   * @param domain Domain info
   */
  async createDomain(domain: DomainInfo): Promise<void> {
    const db = await this.getDatabase();
    
    await db.run(
      'INSERT INTO DOMAINS (id, name, description, created, lastAccess) VALUES (?, ?, ?, ?, ?)',
      [domain.id, domain.name, domain.description, domain.created, domain.lastAccess]
    );
  }

  /**
   * Get persistence state
   * @returns Persistence state
   */
  async getPersistenceState(): Promise<PersistenceState> {
    const db = await this.getDatabase();
    const row = await db.get('SELECT * FROM PERSISTENCE WHERE id = 1');
    
    if (!row) {
      throw new Error('Persistence state not found');
    }
    
    return {
      currentDomain: row.currentDomain,
      lastAccess: row.lastAccess,
      lastMemoryId: row.lastMemoryId
    };
  }

  /**
   * Save persistence state
   * @param state Persistence state
   */
  async savePersistenceState(state: PersistenceState): Promise<void> {
    const db = await this.getDatabase();
    
    // Check if persistence state exists
    const exists = await db.get('SELECT 1 FROM PERSISTENCE WHERE id = 1');
    
    if (exists) {
      // Update existing state
      await db.run(
        'UPDATE PERSISTENCE SET currentDomain = ?, lastAccess = ?, lastMemoryId = ? WHERE id = 1',
        [state.currentDomain, state.lastAccess, state.lastMemoryId]
      );
    } else {
      // Insert new state
      await db.run(
        'INSERT INTO PERSISTENCE (id, currentDomain, lastAccess, lastMemoryId) VALUES (1, ?, ?, ?)',
        [state.currentDomain, state.lastAccess, state.lastMemoryId]
      );
    }
  }

  /**
   * Get memories for a domain
   * @param domain Domain ID
   * @returns Object containing nodes and edges
   */
  async getMemories(domain: string): Promise<{ nodes: Map<string, MemoryNode>, edges: GraphEdge[] }> {
    const db = await this.getDatabase();
    
    // Get nodes
    const nodeRows = await db.all('SELECT * FROM MEMORY_NODES WHERE domain = ?', [domain]);
    const nodes = new Map<string, MemoryNode>();
    
    for (const row of nodeRows) {
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
      
      nodes.set(row.id, {
        id: row.id,
        content: row.content,
        timestamp: row.timestamp,
        path: row.path,
        tags: tags.length > 0 ? tags : undefined,
        domainRefs: domainRefs.length > 0 ? domainRefs : undefined
      });
    }
    
    // Get edges
    const edgeRows = await db.all('SELECT * FROM MEMORY_EDGES WHERE domain = ?', [domain]);
    const edges = edgeRows.map((row: any) => ({
      source: row.source,
      target: row.target,
      type: row.type,
      strength: row.strength,
      timestamp: row.timestamp
    }));
    
    return { nodes, edges };
  }

  /**
   * Save memories for a domain
   * @param domain Domain ID
   * @param nodes Map of node IDs to nodes
   * @param edges Array of edges
   */
  async saveMemories(domain: string, nodes: Map<string, MemoryNode>, edges: GraphEdge[]): Promise<void> {
    const db = await this.getDatabase();
    
    // Start a transaction
    await db.run('BEGIN TRANSACTION');
    
    try {
      // Clear existing data for this domain
      await db.run('DELETE FROM MEMORY_NODES WHERE domain = ?', [domain]);
      await db.run('DELETE FROM MEMORY_EDGES WHERE domain = ?', [domain]);
      
      // Insert nodes
      for (const node of nodes.values()) {
        await db.run(
          'INSERT INTO MEMORY_NODES (id, domain, content, timestamp, path) VALUES (?, ?, ?, ?, ?)',
          [node.id, domain, node.content, node.timestamp, node.path || '/']
        );
        
        // Insert tags
        if (node.tags && node.tags.length > 0) {
          for (const tag of node.tags) {
            await db.run(
              'INSERT INTO MEMORY_TAGS (nodeId, tag) VALUES (?, ?)',
              [node.id, tag]
            );
          }
        }
        
        // Insert domain refs
        if (node.domainRefs && node.domainRefs.length > 0) {
          for (const ref of node.domainRefs) {
            await db.run(
              'INSERT INTO DOMAIN_REFS (nodeId, domain, targetDomain, targetNodeId, description, bidirectional) VALUES (?, ?, ?, ?, ?, ?)',
              [node.id, domain, ref.domain, ref.nodeId, ref.description || null, ref.bidirectional ? 1 : 0]
            );
          }
        }
      }
      
      // Insert edges
      for (const edge of edges) {
        await db.run(
          'INSERT INTO MEMORY_EDGES (id, source, target, type, strength, timestamp, domain) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [edge.source + '-' + edge.target + '-' + edge.type, edge.source, edge.target, edge.type, edge.strength, edge.timestamp, domain]
        );
      }
      
      // Commit the transaction
      await db.run('COMMIT');
    } catch (error) {
      // Rollback on error
      await db.run('ROLLBACK');
      throw error;
    }
  }

  /**
   * Search memory content using full-text search
   * @param query Search query
   * @param domain Optional domain to restrict search to
   * @param maxResults Maximum number of results to return
   * @returns Array of matching memory nodes
   */
  async searchContent(query: string, domain?: string, maxResults: number = 20): Promise<MemoryNode[]> {
    const db = await this.getDatabase();
    
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
        domainRefs: domainRefs.length > 0 ? domainRefs : undefined
      });
    }
    
    return results;
  }
}
