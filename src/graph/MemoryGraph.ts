import { promises as fs } from 'fs';
import path from 'path';
import {
  MemoryNode,
  GraphEdge,
  MemoryGraphConfig,
  MemoryQueryOptions,
  StoreMemoryInput,
  UpdateMemoryInput,
  MemorySearchResult,
} from '../types/graph.js';

export class MemoryGraph {
  private nodes: Map<string, MemoryNode>;
  private edges: GraphEdge[];
  private config: MemoryGraphConfig;
  private activeFile: string;

  constructor(config: MemoryGraphConfig) {
    this.nodes = new Map();
    this.edges = [];
    this.config = config;
    // Default to memory.json in the storage directory if no specific files are configured
    this.activeFile = path.join(config.storageDir, 'memory.json');
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  private async loadMemoryFile(filePath: string): Promise<void> {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const { nodes, edges } = JSON.parse(data);
      
      // Merge nodes and edges from this file
      for (const [id, node] of Object.entries(nodes)) {
        this.nodes.set(id, node as MemoryNode);
      }
      this.edges.push(...edges);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      // If file doesn't exist, it will be created on first save
    }
  }

  private async findJsonFiles(dir: string): Promise<string[]> {
    const files = await fs.readdir(dir);
    return files
      .filter(file => file.endsWith('.json'))
      .map(file => path.join(dir, file));
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.config.storageDir, { recursive: true });

    if (this.config.loadAllFiles) {
      // Load all JSON files in the directory
      const files = await this.findJsonFiles(this.config.storageDir);
      for (const file of files) {
        await this.loadMemoryFile(file);
      }
    } else if (this.config.memoryFiles && this.config.memoryFiles.length > 0) {
      // Load specific memory files
      for (const file of this.config.memoryFiles) {
        const filePath = path.join(this.config.storageDir, file);
        await this.loadMemoryFile(filePath);
      }
      // Use the first specified file as the active file for saving new memories
      this.activeFile = path.join(this.config.storageDir, this.config.memoryFiles[0]);
    } else {
      // Load default memory file
      await this.loadMemoryFile(this.activeFile);
    }
  }

  private async save(): Promise<void> {
    const data = {
      nodes: Object.fromEntries(this.nodes),
      edges: this.edges,
    };
    await fs.writeFile(this.activeFile, JSON.stringify(data, null, 2));
  }

  async storeMemory(input: StoreMemoryInput): Promise<MemoryNode> {
    const node: MemoryNode = {
      id: this.generateId(),
      content: input.content,
      metadata: {
        timestamp: new Date().toISOString(),
        path: input.path || this.config.defaultPath || '/',
        tags: input.tags,
        relationships: input.relationships,
      },
    };

    this.nodes.set(node.id, node);

    // Create edges for relationships
    if (input.relationships) {
      Object.entries(input.relationships).forEach(([type, targetIds]) => {
        targetIds.forEach(targetId => {
          if (this.nodes.has(targetId)) {
            this.edges.push({
              source: node.id,
              target: targetId,
              type,
              metadata: {
                timestamp: node.metadata.timestamp,
              },
            });
          }
        });
      });
    }

    await this.save();
    return node;
  }

  async updateMemory(input: UpdateMemoryInput): Promise<MemoryNode | null> {
    const node = this.nodes.get(input.id);
    if (!node) return null;

    const updatedNode: MemoryNode = {
      ...node,
      content: input.content ?? node.content,
      metadata: {
        ...node.metadata,
        path: input.path ?? node.metadata.path,
        tags: input.tags ?? node.metadata.tags,
        relationships: input.relationships ?? node.metadata.relationships,
      },
    };

    this.nodes.set(node.id, updatedNode);

    // Update edges if relationships changed
    if (input.relationships) {
      // Remove old edges
      this.edges = this.edges.filter(edge => edge.source !== node.id);
      
      // Add new edges
      Object.entries(input.relationships).forEach(([type, targetIds]) => {
        targetIds.forEach(targetId => {
          if (this.nodes.has(targetId)) {
            this.edges.push({
              source: node.id,
              target: targetId,
              type,
              metadata: {
                timestamp: new Date().toISOString(),
              },
            });
          }
        });
      });
    }

    await this.save();
    return updatedNode;
  }

  async queryMemories(options: MemoryQueryOptions): Promise<MemoryNode[]> {
    let results = Array.from(this.nodes.values());

    if (options.path) {
      results = results.filter(node => node.metadata.path === options.path);
    }

    if (options.tags) {
      results = results.filter(node => 
        options.tags!.every(tag => node.metadata.tags?.includes(tag))
      );
    }

    if (options.relationshipType && options.relatedTo) {
      const edges = this.edges.filter(edge => 
        edge.type === options.relationshipType &&
        (edge.source === options.relatedTo || edge.target === options.relatedTo)
      );
      const relatedIds = new Set(edges.flatMap(edge => [edge.source, edge.target]));
      results = results.filter(node => relatedIds.has(node.id));
    }

    if (options.before) {
      results = results.filter(node => node.metadata.timestamp < options.before!);
    }

    if (options.after) {
      results = results.filter(node => node.metadata.timestamp > options.after!);
    }

    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  async deleteMemory(id: string): Promise<boolean> {
    const exists = this.nodes.delete(id);
    if (exists) {
      this.edges = this.edges.filter(edge => 
        edge.source !== id && edge.target !== id
      );
      await this.save();
    }
    return exists;
  }

  async searchMemories(query: string, limit = 10): Promise<MemorySearchResult[]> {
    const results: MemorySearchResult[] = [];
    
    for (const node of this.nodes.values()) {
      // Simple text matching score based on content
      const score = this.calculateRelevanceScore(node, query);
      if (score > 0) {
        results.push({ node, score });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private calculateRelevanceScore(node: MemoryNode, query: string): number {
    const content = node.content.toLowerCase();
    const terms = query.toLowerCase().split(/\s+/);
    
    let score = 0;
    terms.forEach(term => {
      if (content.includes(term)) {
        // Basic scoring: +1 for each matching term
        score += 1;
        // Bonus for exact matches
        if (content.includes(query.toLowerCase())) {
          score += 2;
        }
      }
    });

    return score;
  }
}
