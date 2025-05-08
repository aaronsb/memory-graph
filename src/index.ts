#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from './transport/StreamableHTTPServerTransport.js';
import express from 'express';
import { randomUUID } from 'crypto';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
  ServerResult,
} from '@modelcontextprotocol/sdk/types.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { MemoryGraph } from './graph/MemoryGraph.js';
import { MEMORY_TOOLS, MemoryTools } from './tools/memoryTools.js';
import { MemoryResources } from './resources/memoryResources.js';
import { StoreMemoryInput, RecallMemoriesInput, ForgetMemoryInput } from './types/graph.js';
import { ToolName, ToolRequest, ToolResponse } from './types/mcp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface MemoryGraphServerConfig {
  strictMode?: boolean;
  transportType?: 'STDIO' | 'HTTP';
  port?: number;
  host?: string;
}

class MemoryGraphServer {
  private server: Server;
  private memoryGraph: MemoryGraph;
  private memoryTools: MemoryTools;
  private memoryResources: MemoryResources;
  private config: MemoryGraphServerConfig;

  constructor(config: MemoryGraphServerConfig = {}) {
    this.config = config;
    
    // Initialize memory graph
    const storageDir = process.env.MEMORY_DIR || path.join(__dirname, '../data');
    const storageType = process.env.STORAGE_TYPE || 'json';
    
    // In strict mode, all informational logging goes to stderr
    if (this.config.strictMode) {
      console.error(`STORAGE_TYPE: ${storageType}`);
    } else {
      console.log(`STORAGE_TYPE: ${storageType}`);
    }

    // Configure MariaDB options if needed
    const dbConfig = storageType.toLowerCase() === 'mariadb' ? {
      host: process.env.MARIADB_HOST || 'localhost',
      user: process.env.MARIADB_USER || 'root',
      password: process.env.MARIADB_PASSWORD || '',
      database: process.env.MARIADB_DATABASE || 'memory_graph',
      port: process.env.MARIADB_PORT ? parseInt(process.env.MARIADB_PORT, 10) : 3306,
      waitForConnections: true,
      connectionLimit: process.env.MARIADB_CONNECTION_LIMIT ? 
        parseInt(process.env.MARIADB_CONNECTION_LIMIT, 10) : 10,
      queueLimit: 0
    } : undefined;

    this.memoryGraph = new MemoryGraph({
      storageDir,
      defaultPath: process.env.DEFAULT_PATH || '/',
      storageType: storageType,
      dbConfig
    });
    this.memoryTools = new MemoryTools(this.memoryGraph);
    this.memoryResources = new MemoryResources(this.memoryGraph);

    // Initialize MCP server
    this.server = new Server(
      {
        name: 'memory-graph',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {}, // Add resources capability
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

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'memory://domains/statistics',
          name: 'Domain Statistics',
          description: 'Statistics about memory domains',
          mimeType: 'application/json',
        },
        {
          uri: 'memory://edges/filter-terms',
          name: 'Memory Edge Filter Terms',
          description: 'Available relationship types for filtering memory edges',
          mimeType: 'application/json',
        },
        {
          uri: 'memory://tags/popular',
          name: 'Popular Memory Tags',
          description: 'Most frequently used memory tags (top 10%)',
          mimeType: 'application/json',
        },
        {
          uri: 'essential_priority://domains',
          name: 'Essential Domain Memories',
          description: 'Top-level memories that provide essential context for each domain',
          mimeType: 'application/json',
        },
      ],
    }));

    // List resource templates
    this.server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
      resourceTemplates: [],
    }));

    // Read resource contents
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      try {
        const uri = request.params.uri;
        let content: string;

        if (uri === 'memory://domains/statistics') {
          const data = await this.memoryResources.getDomainStatistics();
          content = JSON.stringify(data, null, 2);
        } else if (uri === 'memory://edges/filter-terms') {
          const data = await this.memoryResources.getEdgeFilterTerms();
          content = JSON.stringify(data, null, 2);
        } else if (uri === 'memory://tags/popular') {
          const data = await this.memoryResources.getPopularTags();
          content = JSON.stringify(data, null, 2);
        } else if (uri === 'essential_priority://domains') {
          const data = await this.memoryResources.getEssentialPriorityMemories();
          content = JSON.stringify(data, null, 2);
        } else {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Unknown resource URI: ${uri}`
          );
        }

        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: content,
            },
          ],
        };
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to read resource: ${error}`
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

  private async startHttpTransport() {
    if (!this.config.port) {
      throw new Error('PORT environment variable is required for HTTP transport');
    }

    const port = this.config.port;
    const host = this.config.host || '127.0.0.1';
    const app = express();
    app.use(express.json());

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      eventStore: new Map(),
    });

    app.all('/mcp', async (req, res) => {
      try {
        await transport.handleRequest(req, res, req.body);
      } catch (error) {
        console.error('Error handling MCP request:', error);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Internal server error' },
            id: null,
          });
        }
      }
    });

    await this.server.connect(transport);

    const server = app.listen(port, host, () => {
      console.error(`Memory Graph MCP server running on http://${host}:${port}/mcp`);
    });

    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use`);
      } else {
        console.error('HTTP server error:', error);
      }
      process.exit(1);
    });
  }

  private async startStdioTransport() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Memory Graph MCP server running on stdio');
  }

  async start() {
    try {
      // Initialize memory graph
      await this.memoryGraph.initialize();

      // Initialize transport based on configuration
      const transportType = this.config.transportType || 'STDIO';
      
      // Explicitly separate transport initialization
      if (transportType === 'HTTP') {
        await this.startHttpTransport();
      } else if (transportType === 'STDIO') {
        await this.startStdioTransport();
      } else {
        throw new Error(`Invalid transport type: ${transportType}`);
      }
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Start server
const strictMode = process.env.STRICT_MODE === 'true';
const transportType = (process.env.TRANSPORT_TYPE || 'STDIO').toUpperCase();
const port = process.env.PORT ? parseInt(process.env.PORT) : undefined;
const host = process.env.HOST || '127.0.0.1';

// Validate transport type
if (transportType !== 'STDIO' && transportType !== 'HTTP') {
  console.error(`Invalid TRANSPORT_TYPE: ${transportType}. Must be either 'STDIO' or 'HTTP'`);
  process.exit(1);
}

const server = new MemoryGraphServer({ 
  strictMode,
  transportType: transportType as 'STDIO' | 'HTTP',
  port,
  host
});
server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
