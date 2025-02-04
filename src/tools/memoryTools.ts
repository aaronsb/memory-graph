import {
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { MemoryGraph } from '../graph/MemoryGraph.js';
import { StoreMemoryInput, UpdateMemoryInput, MemoryQueryOptions } from '../types/graph.js';
import { ToolRequest, ToolResponse, ToolName } from '../types/mcp.js';

export const MEMORY_TOOLS = {
  store_memory: {
    name: 'store_memory' as ToolName,
    description: 'Store a new memory in the knowledge graph',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The content to store as a memory',
        },
        path: {
          type: 'string',
          description: 'Optional path to organize the memory',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional tags to categorize the memory',
        },
        relationships: {
          type: 'object',
          description: 'Optional relationships to other memories',
          additionalProperties: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
      required: ['content'],
    },
  },

  retrieve_memory: {
    name: 'retrieve_memory' as ToolName,
    description: 'Retrieve a specific memory by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The ID of the memory to retrieve',
        },
      },
      required: ['id'],
    },
  },

  query_memories: {
    name: 'query_memories' as ToolName,
    description: 'Query memories using various filters',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Filter by memory path',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by tags (all tags must match)',
        },
        relationshipType: {
          type: 'string',
          description: 'Filter by relationship type',
        },
        relatedTo: {
          type: 'string',
          description: 'Filter by related memory ID',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return',
        },
        before: {
          type: 'string',
          description: 'Filter memories before this timestamp',
        },
        after: {
          type: 'string',
          description: 'Filter memories after this timestamp',
        },
      },
    },
  },

  search_memories: {
    name: 'search_memories' as ToolName,
    description: 'Search memories by content',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query string',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return',
        },
      },
      required: ['query'],
    },
  },

  update_memory: {
    name: 'update_memory' as ToolName,
    description: 'Update an existing memory',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'ID of the memory to update',
        },
        content: {
          type: 'string',
          description: 'New content for the memory',
        },
        path: {
          type: 'string',
          description: 'New path for the memory',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'New tags for the memory',
        },
        relationships: {
          type: 'object',
          description: 'New relationships for the memory',
          additionalProperties: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
      required: ['id'],
    },
  },

  delete_memory: {
    name: 'delete_memory' as ToolName,
    description: 'Delete a memory by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'ID of the memory to delete',
        },
      },
      required: ['id'],
    },
  },
};

export class MemoryTools {
  private graph: MemoryGraph;

  constructor(graph: MemoryGraph) {
    this.graph = graph;
  }

  async handleToolCall(request: ToolRequest): Promise<ToolResponse> {
    const { name, arguments: args } = request;

    switch (name) {
      case 'store_memory':
        return this.handleStoreMemory(args as StoreMemoryInput);
      case 'retrieve_memory':
        return this.handleRetrieveMemory(args as { id: string });
      case 'query_memories':
        return this.handleQueryMemories(args as MemoryQueryOptions);
      case 'search_memories':
        return this.handleSearchMemories(args as { query: string; limit?: number });
      case 'update_memory':
        return this.handleUpdateMemory(args as UpdateMemoryInput);
      case 'delete_memory':
        return this.handleDeleteMemory(args as { id: string });
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  }

  private async handleStoreMemory(args: StoreMemoryInput): Promise<ToolResponse> {
    try {
      const node = await this.graph.storeMemory(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(node, null, 2) }],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to store memory: ${error}`);
    }
  }

  private async handleRetrieveMemory(args: { id: string }): Promise<ToolResponse> {
    try {
      const results = await this.graph.queryMemories({ relatedTo: args.id });
      const node = results.find(n => n.id === args.id);
      if (!node) {
        throw new McpError(ErrorCode.InvalidParams, `Memory not found: ${args.id}`);
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(node, null, 2) }],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to retrieve memory: ${error}`);
    }
  }

  private async handleQueryMemories(args: MemoryQueryOptions): Promise<ToolResponse> {
    try {
      const results = await this.graph.queryMemories(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to query memories: ${error}`);
    }
  }

  private async handleSearchMemories(args: { query: string; limit?: number }): Promise<ToolResponse> {
    try {
      const results = await this.graph.searchMemories(args.query, args.limit);
      return {
        content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to search memories: ${error}`);
    }
  }

  private async handleUpdateMemory(args: UpdateMemoryInput): Promise<ToolResponse> {
    try {
      const node = await this.graph.updateMemory(args);
      if (!node) {
        throw new McpError(ErrorCode.InvalidParams, `Memory not found: ${args.id}`);
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(node, null, 2) }],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to update memory: ${error}`);
    }
  }

  private async handleDeleteMemory(args: { id: string }): Promise<ToolResponse> {
    try {
      const success = await this.graph.deleteMemory(args.id);
      if (!success) {
        throw new McpError(ErrorCode.InvalidParams, `Memory not found: ${args.id}`);
      }
      return {
        content: [{ type: 'text', text: 'Memory deleted successfully' }],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to delete memory: ${error}`);
    }
  }
}
