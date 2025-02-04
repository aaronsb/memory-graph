export interface MemoryNode {
  id: string;
  content: string;
  metadata: {
    timestamp: string;
    path: string;
    tags?: string[];
    relationships?: {
      [key: string]: string[]; // relationshipType -> array of node IDs
    };
  };
}

export interface GraphEdge {
  source: string;  // source node ID
  target: string;  // target node ID
  type: string;    // relationship type
  metadata?: {
    weight?: number;
    timestamp?: string;
    [key: string]: any;
  };
}

export interface MemoryGraphConfig {
  storagePath: string;
  defaultPath?: string;
}

export interface MemoryQueryOptions {
  path?: string;
  tags?: string[];
  relationshipType?: string;
  relatedTo?: string;
  limit?: number;
  before?: string;
  after?: string;
}

export interface StoreMemoryInput {
  content: string;
  path?: string;
  tags?: string[];
  relationships?: {
    [key: string]: string[];
  };
}

export interface UpdateMemoryInput {
  id: string;
  content?: string;
  path?: string;
  tags?: string[];
  relationships?: {
    [key: string]: string[];
  };
}

export type MemorySearchResult = {
  node: MemoryNode;
  score: number;
};
