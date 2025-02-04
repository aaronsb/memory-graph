import { promises as fs } from 'fs';
import path from 'path';
import {
  MemoryNode,
  GraphEdge,
  MemoryGraphConfig,
  StoreMemoryInput,
  RecallMemoriesInput,
  ForgetMemoryInput,
  RecallResult,
  RecallStrategy,
  Relationship
} from '../types/graph.js';

export class MemoryGraph {
  private nodes: Map<string, MemoryNode>;
  private edges: GraphEdge[];
  private config: MemoryGraphConfig;
  private memoryFile: string;

  constructor(config: MemoryGraphConfig) {
    this.nodes = new Map();
    this.edges = [];
    this.config = config;
    this.memoryFile = path.join(config.storageDir, 'memory.json');
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.config.storageDir, { recursive: true });
    
    try {
      const data = await fs.readFile(this.memoryFile, 'utf-8');
      const parsed = JSON.parse(data);
      
      // Load nodes
      if (parsed.nodes) {
        Object.entries(parsed.nodes).forEach(([id, node]) => {
          this.nodes.set(id, node as MemoryNode);
        });
      }
      
      // Load edges
      if (Array.isArray(parsed.edges)) {
        this.edges = parsed.edges;
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      // File doesn't exist yet - that's fine for first run
    }
  }

  private async save(): Promise<void> {
    const data = {
      nodes: Object.fromEntries(this.nodes),
      edges: this.edges,
    };
    await fs.writeFile(this.memoryFile, JSON.stringify(data, null, 2));
  }

  async storeMemory(input: StoreMemoryInput): Promise<MemoryNode> {
    const node: MemoryNode = {
      id: this.generateId(),
      content: input.content,
      timestamp: new Date().toISOString(),
      path: input.path || this.config.defaultPath || '/',
      tags: input.tags,
    };

    this.nodes.set(node.id, node);

    // Create edges for relationships
    if (input.relationships) {
      Object.entries(input.relationships).forEach(([type, relationships]) => {
        relationships.forEach(rel => {
          if (this.nodes.has(rel.targetId)) {
            this.edges.push({
              source: node.id,
              target: rel.targetId,
              type,
              strength: rel.strength,
              timestamp: node.timestamp,
            });
          }
        });
      });
    }

    await this.save();
    return node;
  }

  async recallMemories(input: RecallMemoriesInput): Promise<RecallResult[]> {
    let candidates = Array.from(this.nodes.values());
    let results: RecallResult[] = [];

    // Apply time filters first
    if (input.before) {
      candidates = candidates.filter(node => node.timestamp < input.before!);
    }
    if (input.after) {
      candidates = candidates.filter(node => node.timestamp > input.after!);
    }

    switch (input.strategy) {
      case 'recent':
        results = this.getRecentMemories(candidates, input);
        break;
      case 'related':
        results = await this.getRelatedMemories(candidates, input);
        break;
      case 'path':
        results = this.getPathMemories(candidates, input);
        break;
      case 'tag':
        results = this.getTagMemories(candidates, input);
        break;
    }

    return results.slice(0, input.maxNodes);
  }

  private getRecentMemories(candidates: MemoryNode[], input: RecallMemoriesInput): RecallResult[] {
    return candidates
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .map(node => ({
        node,
        edges: this.getNodeEdges(node.id),
        score: 1
      }));
  }

  private async getRelatedMemories(candidates: MemoryNode[], input: RecallMemoriesInput): Promise<RecallResult[]> {
    if (!input.startNodeId) {
      return [];
    }

    const results: RecallResult[] = [];
    const visited = new Set<string>();
    const queue: [string, number][] = [[input.startNodeId, 0]];

    while (queue.length > 0 && results.length < input.maxNodes) {
      const [currentId, depth] = queue.shift()!;
      
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const node = this.nodes.get(currentId);
      if (!node) continue;

      const nodeEdges = this.getNodeEdges(currentId);
      const relevantEdges = input.relationshipTypes
        ? nodeEdges.filter(e => input.relationshipTypes!.includes(e.type))
        : nodeEdges;

      if (relevantEdges.length > 0) {
        const score = 1 / (depth + 1);
        if (!input.minStrength || relevantEdges.some(e => e.strength >= input.minStrength!)) {
          results.push({
            node,
            edges: relevantEdges,
            score
          });
        }
      }

      // Add connected nodes to queue
      relevantEdges.forEach(edge => {
        const nextId = edge.target === currentId ? edge.source : edge.target;
        if (!visited.has(nextId)) {
          queue.push([nextId, depth + 1]);
        }
      });
    }

    return results;
  }

  private getPathMemories(candidates: MemoryNode[], input: RecallMemoriesInput): RecallResult[] {
    if (!input.path) return [];

    return candidates
      .filter(node => node.path === input.path)
      .map(node => ({
        node,
        edges: this.getNodeEdges(node.id),
        score: 1
      }));
  }

  private getTagMemories(candidates: MemoryNode[], input: RecallMemoriesInput): RecallResult[] {
    if (!input.tags || input.tags.length === 0) return [];

    return candidates
      .filter(node => input.tags!.every(tag => node.tags?.includes(tag)))
      .map(node => ({
        node,
        edges: this.getNodeEdges(node.id),
        score: 1
      }));
  }

  private getNodeEdges(nodeId: string): GraphEdge[] {
    return this.edges.filter(edge => 
      edge.source === nodeId || edge.target === nodeId
    );
  }

  async forgetMemory(input: ForgetMemoryInput): Promise<boolean> {
    const exists = this.nodes.delete(input.id);
    
    if (exists) {
      if (input.cascade) {
        // Get all directly connected node IDs
        const connectedIds = new Set(
          this.edges
            .filter(edge => edge.source === input.id || edge.target === input.id)
            .map(edge => edge.source === input.id ? edge.target : edge.source)
        );

        // Delete connected nodes
        connectedIds.forEach(id => this.nodes.delete(id));
      }

      // Remove all affected edges
      this.edges = this.edges.filter(edge => 
        !input.cascade
          ? edge.source !== input.id && edge.target !== input.id
          : !this.isEdgeAffected(edge, input.id)
      );

      await this.save();
    }

    return exists;
  }

  private isEdgeAffected(edge: GraphEdge, deletedId: string): boolean {
    return edge.source === deletedId || 
           edge.target === deletedId || 
           !this.nodes.has(edge.source) || 
           !this.nodes.has(edge.target);
  }
}
