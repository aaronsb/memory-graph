# Memory Graph SQLite Schema

This directory contains documentation and scripts for working with the Memory Graph MCP SQLite schema independently from the MCP server.

## Overview

Memory Graph MCP uses a SQLite database to store domain-based memory contexts and their relationships. This schema enables:

1. **Domain-based memory organization** - Isolated memory contexts
2. **Memory node storage** - Store memories with content, tags, and path structure
3. **Relationship tracking** - Connect related memories with typed relationships
4. **Cross-domain references** - Connect memories across domain boundaries
5. **Full-text search** - Find memories based on content using SQLite FTS5

## Documentation

- `sqlite-schema.md` - Complete schema documentation with all table definitions, indexes, and triggers
- `scripts/create-sqlite-db.js` - JavaScript example for creating and using a compatible database
- `scripts/create-sqlite-db.ts` - TypeScript example for creating and using a compatible database

## Getting Started

### Prerequisites

- Node.js 14+ 
- SQLite 3.31.0+ with FTS5 support

### Creating a Database

You can create a compatible database using the provided scripts:

```bash
# JavaScript version
node scripts/create-sqlite-db.js

# TypeScript version
ts-node scripts/create-sqlite-db.ts
```

The scripts will:
1. Create a new SQLite database file
2. Initialize the schema with all tables, indexes, and triggers
3. Create a sample domain
4. Add sample memory nodes with relationships
5. Demonstrate a basic full-text search

### Schema Structure

The database uses these main tables:

1. **DOMAINS** - Stores domain information
2. **PERSISTENCE** - Single-row table for system state
3. **MEMORY_NODES** - Stores individual memory nodes
4. **MEMORY_TAGS** - Many-to-many table for node tags
5. **MEMORY_EDGES** - Stores relationships between nodes
6. **DOMAIN_REFS** - Cross-domain references
7. **memory_content_fts** - Virtual FTS5 table for full-text search

## Integration

To integrate this schema with your own applications:

1. Follow the table definitions in `sqlite-schema.md`
2. Ensure all triggers and indexes are created
3. Use the sample scripts as a reference for basic operations

## Features and Capabilities

When using this schema, you can:

- Create isolated memory domains
- Store memories with rich content and metadata
- Establish typed relationships between memories
- Create cross-domain references
- Perform full-text search across memory content and tags
- Organize memories hierarchically with paths

## Additional Resources

For more detailed information, see:

- `sqlite-schema.md` - Complete schema documentation
- `memoryArchitecture.md` - Overall memory architecture design
- `MemoryGraph.ts` - Main interface implementation in the MCP
- `SqliteMemoryStorage.ts` - Storage implementation that uses this schema

## Version Compatibility

This schema documentation and the sample scripts are compatible with Memory Graph MCP as of May 2025. Future versions may include schema changes.

## License

This schema documentation and the accompanying scripts are provided under the same license as the Memory Graph MCP project.