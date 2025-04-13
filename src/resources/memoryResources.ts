import {
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { MemoryGraph } from '../graph/MemoryGraph.js';
import { SqliteMemoryStorage } from '../storage/SqliteMemoryStorage.js';
import { Database } from 'sqlite';

/**
 * Class to handle MCP resources for the memory graph
 */
export class MemoryResources {
  private graph: MemoryGraph;
  private db: Database | null = null;

  constructor(graph: MemoryGraph) {
    this.graph = graph;
  }

  /**
   * Get the SQLite database connection from the storage
   * @returns Database connection
   */
  private async getDatabase(): Promise<Database> {
    if (!this.db) {
      // Access the storage from the graph
      const storage = (this.graph as any).storage;
      if (storage instanceof SqliteMemoryStorage) {
        this.db = await (storage as any).getDatabase();
      } else {
        throw new McpError(
          ErrorCode.InternalError,
          'SQLite storage is required for memory resources'
        );
      }
    }
    
    if (!this.db) {
      throw new McpError(
        ErrorCode.InternalError,
        'Failed to get database connection'
      );
    }
    
    return this.db;
  }

  /**
   * Get domain statistics
   * @returns Domain statistics
   */
  async getDomainStatistics(): Promise<any> {
    try {
      const db = await this.getDatabase();
      
      // Query to get domain statistics
      const query = `
        SELECT 
          d.id, d.name, d.description, d.created, d.lastAccess,
          COUNT(m.id) AS memoryCount,
          MIN(m.timestamp) AS firstMemoryDate,
          MAX(m.timestamp) AS lastMemoryDate
        FROM DOMAINS d
        LEFT JOIN MEMORY_NODES m ON d.id = m.domain
        GROUP BY d.id
      `;
      
      const domains = await db.all(query);
      
      return {
        domains: domains.map(domain => ({
          id: domain.id,
          name: domain.name,
          description: domain.description,
          created: domain.created,
          lastAccess: domain.lastAccess,
          statistics: {
            memoryCount: domain.memoryCount,
            firstMemoryDate: domain.firstMemoryDate,
            lastMemoryDate: domain.lastMemoryDate
          }
        }))
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get domain statistics: ${error}`
      );
    }
  }

  /**
   * Get memory edge filter terms
   * @returns Memory edge filter terms
   */
  async getEdgeFilterTerms(): Promise<any> {
    try {
      const db = await this.getDatabase();
      
      // Query to get edge filter terms
      const query = `
        SELECT 
          type, 
          COUNT(*) AS frequency
        FROM MEMORY_EDGES
        GROUP BY type
        ORDER BY frequency DESC
      `;
      
      const terms = await db.all(query);
      
      return {
        filterTerms: terms.map(term => ({
          type: term.type,
          frequency: term.frequency
        }))
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get edge filter terms: ${error}`
      );
    }
  }

  /**
   * Get popular tags
   * @returns Popular tags
   */
  async getPopularTags(): Promise<any> {
    try {
      const db = await this.getDatabase();
      
      // First check if there are any tags at all
      const countQuery = `SELECT COUNT(*) as count FROM MEMORY_TAGS`;
      const countResult = await db.get(countQuery);
      
      if (countResult.count === 0) {
        // No tags available
        return {
          popularTags: [],
          message: "No tags available in the memory graph"
        };
      }
      
      // Query to get popular tags (top 10 or all if less than 10)
      const query = `
        SELECT 
          tag, 
          COUNT(*) AS frequency
        FROM MEMORY_TAGS
        GROUP BY tag
        ORDER BY frequency DESC
        LIMIT 10
      `;
      
      const tags = await db.all(query);
      
      return {
        popularTags: tags.map(tag => ({
          tag: tag.tag,
          frequency: tag.frequency
        }))
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get popular tags: ${error}`
      );
    }
  }

  /**
   * Get essential priority memories
   * @returns Essential priority memories
   */
  async getEssentialPriorityMemories(): Promise<any> {
    try {
      const db = await this.getDatabase();
      
      // First check if there are any memories
      const countQuery = `SELECT COUNT(*) as count FROM MEMORY_NODES`;
      const countResult = await db.get(countQuery);
      
      if (countResult.count === 0) {
        // No memories available
        return {
          domains: [],
          message: "No memories available in the memory graph"
        };
      }
      
      // Simplified query to get essential priority memories
      const query = `
        -- Get domain info
        WITH DomainInfo AS (
          SELECT id, name, description
          FROM DOMAINS
        ),
        -- Calculate importance scores for each memory
        MemoryScores AS (
          SELECT
            m.id,
            m.domain,
            m.content,
            m.timestamp,
            -- Count of connections (degree centrality)
            (SELECT COUNT(*) FROM MEMORY_EDGES 
             WHERE domain = m.domain AND (source = m.id OR target = m.id)) AS connection_count,
            -- Sum of relationship strengths
            (SELECT COALESCE(SUM(strength), 0) FROM MEMORY_EDGES 
             WHERE domain = m.domain AND (source = m.id OR target = m.id)) AS strength_sum,
            -- Count of high-value relationship types
            (SELECT COUNT(*) FROM MEMORY_EDGES 
             WHERE domain = m.domain AND (source = m.id OR target = m.id)
             AND type IN ('synthesizes', 'summarizes', 'relates_to')) AS key_relation_count,
            -- Weighted score formula
            (SELECT COUNT(*) FROM MEMORY_EDGES 
             WHERE domain = m.domain AND (source = m.id OR target = m.id)) * 2 +
            (SELECT COALESCE(SUM(strength), 0) FROM MEMORY_EDGES 
             WHERE domain = m.domain AND (source = m.id OR target = m.id)) * 3 +
            (SELECT COUNT(*) FROM MEMORY_EDGES 
             WHERE domain = m.domain AND (source = m.id OR target = m.id)
             AND type IN ('synthesizes', 'summarizes', 'relates_to')) * 4 AS importance_score
          FROM MEMORY_NODES m
        )
        -- Select top 5 memories for each domain based on importance score
        SELECT 
          ms.domain,
          d.name AS domain_name,
          d.description AS domain_description,
          ms.id,
          ms.content,
          ms.timestamp,
          ms.connection_count,
          ms.strength_sum,
          ms.key_relation_count,
          ms.importance_score,
          (SELECT GROUP_CONCAT(tag, ',') FROM MEMORY_TAGS WHERE nodeId = ms.id) AS tags
        FROM MemoryScores ms
        JOIN DomainInfo d ON ms.domain = d.id
        WHERE ms.id IN (
          SELECT id FROM (
            SELECT id, domain, importance_score,
                   ROW_NUMBER() OVER (PARTITION BY domain ORDER BY importance_score DESC) as rank
            FROM MemoryScores
          ) ranked
          WHERE rank <= 5
        )
        ORDER BY ms.domain, ms.importance_score DESC
      `;
      
      const memories = await db.all(query);
      
      // Group memories by domain
      const domainMap = new Map();
      
      for (const memory of memories) {
        if (!domainMap.has(memory.domain)) {
          domainMap.set(memory.domain, {
            id: memory.domain,
            name: memory.domain_name,
            description: memory.domain_description,
            essentialMemories: []
          });
        }
        
        const domain = domainMap.get(memory.domain);
        
        // Parse tags
        const tags = memory.tags ? memory.tags.split(',') : [];
        
        // Add memory to domain
        domain.essentialMemories.push({
          id: memory.id,
          content: memory.content,
          timestamp: memory.timestamp,
          importanceScore: memory.importance_score,
          graphMetrics: {
            connectionCount: memory.connection_count,
            strengthSum: memory.strength_sum,
            keyRelationships: memory.key_relation_count,
            averageStrength: memory.connection_count > 0 
              ? memory.strength_sum / memory.connection_count 
              : 0
          },
          tags
        });
      }
      
      return {
        domains: Array.from(domainMap.values())
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get essential priority memories: ${error}`
      );
    }
  }
}
