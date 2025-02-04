import { z } from 'zod';
import { StoreMemoryInput, UpdateMemoryInput, MemoryQueryOptions } from './graph.js';

export type ToolName = 
  | 'store_memory'
  | 'retrieve_memory'
  | 'query_memories'
  | 'search_memories'
  | 'update_memory'
  | 'delete_memory';

export type ToolArgumentType = {
  'store_memory': StoreMemoryInput;
  'retrieve_memory': { id: string };
  'query_memories': MemoryQueryOptions;
  'search_memories': { query: string; limit?: number };
  'update_memory': UpdateMemoryInput;
  'delete_memory': { id: string };
};

export interface ToolRequest {
  name: ToolName;
  arguments: ToolArgumentType[ToolName];
}

export interface ToolResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
}

export interface Tool {
  name: ToolName;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}
