import { z } from 'zod';
import { StoreMemoryInput, RecallMemoriesInput, ForgetMemoryInput, EditMemoryInput } from './graph.js';

export type ToolName = 
  | 'store_memory'
  | 'recall_memories'
  | 'forget_memory'
  | 'edit_memory';

export type ToolArgumentType = {
  'store_memory': StoreMemoryInput;
  'recall_memories': RecallMemoriesInput;
  'forget_memory': ForgetMemoryInput;
  'edit_memory': EditMemoryInput;
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
