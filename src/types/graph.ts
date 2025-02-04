export interface MemoryNode {
  id: string;
  content: string;
  timestamp: string;
  path?: string;
  tags?: string[];
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

export interface GenerateMermaidGraphInput {
  startNodeId: string;
  maxDepth?: number;
  direction?: 'TB' | 'BT' | 'LR' | 'RL';
  relationshipTypes?: string[];
  minStrength?: number;
}

export interface RecallResult {
  node: MemoryNode;
  edges: GraphEdge[];
  score: number;
  matchDetails?: MatchDetails;
}
