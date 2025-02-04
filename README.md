# Memory Graph MCP Server

An MCP server that provides persistent memory capabilities through a local knowledge graph implementation. This server enables Claude to maintain context and information across chat sessions using a graph-based storage system.

## Features

- Store and retrieve memories with content, tags, and metadata
- Organize memories using customizable paths
- Create relationships between memories
- Advanced content search with fuzzy matching and regex support
- Combine multiple search strategies (content, path, tags)
- Flexible result sorting and relevance scoring
- Persistent storage using local file system

## Installation

```bash
npm install
```

## Usage

### Starting the Server

```bash
npm start
```

The server will start and listen for MCP requests on stdio.

### Configuration

The server can be configured using environment variables:

- `MEMORY_DIR`: Directory to store memory files (default: `./data`)
- `MEMORY_FILES`: Comma-separated list of specific memory files to use
- `LOAD_ALL_FILES`: Set to 'true' to load all JSON files in the storage directory
- `DEFAULT_PATH`: Default path for storing memories

#### Memory File Initialization

The server handles memory file initialization in three modes:

1. **Specific Files Mode** (`MEMORY_FILES` set):
   - Only uses explicitly configured memory files
   - Throws error if none of the configured files exist
   - Uses first existing file as active storage
   - Prevents creation of new files when configured files don't exist

2. **Load All Mode** (`LOAD_ALL_FILES=true`):
   - Loads all JSON files in the storage directory
   - Uses first existing file as active storage
   - Creates new file only if directory is empty

3. **Default Mode** (no specific configuration):
   - Uses single memory.json file
   - Creates new file if none exists

This initialization behavior ensures that:
- Existing memories are never overwritten
- New files are only created when appropriate
- Server fails fast if configured files are missing

### Available Tools

1. `store_memory`
   - Store new information in the memory graph
   - Required: content
   - Optional: path, tags, relationships (with strength 0-1)
   - Dreaming Guidelines:
     * Create at most 1-2 new synthesized memories per session
     * Focus on clear, significant patterns across multiple memories
     * Avoid abstract memories that don't add concrete value

2. `recall_memories`
   - Retrieve memories using various strategies
   - Required: maxNodes, strategy
   - Dreaming Guidelines:
     * Limit initial recall to 10-15 most relevant memories
     * Use combinedStrategy to gather related memories
     * Stay focused on the core topic being dreamed about
     * Avoid going too broad or deep in connections
   - Strategies:
     * recent: Get latest memories
     * related: Follow relationship paths from a starting point
     * path: Filter by organizational path
     * tag: Filter by memory tags
     * content: Search within memory content
   - Optional filters:
     * startNodeId (required for 'related' strategy)
     * path (required for 'path' strategy)
     * tags (required for 'tag' strategy)
     * relationshipTypes
     * minStrength (0-1)
     * before/after timestamps
   - Content Search Options:
     * keywords: Array of terms to search for
     * fuzzyMatch: Enable fuzzy matching using Levenshtein distance
     * regex: Use regular expression pattern matching
     * caseSensitive: Enable case-sensitive matching
   - Advanced Features:
     * combinedStrategy: Combine multiple search criteria
     * sortBy: Sort results by 'relevance', 'date', or 'strength'
     * matchDetails: Get highlighted matches with positions

3. `edit_memory`
   - Edit an existing memory's content and relationships
   - Required: id
   - Optional: content, relationships (with strength 0-1)
   - Updates only provided fields
   - Replaces all relationships when provided
   - Dreaming Guidelines:
     * Limit edits to 2-3 memories per session
     * Focus on obvious consolidation opportunities
     * Don't over-edit or force connections
     * Allow memories to retain unique perspectives

4. `forget_memory`
   - Remove a memory from the graph
   - Required: id
   - Optional: cascade (remove connected memories)
   - Dreaming Guidelines:
     * Use at most once per session
     * Only remove 100% redundant memories after consolidation
     * When in doubt, preserve the memory
     * Never remove memories just because they seem less important

5. `generate_mermaid_graph`
   - Generate a Mermaid flowchart visualization of memory relationships
   - Prerequisites:
     * Use recall_memories first to get valid memory IDs using strategies:
       - recent: Get latest memories
       - path: Get memories from a specific path
       - tag: Get memories with specific tags
       - related: Get memories connected to a starting point
       - content: Search by content/keywords
   - Required: startNodeId
   - Optional:
     * maxDepth: Maximum depth of relationships to traverse (1-5, default: 2)
     * direction: Graph direction ('TB', 'BT', 'LR', 'RL', default: 'LR')
     * relationshipTypes: Filter specific relationship types
     * minStrength: Minimum relationship strength to include (0-1)
     * contentFormat:
       - maxLength: Maximum length for node content (default: 50)
       - truncationSuffix: String to append when truncated (default: "...")
       - includeTimestamp: Include node timestamps in display
       - includeId: Include node IDs in display
   - Best Practices:
     * Choose direction based on relationship semantics:
       - LR/RL: For showing flow/progression
       - TB/BT: For hierarchical relationships
     * Adjust maxDepth (1-5) to control visualization scope
     * Use minStrength (0-1) to filter relationship quality
     * Filter relationshipTypes for focused views:
       - relates_to: General connections
       - supports: Reinforcing relationships
       - synthesizes: Combined insights
       - refines: Clarifications/improvements
   - Features:
     * Automatically truncates long content
     * Escapes special characters
     * Generates valid Mermaid syntax for easy visualization
   - Example output:
     ```mermaid
     graph LR
         node1["First memory content..."]
         node2["Second memory content..."]
         node1 -->|relates_to| node2
     ```

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Project Structure

```
memory-graph/
├── src/
│   ├── graph/           # Knowledge graph implementation
│   ├── tools/           # MCP tool implementations
│   ├── types/           # TypeScript type definitions
│   └── index.ts         # Main server entry
├── data/               # Memory storage (created at runtime)
└── cline_docs/         # Project documentation
```

## Memory Graph Structure

Memories are stored as nodes in a graph with the following structure:

```typescript
interface MemoryNode {
  id: string;
  content: string;
  timestamp: string;
  path?: string;
  tags?: string[];
}
```

Relationships between memories are stored as edges:

```typescript
interface GraphEdge {
  source: string;    // source node ID
  target: string;    // target node ID
  type: string;      // relationship type
  strength: number;  // relationship strength (0-1)
  timestamp: string; // when the relationship was created
}
```

## License

ISC
