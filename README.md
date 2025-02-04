# Memory Graph MCP Server

An MCP server that provides persistent memory capabilities through a local knowledge graph implementation. This server enables Claude to maintain context and information across chat sessions using a graph-based storage system.

## Features

- Store and retrieve memories with content, tags, and metadata
- Organize memories using customizable paths
- Create relationships between memories
- Search memories by content
- Query memories using various filters
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

- `MEMORY_PATH`: Path to store the memory graph data (default: `./data`)

### Available Tools

1. `store_memory`
   - Store new information in the memory graph
   - Required: content
   - Optional: path, tags, relationships

2. `retrieve_memory`
   - Retrieve a specific memory by ID
   - Required: id

3. `query_memories`
   - Query memories using various filters
   - Optional: path, tags, relationshipType, relatedTo, limit, before, after

4. `search_memories`
   - Search memories by content
   - Required: query
   - Optional: limit

5. `update_memory`
   - Update an existing memory
   - Required: id
   - Optional: content, path, tags, relationships

6. `delete_memory`
   - Delete a memory by ID
   - Required: id

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
├── tests/               # Test files
├── data/               # Memory storage (created at runtime)
└── cline_docs/         # Project documentation
```

## Memory Graph Structure

Memories are stored as nodes in a graph with the following structure:

```typescript
interface MemoryNode {
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
```

Relationships between memories are stored as edges with metadata:

```typescript
interface GraphEdge {
  source: string;  // source node ID
  target: string;  // target node ID
  type: string;    // relationship type
  metadata?: {
    weight?: number;
    timestamp?: string;
  };
}
```

## License

ISC
