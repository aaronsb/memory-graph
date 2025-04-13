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
      
      // Query to get popular tags (top 10%)
      const query = `
        WITH TagCounts AS (
          SELECT 
            tag, 
            COUNT(*) AS frequency
          FROM MEMORY_TAGS
          GROUP BY tag
        ),
        TagStats AS (
          SELECT 
            COUNT(DISTINCT tag) AS totalUniqueTags
          FROM MEMORY_TAGS
        )
        SELECT 
          tc.tag, 
          tc.frequency
        FROM TagCounts tc, TagStats ts
        ORDER BY tc.frequency DESC
        LIMIT (ts.totalUniqueTags * 0.1)
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
      
      // Query to get essential priority memories based on graph metrics
      const query = `
        -- Calculate importance scores based on graph metrics
        WITH MemoryScores AS (
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
            -- Count of high-value relationship types (e.g., "synthesizes", "summarizes")
            (SELECT COUNT(*) FROM MEMORY_EDGES 
             WHERE domain = m.domain AND (source = m.id OR target = m.id)
             AND type IN ('synthesizes', 'summarizes', 'relates_to')) AS key_relation_count
          FROM MEMORY_NODES m
        ),
        -- Calculate final score using weighted components
        ScoredMemories AS (
          SELECT
            id,
            domain,
            content,
            timestamp,
            connection_count,
            strength_sum,
            key_relation_count,
            -- Weighted score formula
            (connection_count * 2) + (strength_sum * 3) + (key_relation_count * 4) AS importance_score
          FROM MemoryScores
        ),
        -- Get domain info
        DomainInfo AS (
          SELECT id, name, description
          FROM DOMAINS
        )
        -- Select top memories for each domain based on importance score
        SELECT 
          sm.domain,
          d.name AS domain_name,
          d.description AS domain_description,
          sm.id,
          sm.content,
          sm.timestamp,
          sm.connection_count,
          sm.strength_sum,
          sm.key_relation_count,
          sm.importance_score,
          (SELECT GROUP_CONCAT(tag, ',') FROM MEMORY_TAGS WHERE nodeId = sm.id) AS tags
        FROM ScoredMemories sm
        JOIN DomainInfo d ON sm.domain = d.id
        JOIN (
          -- Get threshold score for each domain (top 10% or at least 5 memories)
          SELECT 
            domain,
            MAX(importance_score) AS max_score,
            -- Calculate threshold as either:
            -- 1. Score that captures top 10% of memories, or
            -- 2. Score of the 5th highest-scored memory (whichever is higher)
            MAX(
              (SELECT COALESCE(MIN(importance_score), 0) FROM (
                SELECT importance_score FROM ScoredMemories s2 
                WHERE s2.domain = s1.domain
                ORDER BY importance_score DESC
                LIMIT MAX(5, (SELECT COUNT(*) / 10 FROM ScoredMemories s3 WHERE s3.domain = s1.domain))
              )),
              0 -- Fallback if there are fewer than 5 memories
            ) AS threshold_score
          FROM ScoredMemories s1
          GROUP BY domain
        ) domain_stats ON sm.domain = domain_stats.domain
        WHERE sm.importance_score >= domain_stats.threshold_score
        ORDER BY sm.domain, sm.importance_score DESC
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
