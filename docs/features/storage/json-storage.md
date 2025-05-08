# JSON Storage

JSON storage is the simplest storage backend for Memory Graph MCP, using plain JSON files to store memory data.

## Overview

JSON storage uses a file-based approach, where:
- Each domain has its own JSON file
- Domain metadata is stored in a separate file
- Session state is tracked in a persistence file

## File Structure

When using JSON storage, the following files are created:

```
[MEMORY_DIR]/
├── domains.json                # List of all domains and metadata
├── persistence.json            # Session state tracking
└── memories/
    ├── general.json            # Default domain memory file
    ├── domain1.json            # Domain-specific memory file
    └── domain2.json            # Another domain's memory file
```

### Key Files

#### domains.json

Contains metadata about all domains:

```json
{
  "general": {
    "id": "general",
    "name": "General",
    "description": "General purpose memory domain",
    "created": "2023-01-01T00:00:00.000Z",
    "lastAccess": "2023-01-15T12:30:45.678Z"
  },
  "domain1": {
    "id": "domain1",
    "name": "Domain 1",
    "description": "Custom domain for specific memories",
    "created": "2023-01-05T00:00:00.000Z",
    "lastAccess": "2023-01-10T09:15:30.123Z"
  }
}
```

#### persistence.json

Tracks the current session state:

```json
{
  "currentDomain": "general",
  "lastAccess": "2023-01-15T12:30:45.678Z",
  "lastMemoryId": "memory123"
}
```

#### domain-specific.json

Each domain file contains nodes (memories) and edges (relationships):

```json
{
  "nodes": {
    "memory123": {
      "id": "memory123",
      "content": "Memory content here",
      "timestamp": "2023-01-10T10:20:30.456Z",
      "path": "/memories/path",
      "tags": ["tag1", "tag2"],
      "content_summary": "Optional summary"
    },
    "memory456": {
      "id": "memory456",
      "content": "Another memory",
      "timestamp": "2023-01-12T14:25:35.789Z",
      "path": "/memories/path",
      "tags": ["tag2", "tag3"]
    }
  },
  "edges": [
    {
      "source": "memory123",
      "target": "memory456",
      "type": "relates_to",
      "strength": 0.8,
      "timestamp": "2023-01-12T14:30:00.000Z"
    }
  ]
}
```

## Configuration

To use JSON storage, set the `STORAGE_TYPE` environment variable:

```bash
STORAGE_TYPE=json
```

Additional configuration options:

```bash
# Directory to store memory files
MEMORY_DIR=/path/to/memory/directory

# Comma-separated list of specific memory files to use
MEMORY_FILES=domain1.json,domain2.json

# Set to 'true' to load all JSON files in the storage directory
LOAD_ALL_FILES=true
```

## Advantages

- **Simplicity**: Easy to understand and inspect
- **No Dependencies**: Doesn't require database setup
- **Portability**: Easy to backup, copy, or version control
- **Debugging**: Easy to manually inspect and edit
- **Development**: Excellent for development and testing

## Limitations

- **Performance**: Less efficient for large memory sets
- **Concurrency**: Limited support for concurrent access
- **Search**: Basic in-memory search capabilities
- **Memory Usage**: Loads entire domains into memory
- **Scalability**: Not suitable for very large deployments

## When to Use JSON Storage

JSON storage is ideal for:
- Development environments
- Small personal deployments
- Testing and debugging
- Simple use cases with limited memory nodes
- Scenarios where easy inspection is important

## Implementation Details

The JSON storage implementation is handled by the `JsonMemoryStorage` class. Key operations:

- **Reading**: Files are read completely into memory
- **Writing**: Complete memory state is written to files
- **Domains**: Domain list is kept in memory and periodically saved
- **Persistence**: Session state is saved on domain switches and memory operations

## Testing with JSON Storage

For testing with JSON storage:

```typescript
// In your test setup
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'memory-test-'));
const graph = new MemoryGraph({ 
  storageDir: tempDir, 
  storageType: 'json' 
});
await graph.initialize();

// Run your tests...

// Cleanup
await fs.rm(tempDir, { recursive: true, force: true });
```

## Converting from JSON to Other Storage Types

To convert from JSON to other storage types, use the conversion script:

```bash
# Convert from JSON to SQLite
npx ts-node scripts/convert-storage.ts json2sqlite /path/to/json/data /path/to/sqlite/file.db

# Convert from JSON to MariaDB
npx ts-node scripts/convert-storage.ts json2mariadb /path/to/json/data "mariadb://user:password@localhost:3306/memory_graph"
```

For more details on conversion, see [Converting Between Storage Types](converting.md).