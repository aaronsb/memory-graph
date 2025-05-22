# Memory Graph Implementation Details

This document contains detailed technical specifications for the proposed memory graph improvements. It serves as a reference for developers implementing the enhancements.

## 1. Standardized Edge Representation

### Relationship Type Enumeration
```typescript
enum RelationshipType {
  // Hierarchical relationships
  CONTAINS = "contains",
  PART_OF = "part_of",
  
  // Reference relationships
  REFERENCES = "references",
  REFERENCED_BY = "referenced_by",
  
  // Semantic relationships
  DEFINES = "defines",
  DEFINED_BY = "defined_by",
  EXEMPLIFIES = "exemplifies",
  EXEMPLIFIED_BY = "exemplified_by",
  CONTRADICTS = "contradicts", // Bidirectional by nature
  RELATES_TO = "relates_to",   // Bidirectional by nature
  
  // Temporal relationships
  PRECEDES = "precedes",
  FOLLOWS = "follows",
  
  // Causal relationships
  CAUSES = "causes",
  CAUSED_BY = "caused_by",
  
  // Implementation relationships
  IMPLEMENTS = "implements",
  IMPLEMENTED_BY = "implemented_by",
  
  // Synthesis relationships
  SYNTHESIZES = "synthesizes",
  SYNTHESIZED_BY = "synthesized_by",
  
  // Refinement relationships
  REFINES = "refines",
  REFINED_BY = "refined_by"
}
```

### Enhanced Edge Structure
```typescript
interface Edge {
  source: string;
  target: string;
  
  // Standardized relationship type
  relationshipType: RelationshipType;
  
  // Optional field for custom/domain-specific relationships
  customType?: string;
  
  // Multi-dimensional strength metrics
  strength: {
    semantic: number;    // Semantic relevance (0-1)
    structural: number;  // Position in hierarchy (0-1)
    temporal: number;    // Recency factor (0-1)
    confidence: number;  // System confidence in relationship (0-1)
  };
  
  // Formal relationship properties
  properties: {
    bidirectional: boolean;
    transitive: boolean;
    inverse?: RelationshipType; // Automatically managed inverse
  };
  
  // Metadata
  created: string;
  updated: string;
  creationMethod: "manual" | "automatic" | "inferred";
  createdBy?: string;
}
```

### Bidirectional Relationship Management
```typescript
function createBidirectionalRelationship(
  sourceId: string, 
  targetId: string, 
  relationshipType: RelationshipType,
  strength: number
): [Edge, Edge] {
  // Get inverse relationship type
  const inverseType = getInverseRelationshipType(relationshipType);
  
  // Create primary edge
  const primaryEdge: Edge = {
    source: sourceId,
    target: targetId,
    relationshipType: relationshipType,
    strength: {
      semantic: strength,
      structural: strength,
      temporal: 1.0,
      confidence: 0.9
    },
    properties: {
      bidirectional: true,
      transitive: isTransitiveRelationship(relationshipType),
      inverse: inverseType
    },
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    creationMethod: "manual"
  };
  
  // Create inverse edge automatically
  const inverseEdge: Edge = {
    source: targetId,
    target: sourceId,
    relationshipType: inverseType,
    // Similar properties but marked as automatic
    creationMethod: "automatic"
  };
  
  // Store both edges
  storeEdge(primaryEdge);
  storeEdge(inverseEdge);
  
  return [primaryEdge, inverseEdge];
}
```

## 2. Enhanced Search Functionality

### Search Options Interface
```typescript
interface SearchOptions {
  query: string;
  maxResults: number;
  
  // Search strategy
  searchMode: "lexical" | "semantic" | "hybrid";
  
  // Weighting configurations
  weightings: {
    titleWeight: number;
    contentWeight: number;
    tagWeight: number;
    edgeWeight: number;
  };
  
  // Filtering options
  filters: {
    createdAfter?: Date;
    createdBefore?: Date;
    tags?: string[];
    minEdgeCount?: number;
    nodeTypes?: string[];
    pathPrefix?: string;
  };
  
  // Graph traversal during search
  traversalDepth?: number;  
  
  // Result explanation
  includeRelevanceScores: boolean;
  includeRelevanceExplanation: boolean;
}
```

### Enhanced Search Implementation
```typescript
function enhancedSearch(options: SearchOptions): SearchResult[] {
  // Parse and optimize the search query
  const optimizedQuery = optimizeQuery(options.query);
  
  // Execute search based on search mode
  let results: any[] = [];
  
  if (options.searchMode === "lexical" || options.searchMode === "hybrid") {
    const lexicalResults = performLexicalSearch(optimizedQuery, options);
    results = results.concat(lexicalResults);
  }
  
  if (options.searchMode === "semantic" || options.searchMode === "hybrid") {
    const semanticResults = performSemanticSearch(optimizedQuery, options);
    results = results.concat(semanticResults);
  }
  
  // Apply filters
  results = applySearchFilters(results, options.filters);
  
  // Expand with traversal if requested
  if (options.traversalDepth && options.traversalDepth > 0) {
    results = expandResultsWithTraversal(results, options.traversalDepth);
  }
  
  // Score and rank results
  results = scoreAndRankResults(results, options.weightings);
  
  // Add detailed scoring information if requested
  if (options.includeRelevanceScores) {
    results = addScoringDetails(results);
  }
  
  if (options.includeRelevanceExplanation) {
    results = addRelevanceExplanations(results, optimizedQuery);
  }
  
  // Limit to requested number of results
  return results.slice(0, options.maxResults);
}
```

## 3. Improved Traversal Algorithms

### Traversal Options Interface
```typescript
interface TraversalOptions {
  // Support multiple starting points
  startNodeIds: string[];
  
  // Traversal algorithm selection
  traversalStrategy: "breadth_first" | "depth_first" | "weighted" | "bidirectional";
  
  // Traversal limits
  maxDepth: number;
  maxNodes?: number;
  
  // Custom filtering functions
  edgeFilter?: (edge: Edge) => boolean;
  nodeFilter?: (node: Node) => boolean;
  
  // Custom edge weighting function
  weightFunction?: (edge: Edge, currentPath: Edge[]) => number;
  
  // Node expansion strategy
  expansionMode: "all_edges" | "strongest_edges" | "diverse_edge_types";
  
  // Content return options
  returnMode: "full_content" | "summarized" | "adaptive";
  
  // Duplicate handling
  deduplicationStrategy: "none" | "content_hash" | "semantic_similarity";
  
  // Include graph metrics
  includeMetrics: boolean;
}
```

### Weighted Traversal Implementation
```typescript
function weightedTraversal(
  startNodeIds: string[], 
  options: TraversalOptions, 
  visited: Set<string>, 
  result: TraversalResult
) {
  // Priority queue for weighted traversal
  const priorityQueue = new PriorityQueue<{nodeId: string, priority: number, path: Edge[]}>(
    (a, b) => b.priority - a.priority
  );
  
  // Initialize with start nodes
  for (const nodeId of startNodeIds) {
    priorityQueue.enqueue({nodeId, priority: 1.0, path: []});
  }
  
  // Traverse while respecting node and depth limits
  while (!priorityQueue.isEmpty() && result.nodes.length < (options.maxNodes || Infinity)) {
    const {nodeId, path} = priorityQueue.dequeue();
    
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    
    // Get the node and add to result
    const node = getNodeWithCache(nodeId);
    result.nodes.push(node);
    
    // Add the path edges to result
    for (const edge of path) {
      if (!result.edges.some(e => e.source === edge.source && e.target === edge.target)) {
        result.edges.push(edge);
      }
    }
    
    // Stop expanding if we've reached max depth
    if (path.length >= options.maxDepth) continue;
    
    // Get outgoing edges
    const outgoingEdges = getEdgesByNode(nodeId).filter(edge => 
      edge.source === nodeId && // Only outgoing
      (!options.edgeFilter || options.edgeFilter(edge))
    );
    
    // Apply expansion mode
    let edgesToFollow = outgoingEdges;
    
    if (options.expansionMode === "strongest_edges") {
      // Only follow edges with highest strength
      edgesToFollow = getStrongestEdges(outgoingEdges);
    } else if (options.expansionMode === "diverse_edge_types") {
      // Follow a diverse set of edge types
      edgesToFollow = getDiverseEdgeTypes(outgoingEdges);
    }
    
    // Enqueue target nodes with priorities
    for (const edge of edgesToFollow) {
      if (!visited.has(edge.target)) {
        const newPath = [...path, edge];
        const priority = options.weightFunction ? 
          options.weightFunction(edge, path) : 
          calculateDefaultEdgePriority(edge);
        
        priorityQueue.enqueue({
          nodeId: edge.target,
          priority,
          path: newPath
        });
      }
    }
  }
}
```

## 4. Cross-Domain Linking

### Domain Pointer Options
```typescript
interface DomainPointerOptions {
  sourceDomain: string;
  sourceNodeId: string;
  targetDomain: string;
  targetNodeId?: string;  // Optional - will find best entry point if not specified
  linkType: "reference" | "extension" | "version" | "alternative";
  strength: number;
  description?: string;
  bidirectional: boolean;
  metadata?: Record<string, any>;
}
```

### Cross-Domain Link Creation
```typescript
async function createCrossDomainLink(options: DomainPointerOptions): Promise<{
  sourceRef: DomainRef;
  targetRef?: DomainRef;
  success: boolean;
}> {
  // Validate domains exist
  if (!domainExists(options.sourceDomain) || !domainExists(options.targetDomain)) {
    return { success: false };
  }
  
  // Find target node if not specified
  const targetNodeId = options.targetNodeId || 
    await findBestEntryPoint(options.targetDomain, options.sourceNodeId);
  
  if (!targetNodeId) {
    return { success: false };
  }
  
  // Create source-to-target reference
  const sourceRef: DomainRef = {
    domain: options.targetDomain,
    nodeId: targetNodeId,
    linkType: options.linkType,
    description: options.description,
    strength: options.strength,
    bidirectional: options.bidirectional,
    metadata: options.metadata,
    created: new Date().toISOString()
  };
  
  // Add to source node
  await addDomainRefToNode(options.sourceDomain, options.sourceNodeId, sourceRef);
  
  // Create bidirectional reference if requested
  let targetRef: DomainRef | undefined;
  if (options.bidirectional) {
    targetRef = {
      domain: options.sourceDomain,
      nodeId: options.sourceNodeId,
      linkType: getInverseLinkType(options.linkType),
      description: options.description 
        ? `Bidirectional link from: ${options.description}` 
        : undefined,
      strength: options.strength,
      bidirectional: true,
      metadata: options.metadata,
      created: new Date().toISOString()
    };
    
    // Add to target node
    await addDomainRefToNode(options.targetDomain, targetNodeId, targetRef);
  }
  
  return { sourceRef, targetRef, success: true };
}
```

## 5. Protection Attributes

### Domain Protection
```typescript
interface EnhancedDomain extends Domain {
  // Protection settings
  protection: {
    isReadOnly: boolean;
    lastModifiedBy?: string;
    lastModifiedAt?: string;
    protectionReason?: string;
    canBeUnprotectedBy?: string[]; // User IDs who can unprotect
    expiresAt?: string; // Optional expiration of protection
  };
}
```

### Node Protection
```typescript
interface ProtectedNode extends Node {
  protection?: {
    isReadOnly: boolean;
    lockedBy: string;
    lockedAt: string;
    reason?: string;
    expiresAt?: string;
  };
}
```

### Protection Middleware
```typescript
function protectionMiddleware(operation: string, target: any): boolean {
  // Check if operation is on a domain
  if (target.type === 'domain') {
    // Allow read operations regardless of protection
    if (operation === 'read') return true;
    
    // Check domain protection for write operations
    const domain = target.domain;
    if (domain.protection?.isReadOnly && !canModifyProtection(domain)) {
      throw new Error(`Domain ${domain.id} is read-only and cannot be modified`);
    }
  }
  
  // Check if operation is on a node
  if (target.type === 'node') {
    // Allow read operations regardless of protection
    if (operation === 'read') return true;
    
    // Check node protection
    const node = target.node;
    if (node.protection?.isReadOnly && !canUnprotectNode(node)) {
      throw new Error(`Memory ${node.id} is read-only and cannot be modified`);
    }
    
    // Also check domain protection
    const domain = getDomainSync(getCurrentDomain());
    if (domain.protection?.isReadOnly && !canModifyProtection(domain)) {
      throw new Error(`Cannot modify memory in read-only domain ${getCurrentDomain()}`);
    }
  }
  
  // Operation is allowed
  return true;
}
```

## 6. Common Database Schema

```typescript
const MEMORY_GRAPH_SCHEMA = {
  version: '1.0.0',
  
  // Domain table schema
  domains: {
    tableName: 'DOMAINS',
    columns: {
      id: { type: 'VARCHAR(36)', primaryKey: true },
      name: { type: 'VARCHAR(255)', notNull: true },
      description: { type: 'TEXT' },
      created: { type: 'VARCHAR(30)', notNull: true },
      lastAccess: { type: 'VARCHAR(30)', notNull: true },
      parentDomain: { type: 'VARCHAR(36)', foreignKey: 'DOMAINS.id' },
      metadata: { type: 'TEXT' }, // JSON serialized metadata
      isProtected: { type: 'BOOLEAN', default: false }
    },
    indices: [
      { name: 'idx_domains_parent', columns: ['parentDomain'] },
      { name: 'idx_domains_name', columns: ['name'] }
    ]
  },
  
  // Memory nodes table schema
  nodes: {
    tableName: 'MEMORY_NODES',
    columns: {
      id: { type: 'VARCHAR(36)', primaryKey: true },
      domain: { type: 'VARCHAR(36)', notNull: true, foreignKey: 'DOMAINS.id' },
      content: { type: 'TEXT', notNull: true },
      timestamp: { type: 'VARCHAR(30)', notNull: true },
      path: { type: 'VARCHAR(255)', default: '/' },
      content_summary: { type: 'TEXT' },
      summary_timestamp: { type: 'VARCHAR(30)' },
      title: { type: 'VARCHAR(255)' },
      namespace: { type: 'VARCHAR(255)', default: 'default' },
      version: { type: 'INTEGER', default: 1 },
      metadata: { type: 'TEXT' }, // JSON serialized metadata
      contentType: { type: 'VARCHAR(50)', default: 'text' },
      embedding: { type: 'TEXT' }, // JSON serialized vector embedding
      isProtected: { type: 'BOOLEAN', default: false }
    },
    indices: [
      { name: 'idx_nodes_domain', columns: ['domain'] },
      { name: 'idx_nodes_path', columns: ['path'] },
      { name: 'idx_nodes_timestamp', columns: ['timestamp'] },
      { name: 'idx_nodes_namespace', columns: ['namespace'] }
    ],
    fullTextIndices: [
      { name: 'fts_nodes_content', columns: ['content', 'content_summary', 'title'] }
    ]
  },
  
  // Additional tables omitted for brevity but available in the full schema
}
```

## 7. Tool Prompting Improvements

### Enhanced Tool Description
```typescript
const REFACTORED_MEMORY_TOOLS = {
  traverse_memories: {
    name: 'traverse_memories',
    description: `Explore connected memories by following relationships from a starting point.
    
WHEN TO USE:
- To explore a topic's connections and context
- When you want to understand how memories relate to each other
- For discovering relevant information through associations
- As an alternative to search when you know a good starting point
    
ADVANTAGES:
- Discovers information through relationships rather than keywords
- Provides context around memories
- Can cross domain boundaries if configured
- Good for exploring related concepts
    
USAGE TIPS:
- Start with a recent or central memory on your topic
- Set appropriate depth (1-3) to control result size
- Use relationship filters when focusing on specific connection types`,
    // Schema definition omitted for brevity
  },
  
  // Other tools omitted for brevity
}
```

## 8. Performance Optimizations

### LRU Cache Implementation
```typescript
class LRUCache<K, V> {
  private capacity: number;
  private ttl: number;
  private cache = new Map<K, { value: V, timestamp: number }>();
  
  constructor(options: { max: number, ttl: number, updateAgeOnGet: boolean }) {
    this.capacity = options.max;
    this.ttl = options.ttl;
  }
  
  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;
    
    // Check if the item has expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }
    
    // Update timestamp on access
    item.timestamp = Date.now();
    
    return item.value;
  }
  
  set(key: K, value: V): void {
    // Evict oldest item if at capacity
    if (this.cache.size >= this.capacity) {
      const oldestKey = this.findOldestKey();
      if (oldestKey) this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, { value, timestamp: Date.now() });
  }
  
  has(key: K): boolean {
    return this.cache.has(key);
  }
  
  private findOldestKey(): K | undefined {
    // Implementation details omitted for brevity
  }
}
```

### Batch Operations
```typescript
interface BatchOperation {
  operations: Array<{
    type: "create" | "update" | "delete";
    nodeId?: string;
    nodeData?: Partial<Node>;
    edges?: Edge[];
  }>;
  options: {
    atomic: boolean;
    validateBeforeCommit: boolean;
    rollbackOnError: boolean;
  };
}

async function executeBatch(batch: BatchOperation): Promise<BatchResult> {
  // Implementation details omitted for brevity
}
```