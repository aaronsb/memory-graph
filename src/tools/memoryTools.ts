import {
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { MemoryGraph } from '../graph/MemoryGraph.js';
import { StoreMemoryInput, RecallMemoriesInput, ForgetMemoryInput, EditMemoryInput } from '../types/graph.js';
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
          description: 'The memory content',
        },
        path: {
          type: 'string',
          description: 'Optional organization path',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional categorization tags',
        },
        relationships: {
          type: 'object',
          description: 'Optional connections to other memories',
          additionalProperties: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                targetId: {
                  type: 'string',
                  description: 'ID of the target memory',
                },
                strength: {
                  type: 'number',
                  description: 'Relationship strength (0-1)',
                  minimum: 0,
                  maximum: 1,
                },
              },
              required: ['targetId', 'strength'],
            },
          },
        },
      },
      required: ['content'],
    },
  },

  recall_memories: {
    name: 'recall_memories' as ToolName,
    description: 'Recall memories using various strategies including content search',
    inputSchema: {
      type: 'object',
      properties: {
        maxNodes: {
          type: 'number',
          description: 'Maximum number of memories to return',
          minimum: 1,
        },
        strategy: {
          type: 'string',
          description: 'How to traverse and select memories',
          enum: ['recent', 'related', 'path', 'tag', 'content'],
        },
        startNodeId: {
          type: 'string',
          description: 'Optional starting memory ID (required for "related" strategy)',
        },
        path: {
          type: 'string',
          description: 'Filter by path (required for "path" strategy)',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by tags (required for "tag" strategy)',
        },
        relationshipTypes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional filter by relationship types',
        },
        minStrength: {
          type: 'number',
          description: 'Minimum relationship strength (0-1)',
          minimum: 0,
          maximum: 1,
        },
        before: {
          type: 'string',
          description: 'Optional timestamp upper bound',
        },
        after: {
          type: 'string',
          description: 'Optional timestamp lower bound',
        },
        search: {
          type: 'object',
          description: 'Content search options',
          properties: {
            keywords: {
              type: 'array',
              items: { type: 'string' },
              description: 'Keywords to search for in memory content',
            },
            fuzzyMatch: {
              type: 'boolean',
              description: 'Enable fuzzy matching for keywords',
            },
            regex: {
              type: 'string',
              description: 'Regular expression pattern for content matching',
            },
            caseSensitive: {
              type: 'boolean',
              description: 'Whether to perform case-sensitive matching',
            },
          },
        },
        combinedStrategy: {
          type: 'boolean',
          description: 'Whether to combine results from multiple search criteria',
        },
        sortBy: {
          type: 'string',
          enum: ['relevance', 'date', 'strength'],
          description: 'How to sort the results',
        },
      },
      required: ['maxNodes', 'strategy'],
    },
  },

  edit_memory: {
    name: 'edit_memory' as ToolName,
    description: 'Edit an existing memory in the knowledge graph',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'ID of the memory to edit',
        },
        content: {
          type: 'string',
          description: 'New content for the memory',
        },
        relationships: {
          type: 'object',
          description: 'New relationships to replace existing ones',
          additionalProperties: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                targetId: {
                  type: 'string',
                  description: 'ID of the target memory',
                },
                strength: {
                  type: 'number',
                  description: 'Relationship strength (0-1)',
                  minimum: 0,
                  maximum: 1,
                },
              },
              required: ['targetId', 'strength'],
            },
          },
        },
      },
      required: ['id'],
    },
  },

  forget_memory: {
    name: 'forget_memory' as ToolName,
    description: 'Remove a memory from the knowledge graph',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'ID of the memory to forget',
        },
        cascade: {
          type: 'boolean',
          description: 'Whether to also remove directly connected memories',
          default: false,
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
      case 'recall_memories':
        return this.handleRecallMemories(args as RecallMemoriesInput);
      case 'forget_memory':
        return this.handleForgetMemory(args as ForgetMemoryInput);
      case 'edit_memory':
        return this.handleEditMemory(args as EditMemoryInput);
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

  private async handleRecallMemories(args: RecallMemoriesInput): Promise<ToolResponse> {
    try {
      const results = await this.graph.recallMemories(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to recall memories: ${error}`);
    }
  }

  private async handleForgetMemory(args: ForgetMemoryInput): Promise<ToolResponse> {
    try {
      const success = await this.graph.forgetMemory(args);
      if (!success) {
        throw new McpError(ErrorCode.InvalidParams, `Memory not found: ${args.id}`);
      }
      return {
        content: [{ type: 'text', text: 'Memory forgotten successfully' }],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to forget memory: ${error}`);
    }
  }

  private async handleEditMemory(args: EditMemoryInput): Promise<ToolResponse> {
    try {
      const node = await this.graph.editMemory(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(node, null, 2) }],
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Memory not found')) {
        return {
          content: [{ type: 'text', text: error.message }],
          isError: true
        };
      }
      throw new McpError(ErrorCode.InternalError, `Failed to edit memory: ${error}`);
    }
  }
}
