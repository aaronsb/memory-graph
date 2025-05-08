import { DomainInfo, GraphEdge, MemoryNode, PersistenceState } from '../types/graph.js';

/**
 * Abstract interface for memory storage implementations
 * This allows for easy switching between different storage backends (JSON, SQLite, etc.)
 */
export interface MemoryStorage {
  /**
   * Initialize the storage
   * Creates necessary directories, files, tables, etc.
   */
  initialize(): Promise<void>;
  
  /**
   * Get all domains
   * @returns Map of domain IDs to domain info
   */
  getDomains(): Promise<Map<string, DomainInfo>>;
  
  /**
   * Save domains
   * @param domains Map of domain IDs to domain info
   */
  saveDomains(domains: Map<string, DomainInfo>): Promise<void>;
  
  /**
   * Create a new domain
   * @param domain Domain info
   */
  createDomain(domain: DomainInfo): Promise<void>;
  
  /**
   * Get persistence state
   * @returns Persistence state
   */
  getPersistenceState(): Promise<PersistenceState>;
  
  /**
   * Save persistence state
   * @param state Persistence state
   */
  savePersistenceState(state: PersistenceState): Promise<void>;
  
  /**
   * Get memories for a domain
   * @param domain Domain ID
   * @returns Object containing nodes and edges
   */
  getMemories(domain: string): Promise<{ nodes: Map<string, MemoryNode>, edges: GraphEdge[] }>;
  
  /**
   * Save memories for a domain
   * @param domain Domain ID
   * @param nodes Map of node IDs to nodes
   * @param edges Array of edges
   */
  saveMemories(domain: string, nodes: Map<string, MemoryNode>, edges: GraphEdge[]): Promise<void>;
  
  /**
   * Search memory content using full-text search
   * @param query Search query
   * @param domain Optional domain to restrict search to
   * @param maxResults Maximum number of results to return
   * @returns Array of matching memory nodes
   */
  searchContent(query: string, domain?: string, maxResults?: number): Promise<MemoryNode[]>;
}

/**
 * Storage type enum
 */
export enum StorageType {
  JSON = 'json',
  SQLITE = 'sqlite',
  MARIADB = 'mariadb'
}
