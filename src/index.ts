#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  ServerResult,
} from '@modelcontextprotocol/sdk/types.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { MemoryGraph } from './graph/MemoryGraph.js';
import { MEMORY_TOOLS, MemoryTools } from './tools/memoryTools.js';
import { StoreMemoryInput, RecallMemoriesInput, ForgetMemoryInput } from './types/graph.js';
import { ToolName, ToolRequest, ToolResponse } from './types/mcp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class MemoryGraphServer {
  private server: Server;
  private memoryGraph: MemoryGraph;
  private memoryTools: MemoryTools;

  constructor() {
    // Initialize memory graph
    const storageDir = process.env.MEMORY_DIR || path.join(__dirname, '../data');
    const storageType = process.env.STORAGE_TYPE || 'json';
    console.log(`STORAGE_TYPE: ${storageType}`);

    this.memoryGraph = new MemoryGraph({
      storageDir,
      defaultPath: process.env.DEFAULT_PATH || '/',
      storageType: storageType,
    });
    this.memoryTools = new MemoryTools(this.memoryGraph);

    // Initialize MCP server
    this.server = new Server(
      {
        name: 'memory-graph',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: Object.values(MEMORY_TOOLS),
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const toolRequest: ToolRequest = {
          name: request.params.name as ToolName,
          arguments: (request.params.arguments || {}) as unknown as StoreMemoryInput | RecallMemoriesInput | ForgetMemoryInput,
        };

        const response = await this.memoryTools.handleToolCall(toolRequest);
        return response as unknown as ServerResult;
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to handle tool call: ${error}`
        );
      }
    });

    // Error handling
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    // Cleanup on exit
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async start() {
    try {
      // Initialize memory graph
      await this.memoryGraph.initialize();

      // Connect to transport
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      console.error('Memory Graph MCP server running on stdio');
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Start server
const server = new MemoryGraphServer();
server.start().catch(console.error);
