export interface DomainInfo {
  id: string;          // Unique domain identifier
  name: string;        // Human-readable name
  description: string; // Purpose/scope of the domain
  created: string;     // ISO timestamp
  lastAccess: string;  // ISO timestamp
}

export interface PersistenceState {
  currentDomain: string;
  lastAccess: string;
  lastMemoryId?: string;
}

export interface DomainRef {
  domain: string;
  nodeId: string;
  description?: string;
  bidirectional?: boolean;
}

export interface DomainPointer {
  domain: string;
  entryPointId?: string;  // Optional - system finds best entry point if not specified
  bidirectional: boolean; // Default to true
  description?: string;
}

export interface MemoryNode {
  id: string;
  content: string;
  timestamp: string;
  path?: string;
  tags?: string[];
  domainRefs?: DomainRef[];
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  strength: number; // 0-1 relationship strength
  timestamp: string;
}

export interface MemoryGraphConfig {
  storageDir: string;
  defaultPath?: string;
  defaultDomain?: string;
}

export interface Relationship {
  targetId: string;
  strength: number;
}

export interface StoreMemoryInput {
  content: string;
  path?: string;
  tags?: string[];
  relationships?: {
    [type: string]: Relationship[];
  };
  domainRefs?: DomainRef[];
  domainPointer?: DomainPointer;
}

export type RecallStrategy = 'recent' | 'related' | 'path' | 'tag' | 'content';

export interface SearchOptions {
  keywords?: string[];
  fuzzyMatch?: boolean;
  regex?: string;
  caseSensitive?: boolean;
}

export interface MatchDetails {
  matches: string[];
  positions: number[];
  relevance: number;
}

export interface RecallMemoriesInput {
  maxNodes: number;
  strategy: RecallStrategy;
  startNodeId?: string;
  path?: string;
  tags?: string[];
  relationshipTypes?: string[];
  minStrength?: number;
  before?: string;
  after?: string;
  search?: SearchOptions;
  combinedStrategy?: boolean;
  sortBy?: 'relevance' | 'date' | 'strength';
}

export interface EditMemoryInput {
  id: string;
  content?: string;
  relationships?: {
    [type: string]: Relationship[];
  };
}

export interface ForgetMemoryInput {
  id: string;
  cascade?: boolean;
}

export interface MermaidContentFormat {
  maxLength?: number;  // Override default 50 char limit
  truncationSuffix?: string; // Override default "..."
  includeTimestamp?: boolean; // Option to show node timestamps
  includeId?: boolean; // Option to show node IDs
}

export interface GenerateMermaidGraphInput {
  startNodeId: string;
  maxDepth?: number;
  direction?: 'TB' | 'BT' | 'LR' | 'RL';
  relationshipTypes?: string[];
  minStrength?: number;
  contentFormat?: MermaidContentFormat;
  followDomainPointers?: boolean; // New option to follow domain references
}

export interface TraverseMemoriesInput {
  startNodeId?: string;
  maxDepth?: number;
  followDomainPointers?: boolean;
  targetDomain?: string;
  maxNodesPerDomain?: number;
}

export interface RecallResult {
  node: MemoryNode;
  edges: GraphEdge[];
  score: number;
  matchDetails?: MatchDetails;
}
