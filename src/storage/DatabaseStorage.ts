import { DomainInfo, GraphEdge, MemoryNode, PersistenceState } from '../types/graph.js';
import { MemoryStorage } from './MemoryStorage.js';

/**
 * Abstract base class for SQL-based storage implementations.
 * This provides common functionality for both SQLite and MariaDB implementations.
 */
export abstract class DatabaseStorage implements MemoryStorage {
  protected abstract getConnection(): Promise<any>;
  
  /**
   * Initialize the storage
   * Creates necessary tables, indexes, and triggers
   */
  abstract initialize(): Promise<void>;
  
  /**
   * Get all domains
   * @returns Map of domain IDs to domain info
   */
  async getDomains(): Promise<Map<string, DomainInfo>> {
    const conn = await this.getConnection();
    const rows = await this.executeQuery(conn, 'SELECT * FROM DOMAINS');
    
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
    const conn = await this.getConnection();
    
    // Start a transaction
    await this.beginTransaction(conn);
    
    try {
      // Clear existing domains
      await this.executeUpdate(conn, 'DELETE FROM DOMAINS');
      
      // Insert new domains
      for (const domain of domains.values()) {
        await this.executeUpdate(
          conn,
          'INSERT INTO DOMAINS (id, name, description, created, lastAccess) VALUES (?, ?, ?, ?, ?)',
          [domain.id, domain.name, domain.description, domain.created, domain.lastAccess]
        );
      }
      
      // Commit the transaction
      await this.commitTransaction(conn);
    } catch (error) {
      // Rollback on error
      await this.rollbackTransaction(conn);
      throw error;
    }
  }
  
  /**
   * Create a new domain
   * @param domain Domain info
   */
  async createDomain(domain: DomainInfo): Promise<void> {
    const conn = await this.getConnection();
    
    await this.executeUpdate(
      conn,
      'INSERT INTO DOMAINS (id, name, description, created, lastAccess) VALUES (?, ?, ?, ?, ?)',
      [domain.id, domain.name, domain.description, domain.created, domain.lastAccess]
    );
  }
  
  /**
   * Get persistence state
   * @returns Persistence state
   */
  async getPersistenceState(): Promise<PersistenceState> {
    const conn = await this.getConnection();
    const row = await this.executeQuerySingle(conn, 'SELECT * FROM PERSISTENCE WHERE id = 1');
    
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
    const conn = await this.getConnection();
    
    // Check if persistence state exists
    const exists = await this.executeQuerySingle(conn, 'SELECT 1 FROM PERSISTENCE WHERE id = 1');
    
    if (exists) {
      // Update existing state
      await this.executeUpdate(
        conn,
        'UPDATE PERSISTENCE SET currentDomain = ?, lastAccess = ?, lastMemoryId = ? WHERE id = 1',
        [state.currentDomain, state.lastAccess, state.lastMemoryId]
      );
    } else {
      // Insert new state
      await this.executeUpdate(
        conn,
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
    const conn = await this.getConnection();
    
    // Get nodes
    const nodeRows = await this.executeQuery(conn, 'SELECT * FROM MEMORY_NODES WHERE domain = ?', [domain]);
    const nodes = new Map<string, MemoryNode>();
    
    for (const row of nodeRows) {
      // Get tags for this node
      const tagRows = await this.executeQuery(conn, 'SELECT tag FROM MEMORY_TAGS WHERE nodeId = ?', [row.id]);
      const tags = tagRows.map((t: { tag: string }) => t.tag);
      
      // Get domain refs for this node
      const refRows = await this.executeQuery(conn, 'SELECT * FROM DOMAIN_REFS WHERE nodeId = ?', [row.id]);
      const domainRefs = refRows.map((ref: any) => ({
        domain: ref.targetDomain,
        nodeId: ref.targetNodeId,
        description: ref.description,
        bidirectional: this.getBooleanValue(ref.bidirectional)
      }));
      
      nodes.set(row.id, {
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
    
    // Get edges
    const edgeRows = await this.executeQuery(conn, 'SELECT * FROM MEMORY_EDGES WHERE domain = ?', [domain]);
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
    const conn = await this.getConnection();
    
    // Start a transaction
    await this.beginTransaction(conn);
    
    try {
      // Clear existing data for this domain
      await this.executeUpdate(conn, 'DELETE FROM MEMORY_NODES WHERE domain = ?', [domain]);
      await this.executeUpdate(conn, 'DELETE FROM MEMORY_EDGES WHERE domain = ?', [domain]);
      
      // Insert nodes
      for (const node of nodes.values()) {
        await this.executeUpdate(
          conn,
          'INSERT INTO MEMORY_NODES (id, domain, content, timestamp, path, content_summary, summary_timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [node.id, domain, node.content, node.timestamp, node.path || '/', node.content_summary, node.summary_timestamp]
        );
        
        // Insert tags
        if (node.tags && node.tags.length > 0) {
          for (const tag of node.tags) {
            await this.executeUpdate(
              conn,
              this.getInsertIgnoreStatement('MEMORY_TAGS', '(nodeId, tag) VALUES (?, ?)'),
              [node.id, tag]
            );
          }
        }
        
        // Insert domain refs
        if (node.domainRefs && node.domainRefs.length > 0) {
          for (const ref of node.domainRefs) {
            await this.executeUpdate(
              conn,
              this.getInsertIgnoreStatement('DOMAIN_REFS', '(nodeId, domain, targetDomain, targetNodeId, description, bidirectional) VALUES (?, ?, ?, ?, ?, ?)'),
              [node.id, domain, ref.domain, ref.nodeId, ref.description || null, this.setBooleanValue(ref.bidirectional)]
            );
          }
        }
      }
      
      // Insert edges
      for (const edge of edges) {
        const edgeId = `${edge.source}-${edge.target}-${edge.type}`;
        await this.executeUpdate(
          conn,
          this.getInsertReplaceStatement('MEMORY_EDGES', '(id, source, target, type, strength, timestamp, domain) VALUES (?, ?, ?, ?, ?, ?, ?)'),
          [edgeId, edge.source, edge.target, edge.type, edge.strength, edge.timestamp, domain]
        );
      }
      
      // Commit the transaction
      await this.commitTransaction(conn);
    } catch (error) {
      // Rollback on error
      await this.rollbackTransaction(conn);
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
  abstract searchContent(query: string, domain?: string, maxResults?: number): Promise<MemoryNode[]>;
  
  /**
   * Execute a query that returns multiple rows
   */
  protected abstract executeQuery(connection: any, sql: string, params?: any[]): Promise<any[]>;
  
  /**
   * Execute a query that returns a single row
   */
  protected abstract executeQuerySingle(connection: any, sql: string, params?: any[]): Promise<any>;
  
  /**
   * Execute an update statement
   */
  protected abstract executeUpdate(connection: any, sql: string, params?: any[]): Promise<any>;
  
  /**
   * Begin a database transaction
   */
  protected abstract beginTransaction(connection: any): Promise<void>;
  
  /**
   * Commit a database transaction
   */
  protected abstract commitTransaction(connection: any): Promise<void>;
  
  /**
   * Rollback a database transaction
   */
  protected abstract rollbackTransaction(connection: any): Promise<void>;
  
  /**
   * Get the appropriate INSERT IGNORE statement for the database
   */
  protected abstract getInsertIgnoreStatement(table: string, valuesClause: string): string;
  
  /**
   * Get the appropriate INSERT REPLACE statement for the database
   */
  protected abstract getInsertReplaceStatement(table: string, valuesClause: string): string;
  
  /**
   * Convert a database boolean value to a JavaScript boolean
   */
  protected abstract getBooleanValue(value: any): boolean;
  
  /**
   * Convert a JavaScript boolean to a database value
   */
  protected abstract setBooleanValue(value?: boolean): any;
}