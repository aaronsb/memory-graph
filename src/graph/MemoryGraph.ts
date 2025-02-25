import { promises as fs } from 'fs';
import path from 'path';
import {
  MemoryNode,
  GraphEdge,
  MemoryGraphConfig,
  StoreMemoryInput,
  RecallMemoriesInput,
  ForgetMemoryInput,
  EditMemoryInput,
  RecallResult,
  RecallStrategy,
  Relationship,
  MatchDetails,
  DomainInfo,
  PersistenceState,
  DomainRef,
  DomainPointer,
  TraverseMemoriesInput
} from '../types/graph.js';

export class MemoryGraph {
  private nodes: Map<string, MemoryNode>;
  private edges: GraphEdge[];
  private config: MemoryGraphConfig;
  private currentDomain: string;
  private domains: Map<string, DomainInfo>;
  private memoryFile: string;
  private domainsFile: string;
  private persistenceFile: string;
  private memoriesDir: string;

  constructor(config: MemoryGraphConfig) {
    this.nodes = new Map();
    this.edges = [];
    this.config = config;
    this.currentDomain = config.defaultDomain || 'general';
    this.domains = new Map();
    
    // Set up file paths
    this.memoriesDir = path.join(config.storageDir, 'memories');
    this.domainsFile = path.join(config.storageDir, 'domains.json');
    this.persistenceFile = path.join(config.storageDir, 'persistence.json');
    this.memoryFile = path.join(this.memoriesDir, `${this.currentDomain}.json`);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  async initialize(): Promise<void> {
    // Create required directories
    await fs.mkdir(this.config.storageDir, { recursive: true });
    await fs.mkdir(this.memoriesDir, { recursive: true });
    
    // Initialize domains file if it doesn't exist
    try {
      const domainsData = await fs.readFile(this.domainsFile, 'utf-8');
      const parsed = JSON.parse(domainsData);
      Object.entries(parsed).forEach(([id, info]) => {
        this.domains.set(id, info as DomainInfo);
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Create default domain
        const defaultDomain: DomainInfo = {
          id: 'general',
          name: 'General',
          description: 'Default domain for general memories',
          created: new Date().toISOString(),
          lastAccess: new Date().toISOString()
        };
        this.domains.set('general', defaultDomain);
        await this.saveDomains();
      } else {
        throw error;
      }
    }

    // Load persistence state
    try {
      const persistenceData = await fs.readFile(this.persistenceFile, 'utf-8');
      const state = JSON.parse(persistenceData) as PersistenceState;
      if (this.domains.has(state.currentDomain)) {
        this.currentDomain = state.currentDomain;
        this.memoryFile = path.join(this.memoriesDir, `${this.currentDomain}.json`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        await this.savePersistence();
      } else {
        throw error;
      }
    }

    // Load or create current domain's memory file
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
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Create empty memory file
        const emptyData = { nodes: {}, edges: [] };
        await fs.writeFile(this.memoryFile, JSON.stringify(emptyData, null, 2));
      } else {
        throw error;
      }
    }
  }

  private async save(): Promise<void> {
    const data = {
      nodes: Object.fromEntries(this.nodes),
      edges: this.edges,
    };
    await fs.writeFile(this.memoryFile, JSON.stringify(data, null, 2));
    
    // Update domain's last access time
    const domain = this.domains.get(this.currentDomain);
    if (domain) {
      domain.lastAccess = new Date().toISOString();
      await this.saveDomains();
    }
    
    // Update persistence state
    await this.savePersistence();
  }

  private async saveDomains(): Promise<void> {
    const data = Object.fromEntries(this.domains);
    await fs.writeFile(this.domainsFile, JSON.stringify(data, null, 2));
  }

  private async savePersistence(): Promise<void> {
    const state: PersistenceState = {
      currentDomain: this.currentDomain,
      lastAccess: new Date().toISOString(),
      lastMemoryId: Array.from(this.nodes.keys()).pop()
    };
    await fs.writeFile(this.persistenceFile, JSON.stringify(state, null, 2));
  }

  async createDomain(id: string, name: string, description: string): Promise<DomainInfo> {
    if (this.domains.has(id)) {
      throw new Error(`Domain already exists: ${id}`);
    }

    const domain: DomainInfo = {
      id,
      name,
      description,
      created: new Date().toISOString(),
      lastAccess: new Date().toISOString()
    };

    this.domains.set(id, domain);
    await this.saveDomains();

    // Create empty memory file for new domain
    const domainFile = path.join(this.memoriesDir, `${id}.json`);
    await fs.writeFile(domainFile, JSON.stringify({ nodes: {}, edges: [] }, null, 2));

    return domain;
  }

  async selectDomain(id: string): Promise<DomainInfo> {
    const domain = this.domains.get(id);
    if (!domain) {
      throw new Error(`Domain not found: ${id}`);
    }

    // Save current state before switching
    await this.save();

    // Clear current memory state
    this.nodes.clear();
    this.edges = [];

    // Switch to new domain
    this.currentDomain = id;
    this.memoryFile = path.join(this.memoriesDir, `${id}.json`);
    
    // Load new domain's memories
    try {
      const data = await fs.readFile(this.memoryFile, 'utf-8');
      const parsed = JSON.parse(data);
      
      if (parsed.nodes) {
        Object.entries(parsed.nodes).forEach(([id, node]) => {
          this.nodes.set(id, node as MemoryNode);
        });
      }
      
      if (Array.isArray(parsed.edges)) {
        this.edges = parsed.edges;
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Create empty memory file if it doesn't exist
        const emptyData = { nodes: {}, edges: [] };
        await fs.writeFile(this.memoryFile, JSON.stringify(emptyData, null, 2));
      } else {
        throw error;
      }
    }

    // Update persistence state
    await this.savePersistence();

    return domain;
  }

  async listDomains(): Promise<DomainInfo[]> {
    return Array.from(this.domains.values());
  }

  getCurrentDomain(): string {
    return this.currentDomain;
  }

  /**
   * Find the best entry point in a target domain
   * If no entry point is specified, use the most recent memory in the target domain
   */
  private async findDomainEntryPoint(domainId: string): Promise<string | null> {
    // Save current state
    const currentDomainId = this.currentDomain;
    
    try {
      // Temporarily switch to target domain
      await this.selectDomain(domainId);
      
      // Find the most recent memory in the domain
      if (this.nodes.size === 0) {
        return null;
      }
      
      const sortedNodes = Array.from(this.nodes.values())
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      
      return sortedNodes[0].id;
    } catch (error) {
      console.error(`Error finding entry point in domain ${domainId}:`, error);
      return null;
    } finally {
      // Switch back to original domain
      if (currentDomainId !== domainId) {
        await this.selectDomain(currentDomainId);
      }
    }
  }

  /**
   * Create a cross-domain reference
   */
  private async createDomainReference(
    sourceNodeId: string, 
    targetDomain: string, 
    targetNodeId: string | undefined,
    bidirectional: boolean,
    description?: string
  ): Promise<DomainRef | null> {
    // Validate target domain exists
    if (!this.domains.has(targetDomain)) {
      console.error(`Target domain does not exist: ${targetDomain}`);
      return null;
    }
    
    // Find entry point if not specified
    let entryPointId = targetNodeId;
    if (!entryPointId) {
      const foundEntryPoint = await this.findDomainEntryPoint(targetDomain);
      if (!foundEntryPoint) {
        console.error(`Could not find entry point in domain: ${targetDomain}`);
        return null;
      }
      entryPointId = foundEntryPoint;
    }
    
    // Create domain reference
    const domainRef: DomainRef = {
      domain: targetDomain,
      nodeId: entryPointId,
      description,
      bidirectional
    };
    
    // If bidirectional, create the reverse reference
    if (bidirectional) {
      const currentDomainId = this.currentDomain;
      const sourceNode = this.nodes.get(sourceNodeId);
      
      if (sourceNode) {
        try {
          // Switch to target domain
          await this.selectDomain(targetDomain);
          
          // Get target node
          const targetNode = this.nodes.get(entryPointId);
          
          if (targetNode) {
            // Add reverse reference
            if (!targetNode.domainRefs) {
              targetNode.domainRefs = [];
            }
            
            // Check if reference already exists
            const existingRefIndex = targetNode.domainRefs.findIndex(
              ref => ref.domain === currentDomainId && ref.nodeId === sourceNodeId
            );
            
            if (existingRefIndex === -1) {
              targetNode.domainRefs.push({
                domain: currentDomainId,
                nodeId: sourceNodeId,
                description: `Bidirectional reference to ${sourceNode.content.substring(0, 50)}${sourceNode.content.length > 50 ? '...' : ''}`,
                bidirectional: true
              });
              
              await this.save();
            }
          }
        } catch (error) {
          console.error(`Error creating bidirectional reference:`, error);
        } finally {
          // Switch back to original domain
          await this.selectDomain(currentDomainId);
        }
      }
    }
    
    return domainRef;
  }

  async storeMemory(input: StoreMemoryInput): Promise<MemoryNode> {
    const node: MemoryNode = {
      id: this.generateId(),
      content: input.content,
      timestamp: new Date().toISOString(),
      path: input.path || this.config.defaultPath || '/',
      tags: input.tags,
      domainRefs: input.domainRefs ? [...input.domainRefs] : undefined
    };

    // Handle domain pointer if provided
    if (input.domainPointer) {
      const { domain, entryPointId, bidirectional, description } = input.domainPointer;
      
      const domainRef = await this.createDomainReference(
        node.id,
        domain,
        entryPointId,
        bidirectional,
        description
      );
      
      if (domainRef) {
        if (!node.domainRefs) {
          node.domainRefs = [];
        }
        node.domainRefs.push(domainRef);
      }
    }

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

    if (input.combinedStrategy) {
      // Combine results from multiple strategies
      const strategyResults: RecallResult[][] = [];

      if (input.strategy === 'content' || input.search) {
        strategyResults.push(this.searchContent(candidates, input));
      }
      if (input.path) {
        strategyResults.push(this.getPathMemories(candidates, input));
      }
      if (input.tags?.length) {
        strategyResults.push(this.getTagMemories(candidates, input));
      }
      if (input.startNodeId) {
        strategyResults.push(await this.getRelatedMemories(candidates, input));
      }

      results = this.combineSearchResults(strategyResults, input);
    } else {
      // Single strategy
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
        case 'content':
          results = this.searchContent(candidates, input);
          break;
      }
    }

    // Sort results
    if (input.sortBy) {
      results = this.sortResults(results, input.sortBy);
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

  private searchContent(candidates: MemoryNode[], input: RecallMemoriesInput): RecallResult[] {
    if (!input.search?.keywords?.length && !input.search?.regex) {
      return [];
    }

    const results: RecallResult[] = [];
    const regex = input.search.regex 
      ? new RegExp(input.search.regex, input.search.caseSensitive ? '' : 'i')
      : null;

    for (const node of candidates) {
      const matchDetails: MatchDetails = {
        matches: [],
        positions: [],
        relevance: 0
      };

      if (regex) {
        // Regex search
        const matches = [...node.content.matchAll(regex)];
        if (matches.length > 0) {
          matchDetails.matches = matches.map(m => m[0]);
          matchDetails.positions = matches.map(m => m.index!);
          matchDetails.relevance = matches.length / node.content.length;
        }
      } else if (input.search?.keywords) {
        // Keyword search
        for (const keyword of input.search.keywords) {
          const searchTerm = input.search.caseSensitive ? keyword : keyword.toLowerCase();
          const content = input.search.caseSensitive ? node.content : node.content.toLowerCase();
          
          if (input.search.fuzzyMatch) {
            // Simple fuzzy matching using Levenshtein distance
            const matches = this.findFuzzyMatches(content, searchTerm);
            matchDetails.matches.push(...matches.terms);
            matchDetails.positions.push(...matches.positions);
            matchDetails.relevance += matches.score;
          } else {
            let pos = -1;
            while ((pos = content.indexOf(searchTerm, pos + 1)) !== -1) {
              matchDetails.matches.push(node.content.slice(pos, pos + searchTerm.length));
              matchDetails.positions.push(pos);
              matchDetails.relevance += 1;
            }
          }
        }

        if (matchDetails.matches.length > 0) {
          matchDetails.relevance /= node.content.length;
        }
      }

      if (matchDetails.matches.length > 0) {
        results.push({
          node,
          edges: this.getNodeEdges(node.id),
          score: matchDetails.relevance,
          matchDetails
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  private findFuzzyMatches(text: string, term: string): { terms: string[], positions: number[], score: number } {
    const result = { terms: [] as string[], positions: [] as number[], score: 0 };
    const maxDistance = Math.floor(term.length * 0.3); // Allow 30% difference

    for (let i = 0; i < text.length - term.length + 1; i++) {
      const candidate = text.slice(i, i + term.length);
      const distance = this.levenshteinDistance(term, candidate);
      
      if (distance <= maxDistance) {
        result.terms.push(candidate);
        result.positions.push(i);
        result.score += 1 - (distance / term.length);
      }
    }

    return result;
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + substitutionCost
        );
      }
    }

    return matrix[b.length][a.length];
  }

  private combineSearchResults(results: RecallResult[][], input: RecallMemoriesInput): RecallResult[] {
    const nodeMap = new Map<string, RecallResult>();
    
    for (const resultSet of results) {
      for (const result of resultSet) {
        const existing = nodeMap.get(result.node.id);
        if (!existing || result.score > existing.score) {
          nodeMap.set(result.node.id, result);
        }
      }
    }

    return Array.from(nodeMap.values());
  }

  private sortResults(results: RecallResult[], sortBy: 'relevance' | 'date' | 'strength'): RecallResult[] {
    switch (sortBy) {
      case 'relevance':
        return results.sort((a, b) => b.score - a.score);
      case 'date':
        return results.sort((a, b) => b.node.timestamp.localeCompare(a.node.timestamp));
      case 'strength':
        return results.sort((a, b) => {
          const aStrength = Math.max(...a.edges.map(e => e.strength));
          const bStrength = Math.max(...b.edges.map(e => e.strength));
          return bStrength - aStrength;
        });
    }
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

  async editMemory(input: EditMemoryInput): Promise<MemoryNode> {
    const node = this.nodes.get(input.id);
    if (!node) {
      throw new Error(`Memory not found: ${input.id}`);
    }

    // Update content if provided
    if (input.content !== undefined) {
      node.content = input.content;
    }

    // Update relationships if provided
    if (input.relationships) {
      // Remove existing edges for this node
      this.edges = this.edges.filter(edge => edge.source !== input.id);

      // Add new edges
      Object.entries(input.relationships).forEach(([type, relationships]) => {
        relationships.forEach(rel => {
          if (this.nodes.has(rel.targetId)) {
            this.edges.push({
              source: input.id,
              target: rel.targetId,
              type,
              strength: rel.strength,
              timestamp: new Date().toISOString(),
            });
          }
        });
      });
    }

    await this.save();
    return node;
  }

  /**
   * Traverse the memory graph following relationships and domain pointers
   */
  async traverseMemories(input: TraverseMemoriesInput): Promise<{
    nodes: MemoryNode[];
    edges: GraphEdge[];
    crossDomainConnections: {
      fromDomain: string;
      fromNodeId: string;
      toDomain: string;
      toNodeId: string;
      description?: string;
    }[];
    context: {
      startingPoint: string;
      depth: number;
      domains: string[];
    };
  }> {
    // Default values
    const maxDepth = input.maxDepth || 2;
    const followDomainPointers = input.followDomainPointers !== false; // Default to true
    const maxNodesPerDomain = input.maxNodesPerDomain || 20;
    
    // Get starting node
    let startNodeId = input.startNodeId;
    if (!startNodeId) {
      // Use most recent memory if no starting point specified
      const recentNodes = Array.from(this.nodes.values())
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      
      if (recentNodes.length === 0) {
        throw new Error('No memories found in current domain');
      }
      
      startNodeId = recentNodes[0].id;
    }
    
    const startNode = this.nodes.get(startNodeId);
    if (!startNode) {
      throw new Error(`Starting memory not found: ${startNodeId}`);
    }
    
    // Track visited nodes to prevent cycles
    const visited = new Set<string>();
    const visitedByDomain = new Map<string, Set<string>>();
    visitedByDomain.set(this.currentDomain, new Set<string>());
    
    // Track results
    const resultNodes: MemoryNode[] = [];
    const resultEdges: GraphEdge[] = [];
    const crossDomainConnections: {
      fromDomain: string;
      fromNodeId: string;
      toDomain: string;
      toNodeId: string;
      description?: string;
    }[] = [];
    
    // Track domains visited
    const domainsVisited = new Set<string>([this.currentDomain]);
    
    // BFS queue with [nodeId, domain, depth]
    const queue: [string, string, number][] = [[startNodeId, this.currentDomain, 0]];
    
    // Remember original domain to switch back at the end
    const originalDomain = this.currentDomain;
    
    try {
      while (queue.length > 0) {
        const [currentId, currentDomain, depth] = queue.shift()!;
        
        // Skip if we've visited this node already
        if (visited.has(`${currentDomain}:${currentId}`)) {
          continue;
        }
        
        // Skip if we've reached max nodes for this domain
        const domainVisited = visitedByDomain.get(currentDomain) || new Set<string>();
        if (domainVisited.size >= maxNodesPerDomain) {
          continue;
        }
        
        // Skip if we're only interested in a specific domain
        if (input.targetDomain && currentDomain !== input.targetDomain) {
          continue;
        }
        
        // Mark as visited
        visited.add(`${currentDomain}:${currentId}`);
        domainVisited.add(currentId);
        visitedByDomain.set(currentDomain, domainVisited);
        
        // Switch to the current domain if needed
        if (currentDomain !== this.currentDomain) {
          await this.selectDomain(currentDomain);
        }
        
        // Get the node
        const node = this.nodes.get(currentId);
        if (!node) {
          continue; // Skip if node doesn't exist
        }
        
        // Add to results
        resultNodes.push(node);
        
        // Stop traversing deeper if we've reached max depth
        if (depth >= maxDepth) {
          continue;
        }
        
        // Get edges for this node
        const nodeEdges = this.getNodeEdges(currentId);
        
        // Add edges to results
        for (const edge of nodeEdges) {
          resultEdges.push(edge);
          
          // Add connected nodes to queue
          const nextId = edge.target === currentId ? edge.source : edge.target;
          if (!domainVisited.has(nextId)) {
            queue.push([nextId, currentDomain, depth + 1]);
          }
        }
        
        // Follow domain pointers if enabled
        if (followDomainPointers && node.domainRefs && node.domainRefs.length > 0) {
          for (const domainRef of node.domainRefs) {
            // Skip if we've already visited too many nodes in the target domain
            const targetDomainVisited = visitedByDomain.get(domainRef.domain) || new Set<string>();
            if (targetDomainVisited.size >= maxNodesPerDomain) {
              continue;
            }
            
            // Skip if we're only interested in a specific domain
            if (input.targetDomain && domainRef.domain !== input.targetDomain) {
              continue;
            }
            
            // Add to cross-domain connections
            crossDomainConnections.push({
              fromDomain: currentDomain,
              fromNodeId: currentId,
              toDomain: domainRef.domain,
              toNodeId: domainRef.nodeId,
              description: domainRef.description
            });
            
            // Add target domain to visited domains
            domainsVisited.add(domainRef.domain);
            
            // Initialize visited set for target domain if needed
            if (!visitedByDomain.has(domainRef.domain)) {
              visitedByDomain.set(domainRef.domain, new Set<string>());
            }
            
            // Add target node to queue
            queue.push([domainRef.nodeId, domainRef.domain, depth + 1]);
          }
        }
      }
    } finally {
      // Switch back to original domain
      if (this.currentDomain !== originalDomain) {
        await this.selectDomain(originalDomain);
      }
    }
    
    return {
      nodes: resultNodes,
      edges: resultEdges,
      crossDomainConnections,
      context: {
        startingPoint: startNodeId,
        depth: maxDepth,
        domains: Array.from(domainsVisited)
      }
    };
  }
}
