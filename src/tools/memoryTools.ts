import {
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { MemoryGraph } from '../graph/MemoryGraph.js';
import { StoreMemoryInput, RecallMemoriesInput, ForgetMemoryInput, EditMemoryInput, GenerateMermaidGraphInput, DomainInfo, TraverseMemoriesInput, MemoryNode } from '../types/graph.js';
import { MermaidGenerator } from '../graph/MermaidGenerator.js';
import { ToolRequest, ToolResponse, ToolName } from '../types/mcp.js';

export const MEMORY_TOOLS = {
  traverse_memories: {
    name: 'traverse_memories' as ToolName,
    description: 'Traverse the memory graph following relationships and domain pointers',
    inputSchema: {
      type: 'object',
      properties: {
        startNodeId: {
          type: 'string',
          description: 'Optional starting memory ID (uses recent memory if not specified)',
        },
        maxDepth: {
          type: 'number',
          description: 'Maximum depth of relationships to traverse',
          minimum: 1,
          maximum: 5,
          default: 2,
        },
        followDomainPointers: {
          type: 'boolean',
          description: 'Whether to follow connections across domains',
          default: true,
        },
        targetDomain: {
          type: 'string',
          description: 'Optional specific domain to traverse',
        },
        maxNodesPerDomain: {
          type: 'number',
          description: 'Maximum number of nodes to return per domain',
          default: 20,
        },
        resolutionDepth: {
          type: 'string',
          description: 'Level of semantic detail to include in the output',
          enum: ['minimal', 'standard', 'detailed', 'comprehensive'],
          default: 'standard',
        },
      },
      required: [],
    },
  },
  
  search_memory_content: {
    name: 'search_memory_content' as ToolName,
    description: 'Search memory content using full-text search capabilities',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query text (supports advanced search syntax)',
        },
        domain: {
          type: 'string',
          description: 'Optional domain to restrict search to',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 20,
        },
      },
      required: ['query'],
    },
  },
  select_domain: {
    name: 'select_domain' as ToolName,
    description: 'Switch to a different memory domain. This will load the memories from the specified domain and make it the active context for all memory operations.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'ID of the domain to select',
        },
      },
      required: ['id'],
    },
  },

  list_domains: {
    name: 'list_domains' as ToolName,
    description: 'List all available memory domains with their metadata.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  create_domain: {
    name: 'create_domain' as ToolName,
    description: 'Create a new memory domain.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Unique identifier for the domain',
        },
        name: {
          type: 'string',
          description: 'Human-readable name for the domain',
        },
        description: {
          type: 'string',
          description: 'Purpose/scope of the domain',
        },
      },
      required: ['id', 'name', 'description'],
    },
  },

  store_memory: {
    name: 'store_memory' as ToolName,
    description: `Store a new memory in the knowledge graph.
During dreaming: Create at most 1-2 new synthesized memories per dreaming session.
Focus only on clear, significant patterns that emerge across multiple memories.
Avoid creating abstract memories that don't add concrete value.`,
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
    description: `Recall memories using various strategies including content search.
During dreaming: Limit initial recall to 10-15 most relevant memories about the topic.
Use combinedStrategy to gather related memories, but avoid going too broad or deep
in the connections. Stay focused on the core topic being dreamed about.`,
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
    description: `Edit an existing memory in the knowledge graph.
During dreaming: Limit edits to 2-3 memories per session. Focus on obvious
consolidation opportunities where memories are clearly redundant. Don't over-edit
or try to force connections - memories can retain their unique perspectives.`,
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
    description: `Remove a memory from the knowledge graph.
During dreaming: Use at most once per session, and only for memories that are
100% redundant after consolidation. When in doubt, preserve the memory. Never
remove memories just because they seem less important.`,
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

  generate_mermaid_graph: {
    name: 'generate_mermaid_graph' as ToolName,
    description: `Generate a Mermaid graph visualization of memory relationships.
    
Prerequisites:
- Use recall_memories first to get valid memory IDs. Common strategies:
  * recent: Get latest memories
  * path: Get memories from a specific path
  * tag: Get memories with specific tags
  * related: Get memories connected to a starting point
  * content: Search by content/keywords

Best Practices:
1. Choose direction based on relationship semantics:
   * LR/RL: For showing flow/progression
   * TB/BT: For hierarchical relationships
2. Adjust maxDepth (1-5) to control visualization scope
3. Use minStrength (0-1) to filter relationship quality
4. Filter relationshipTypes for focused views:
   * relates_to: General connections
   * supports: Reinforcing relationships
   * synthesizes: Combined insights
   * refines: Clarifications/improvements
5. Use followDomainPointers to visualize cross-domain connections:
   * Set to true to follow references to other domains
   * Cross-domain connections shown with dashed lines
   * Nodes from different domains have different background colors

The generated graph shows:
- Nodes: Individual memories (content truncated for readability)
- Edges: Labeled relationships with types
- Direction: Specified flow of relationships
- Strength: Only relationships meeting minStrength threshold
- Domains: Nodes from different domains have distinct visual styles`,
    inputSchema: {
      type: 'object',
      properties: {
        startNodeId: {
          type: 'string',
          description: 'ID of the memory node to start the graph from',
        },
        maxDepth: {
          type: 'number',
          description: 'Maximum depth of relationships to traverse (1-5)',
          minimum: 1,
          maximum: 5,
          default: 2,
        },
        direction: {
          type: 'string',
          enum: ['TB', 'BT', 'LR', 'RL'],
          description: 'Graph direction (top-bottom, bottom-top, left-right, right-left)',
          default: 'LR',
        },
        relationshipTypes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional filter for specific relationship types',
        },
        minStrength: {
          type: 'number',
          description: 'Minimum relationship strength to include (0-1)',
          minimum: 0,
          maximum: 1,
        },
        followDomainPointers: {
          type: 'boolean',
          description: 'Whether to follow connections across domains (default: true)',
        },
        contentFormat: {
          type: 'object',
          description: 'Optional content formatting options',
          properties: {
            maxLength: {
              type: 'number',
              description: 'Maximum length for node content (default: 50)',
              minimum: 1
            },
            truncationSuffix: {
              type: 'string',
              description: 'String to append when content is truncated (default: "...")'
            },
            includeTimestamp: {
              type: 'boolean',
              description: 'Include node timestamps in display'
            },
            includeId: {
              type: 'boolean',
              description: 'Include node IDs in display'
            }
          }
        },
      },
      required: ['startNodeId'],
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
      case 'generate_mermaid_graph':
        return this.handleGenerateMermaidGraph(args as GenerateMermaidGraphInput);
      case 'traverse_memories':
        return this.handleTraverseMemories(args as TraverseMemoriesInput);
      case 'select_domain':
        return this.handleSelectDomain(args as { id: string });
      case 'list_domains':
        return this.handleListDomains();
      case 'create_domain':
        return this.handleCreateDomain(args as { id: string; name: string; description: string });
      case 'search_memory_content':
        return this.handleSearchMemoryContent(args as { query: string; domain?: string; maxResults?: number });
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  }

  private async handleSearchMemoryContent(args: { query: string; domain?: string; maxResults?: number }): Promise<ToolResponse> {
    try {
      const results = await this.graph.searchContent(args.query, args.domain, args.maxResults);
      
      // Format the results in a more readable way
      let output = `# Search Results for "${args.query}"\n\n`;
      
      if (results.length === 0) {
        output += "No matching memories found.\n";
      } else {
        output += `Found ${results.length} matching memories:\n\n`;
        
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const node = result.node;
          
          output += `## Memory ${i+1}: ${node.id}\n\n`;
          output += `${node.content}\n\n`;
          
          // Add metadata
          output += `*Created: ${new Date(node.timestamp).toLocaleString()}*\n`;
          if (node.path) {
            output += `*Path: ${node.path}*\n`;
          }
          if (node.tags && node.tags.length > 0) {
            output += `*Tags: ${node.tags.join(', ')}*\n`;
          }
          
          // Add connections if any
          if (result.edges.length > 0) {
            output += `\n### Connections\n\n`;
            for (const edge of result.edges) {
              const isOutgoing = edge.source === node.id;
              const otherNodeId = isOutgoing ? edge.target : edge.source;
              output += `- ${isOutgoing ? 'To' : 'From'} ${otherNodeId}: ${edge.type} (strength: ${edge.strength.toFixed(2)})\n`;
            }
          }
          
          output += `\n---\n\n`;
        }
      }
      
      return {
        content: [{ type: 'text', text: output }],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to search memory content: ${error}`);
    }
  }

  private async handleTraverseMemories(args: TraverseMemoriesInput): Promise<ToolResponse> {
    try {
      const result = await this.graph.traverseMemories(args);
      
      // Format the output based on resolution depth
      const resolutionDepth = args.resolutionDepth || 'standard'; // Default to standard
      
      // Format the output in a narrative, hierarchical text format
      let output = '# Memory Graph Traversal\n\n';
      
      // Add traversal context
      output += `## Context\n\n`;
      output += `- Starting Point: ${result.context.startingPoint}\n`;
      output += `- Traversal Depth: ${result.context.depth}\n`;
      output += `- Domains Visited: ${result.context.domains.join(', ')}\n`;
      output += `- Resolution Depth: ${resolutionDepth}\n\n`;
      
      // Add nodes by domain
      const nodesByDomain = new Map<string, MemoryNode[]>();
      
      for (const node of result.nodes) {
        // Find which domain this node belongs to
        let nodeDomain = 'unknown';
        
        for (const domain of result.context.domains) {
          if (result.crossDomainConnections.some(conn => 
            (conn.fromDomain === domain && conn.fromNodeId === node.id) ||
            (conn.toDomain === domain && conn.toNodeId === node.id)
          )) {
            nodeDomain = domain;
            break;
          }
        }
        
        // If we couldn't determine the domain from connections, use the current domain
        if (nodeDomain === 'unknown') {
          nodeDomain = this.graph.getCurrentDomain();
        }
        
        // Add to the map
        if (!nodesByDomain.has(nodeDomain)) {
          nodesByDomain.set(nodeDomain, []);
        }
        nodesByDomain.get(nodeDomain)!.push(node);
      }
      
      // Output nodes by domain
      for (const [domain, nodes] of nodesByDomain.entries()) {
        output += `## Domain: ${domain}\n\n`;
        
        for (const node of nodes) {
          // Format node header based on resolution depth
          if (resolutionDepth === 'minimal') {
            // For minimal, show truncated title or just ID
            output += `### ${node.title || `Memory ${node.id}`}\n\n`;
          } else {
            // For other modes, show full title without truncation
            // Use the first sentence or up to 80 chars of content if no title
            const fullTitle = node.content.split('.')[0].trim();
            output += `### ${fullTitle || `Memory ${node.id}`}\n\n`;
          }
          
          // Add content based on resolution depth
          if (resolutionDepth === 'minimal') {
            // Just show ID
            output += `*ID: ${node.id}*\n\n`;
          } else if (resolutionDepth === 'standard') {
            // Show title and content
            output += `${node.content}\n\n`;
            output += `*Created: ${new Date(node.timestamp).toLocaleString()}*\n`;
          } else {
            // Detailed or comprehensive - show everything
            output += `${node.content}\n\n`;
            
            // Add metadata
            output += `*Created: ${new Date(node.timestamp).toLocaleString()}*\n`;
            if (node.path) {
              output += `*Path: ${node.path}*\n`;
            }
            if (node.tags && node.tags.length > 0) {
              output += `*Tags: ${node.tags.join(', ')}*\n`;
            }
            if (node.keyEntities && node.keyEntities.length > 0) {
              output += `*Key concepts: ${node.keyEntities.join(', ')}*\n`;
            }
          }
          
          // Add connections - use Sets to ensure uniqueness
          const incomingEdgeSet = new Set(result.edges
            .filter(e => e.target === node.id)
            .map(e => `${e.source}-${e.target}-${e.type}`));
          
          const outgoingEdgeSet = new Set(result.edges
            .filter(e => e.source === node.id)
            .map(e => `${e.source}-${e.target}-${e.type}`));
          
          // Convert back to edges, ensuring no duplicates
          const incomingEdges = result.edges
            .filter(e => e.target === node.id && incomingEdgeSet.has(`${e.source}-${e.target}-${e.type}`))
            .filter((e, i, arr) => arr.findIndex(a => 
              a.source === e.source && a.target === e.target && a.type === e.type) === i);
          
          const outgoingEdges = result.edges
            .filter(e => e.source === node.id && outgoingEdgeSet.has(`${e.source}-${e.target}-${e.type}`))
            .filter((e, i, arr) => arr.findIndex(a => 
              a.source === e.source && a.target === e.target && a.type === e.type) === i);
          
          if (incomingEdges.length > 0) {
            output += `\n#### Incoming Connections\n\n`;
            for (const edge of incomingEdges) {
              const sourceNode = result.nodes.find(n => n.id === edge.source);
              if (sourceNode) {
                if (resolutionDepth === 'minimal') {
                  output += `- **${edge.type}** (strength: ${edge.strength.toFixed(2)}) from Memory ${edge.source}\n`;
                } else if (resolutionDepth === 'standard') {
                  output += `- **${edge.type}** (strength: ${edge.strength.toFixed(2)}) from "${sourceNode.title || `Memory ${edge.source}`}"\n`;
                } else if (resolutionDepth === 'detailed') {
                  output += `- **${edge.type}** (strength: ${edge.strength.toFixed(2)}) from "${sourceNode.title || `Memory ${edge.source}`}"\n`;
                  if (sourceNode.keyEntities && sourceNode.keyEntities.length > 0) {
                    output += `  *Key concepts: ${sourceNode.keyEntities.join(', ')}*\n`;
                  }
                } else {
                  // Comprehensive
                  output += `- **${edge.type}** (strength: ${edge.strength.toFixed(2)}) from "${sourceNode.title || `Memory ${edge.source}`}" [${edge.source}]\n`;
                  if (sourceNode.keyEntities && sourceNode.keyEntities.length > 0) {
                    output += `  *Key concepts: ${sourceNode.keyEntities.join(', ')}*\n`;
                  }
                  output += `  *"${sourceNode.content.substring(0, 100)}${sourceNode.content.length > 100 ? '...' : ''}"*\n`;
                }
                output += `\n`;
              }
            }
          }
          
          if (outgoingEdges.length > 0) {
            output += `\n#### Outgoing Connections\n\n`;
            for (const edge of outgoingEdges) {
              const targetNode = result.nodes.find(n => n.id === edge.target);
              if (targetNode) {
                if (resolutionDepth === 'minimal') {
                  output += `- **${edge.type}** (strength: ${edge.strength.toFixed(2)}) to Memory ${edge.target}\n`;
                } else if (resolutionDepth === 'standard') {
                  output += `- **${edge.type}** (strength: ${edge.strength.toFixed(2)}) to "${targetNode.title || `Memory ${edge.target}`}"\n`;
                } else if (resolutionDepth === 'detailed') {
                  output += `- **${edge.type}** (strength: ${edge.strength.toFixed(2)}) to "${targetNode.title || `Memory ${edge.target}`}"\n`;
                  if (targetNode.keyEntities && targetNode.keyEntities.length > 0) {
                    output += `  *Key concepts: ${targetNode.keyEntities.join(', ')}*\n`;
                  }
                } else {
                  // Comprehensive
                  output += `- **${edge.type}** (strength: ${edge.strength.toFixed(2)}) to "${targetNode.title || `Memory ${edge.target}`}" [${edge.target}]\n`;
                  if (targetNode.keyEntities && targetNode.keyEntities.length > 0) {
                    output += `  *Key concepts: ${targetNode.keyEntities.join(', ')}*\n`;
                  }
                  output += `  *"${targetNode.content.substring(0, 100)}${targetNode.content.length > 100 ? '...' : ''}"*\n`;
                }
                output += `\n`;
              }
            }
          }
          
          // Add cross-domain connections
          const crossDomainFrom = result.crossDomainConnections.filter(c => c.fromNodeId === node.id);
          const crossDomainTo = result.crossDomainConnections.filter(c => c.toNodeId === node.id);
          
          if (crossDomainFrom.length > 0 || crossDomainTo.length > 0) {
            output += `\n#### Cross-Domain Connections\n\n`;
            
            for (const conn of crossDomainFrom) {
              output += `- **→ Points to** domain "${conn.toDomain}" (memory ${conn.toNodeId})`;
              if (conn.description) {
                output += `: ${conn.description}`;
              }
              output += `\n`;
            }
            
            for (const conn of crossDomainTo) {
              output += `- **← Referenced from** domain "${conn.fromDomain}" (memory ${conn.fromNodeId})`;
              if (conn.description) {
                output += `: ${conn.description}`;
              }
              output += `\n`;
            }
            
            output += `\n`;
          }
          
          output += `---\n\n`;
        }
      }
      
      return {
        content: [{ type: 'text', text: output }],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to traverse memories: ${error}`);
    }
  }

  private async handleSelectDomain(args: { id: string }): Promise<ToolResponse> {
    try {
      const domain = await this.graph.selectDomain(args.id);
      return {
        content: [{ type: 'text', text: JSON.stringify(domain, null, 2) }],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InvalidParams, `Failed to select domain: ${error}`);
    }
  }

  private async handleListDomains(): Promise<ToolResponse> {
    try {
      const domains = await this.graph.listDomains();
      const currentDomain = this.graph.getCurrentDomain();
      
      const result = {
        domains,
        currentDomain,
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to list domains: ${error}`);
    }
  }

  private async handleCreateDomain(args: { id: string; name: string; description: string }): Promise<ToolResponse> {
    try {
      const domain = await this.graph.createDomain(args.id, args.name, args.description);
      return {
        content: [{ type: 'text', text: JSON.stringify(domain, null, 2) }],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InvalidParams, `Failed to create domain: ${error}`);
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

  private async handleGenerateMermaidGraph(args: GenerateMermaidGraphInput): Promise<ToolResponse> {
    try {
      // Pass the MemoryGraph instance to the MermaidGenerator
      const generator = new MermaidGenerator(this.graph['nodes'], this.graph['edges'], this.graph);
      const mermaid = await generator.generateGraph(args);
      return {
        content: [{ type: 'text', text: mermaid }],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to generate Mermaid graph: ${error}`);
    }
  }
}
