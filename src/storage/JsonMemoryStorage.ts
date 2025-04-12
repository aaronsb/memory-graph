import { promises as fs } from 'fs';
import path from 'path';
import { DomainInfo, GraphEdge, MemoryNode, PersistenceState } from '../types/graph.js';
import { MemoryStorage } from './MemoryStorage.js';

/**
 * JSON file-based implementation of MemoryStorage
 */
export class JsonMemoryStorage implements MemoryStorage {
  private storageDir: string;
  private memoriesDir: string;
  private domainsFile: string;
  private persistenceFile: string;

  /**
   * Constructor
   * @param storageDir Storage directory
   */
  constructor(storageDir: string) {
    this.storageDir = storageDir;
    this.memoriesDir = path.join(storageDir, 'memories');
    this.domainsFile = path.join(storageDir, 'domains.json');
    this.persistenceFile = path.join(storageDir, 'persistence.json');
  }

  /**
   * Initialize the storage
   * Creates necessary directories
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.storageDir, { recursive: true });
    await fs.mkdir(this.memoriesDir, { recursive: true });
  }

  /**
   * Get all domains
   * @returns Map of domain IDs to domain info
   */
  async getDomains(): Promise<Map<string, DomainInfo>> {
    try {
      const data = await fs.readFile(this.domainsFile, 'utf-8');
      const parsed = JSON.parse(data);
      const domains = new Map<string, DomainInfo>();
      
      Object.entries(parsed).forEach(([id, info]) => {
        domains.set(id, info as DomainInfo);
      });
      
      return domains;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return new Map();
      }
      throw error;
    }
  }

  /**
   * Save domains
   * @param domains Map of domain IDs to domain info
   */
  async saveDomains(domains: Map<string, DomainInfo>): Promise<void> {
    const data = Object.fromEntries(domains);
    await fs.writeFile(this.domainsFile, JSON.stringify(data, null, 2));
  }

  /**
   * Create a new domain
   * @param domain Domain info
   */
  async createDomain(domain: DomainInfo): Promise<void> {
    const domains = await this.getDomains();
    domains.set(domain.id, domain);
    await this.saveDomains(domains);
    
    // Create empty memory file for the new domain
    const emptyData = { nodes: {}, edges: [] };
    await fs.writeFile(
      path.join(this.memoriesDir, `${domain.id}.json`),
      JSON.stringify(emptyData, null, 2)
    );
  }

  /**
   * Get persistence state
   * @returns Persistence state
   */
  async getPersistenceState(): Promise<PersistenceState> {
    try {
      const data = await fs.readFile(this.persistenceFile, 'utf-8');
      return JSON.parse(data) as PersistenceState;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error('Persistence state not found');
      }
      throw error;
    }
  }

  /**
   * Save persistence state
   * @param state Persistence state
   */
  async savePersistenceState(state: PersistenceState): Promise<void> {
    await fs.writeFile(this.persistenceFile, JSON.stringify(state, null, 2));
  }

  /**
   * Get memories for a domain
   * @param domain Domain ID
   * @returns Object containing nodes and edges
   */
  async getMemories(domain: string): Promise<{ nodes: Map<string, MemoryNode>, edges: GraphEdge[] }> {
    try {
      const memoryFile = path.join(this.memoriesDir, `${domain}.json`);
      const data = await fs.readFile(memoryFile, 'utf-8');
      const parsed = JSON.parse(data);
      
      const nodes = new Map<string, MemoryNode>();
      if (parsed.nodes) {
        Object.entries(parsed.nodes).forEach(([id, node]) => {
          nodes.set(id, node as MemoryNode);
        });
      }
      
      const edges: GraphEdge[] = [];
      if (Array.isArray(parsed.edges)) {
        edges.push(...parsed.edges);
      }
      
      return { nodes, edges };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { nodes: new Map(), edges: [] };
      }
      throw error;
    }
  }

  /**
   * Save memories for a domain
   * @param domain Domain ID
   * @param nodes Map of node IDs to nodes
   * @param edges Array of edges
   */
  async saveMemories(domain: string, nodes: Map<string, MemoryNode>, edges: GraphEdge[]): Promise<void> {
    const memoryFile = path.join(this.memoriesDir, `${domain}.json`);
    const data = {
      nodes: Object.fromEntries(nodes),
      edges
    };
    await fs.writeFile(memoryFile, JSON.stringify(data, null, 2));
  }

  /**
   * Search memory content
   * Basic implementation that searches all domains
   * @param query Search query
   * @param domain Optional domain to restrict search to
   * @param maxResults Maximum number of results to return
   * @returns Array of matching memory nodes
   */
  async searchContent(query: string, domain?: string, maxResults: number = 20): Promise<MemoryNode[]> {
    const results: MemoryNode[] = [];
    const domains = await this.getDomains();
    
    // If domain is specified, only search that domain
    const domainsToSearch = domain ? [domain] : Array.from(domains.keys());
    
    for (const domainId of domainsToSearch) {
      const { nodes } = await this.getMemories(domainId);
      
      // Simple text search
      const queryLower = query.toLowerCase();
      for (const node of nodes.values()) {
        if (node.content.toLowerCase().includes(queryLower)) {
          results.push(node);
          
          if (results.length >= maxResults) {
            return results;
          }
        }
      }
    }
    
    return results;
  }
}
