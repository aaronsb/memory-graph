# Memory Graph SQLite Storage Design

This document outlines the design for implementing a SQLite-based storage backend for the memory graph system, providing an alternative to the current JSON file-based storage approach.

## 1. Introduction

### 1.1 Purpose

The memory graph currently uses a JSON file-based storage system, which works well for smaller datasets but may face performance and scalability challenges as the memory graph grows. This design proposes a SQLite-based alternative that:

- Maintains compatibility with the existing memory graph architecture
- Provides more efficient storage and retrieval mechanisms
- Enables advanced query capabilities like full-text search
- Allows easy switching between storage backends

### 1.2 Current Architecture Overview

The memory graph currently uses a JSON file-based storage system with:
- One JSON file per domain (e.g., `general.json`) containing nodes and edges
- A `domains.json` file storing metadata about all domains
- A `persistence.json` file tracking current state (active domain, last access, etc.)

The core data structures are:
- **Nodes (MemoryNode)**: Individual memories with content, timestamp, path, tags, etc.
- **Edges (GraphEdge)**: Relationships between memories with source, target, type, strength
- **Domains**: Separate contexts for memories, each with its own set of nodes and edges
- **Domain References**: Cross-domain connections between memories

## 2. SQLite Schema Design

### 2.1 Table Definitions

```sql
-- Domains table
CREATE TABLE DOMAINS (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created TEXT NOT NULL,
    lastAccess TEXT NOT NULL
);

-- Persistence state table (single row)
CREATE TABLE PERSISTENCE (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    currentDomain TEXT NOT NULL,
    lastAccess TEXT NOT NULL,
    lastMemoryId TEXT,
    FOREIGN KEY (currentDomain) REFERENCES DOMAINS(id)
);

-- Memory nodes table
CREATE TABLE MEMORY_NODES (
    id TEXT PRIMARY KEY,
    domain TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    path TEXT DEFAULT '/',
    FOREIGN KEY (domain) REFERENCES DOMAINS(id)
);

-- Memory tags table (many-to-many)
CREATE TABLE MEMORY_TAGS (
    nodeId TEXT NOT NULL,
    tag TEXT NOT NULL,
    PRIMARY KEY (nodeId, tag),
    FOREIGN KEY (nodeId) REFERENCES MEMORY_NODES(id) ON DELETE CASCADE
);

-- Memory edges table
CREATE TABLE MEMORY_EDGES (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    target TEXT NOT NULL,
    type TEXT NOT NULL,
    strength REAL NOT NULL CHECK (strength >= 0 AND strength <= 1),
    timestamp TEXT NOT NULL,
    domain TEXT NOT NULL,
    FOREIGN KEY (source) REFERENCES MEMORY_NODES(id) ON DELETE CASCADE,
    FOREIGN KEY (target) REFERENCES MEMORY_NODES(id) ON DELETE CASCADE,
    FOREIGN KEY (domain) REFERENCES DOMAINS(id)
);

-- Domain references table
CREATE TABLE DOMAIN_REFS (
    nodeId TEXT NOT NULL,
    domain TEXT NOT NULL,
    targetDomain TEXT NOT NULL,
    targetNodeId TEXT NOT NULL,
    description TEXT,
    bidirectional INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (nodeId, targetDomain, targetNodeId),
    FOREIGN KEY (nodeId) REFERENCES MEMORY_NODES(id) ON DELETE CASCADE,
    FOREIGN KEY (domain) REFERENCES DOMAINS(id),
    FOREIGN KEY (targetDomain) REFERENCES DOMAINS(id)
);
```

### 2.2 Indexes

```sql
-- For fast domain-based filtering
CREATE INDEX idx_memory_nodes_domain ON MEMORY_NODES(domain);

-- For fast tag lookups
CREATE INDEX idx_memory_tags_tag ON MEMORY_TAGS(tag);

-- For fast edge traversal
CREATE INDEX idx_memory_edges_source ON MEMORY_EDGES(source, domain);
CREATE INDEX idx_memory_edges_target ON MEMORY_EDGES(target, domain);

-- For fast domain reference lookups
CREATE INDEX idx_domain_refs_target ON DOMAIN_REFS(targetDomain, targetNodeId);
```

### 2.3 Full-Text Search

```sql
-- Enable FTS5 extension for full-text search
CREATE VIRTUAL TABLE memory_content_fts USING fts5(
    id,              -- Memory ID
    content,         -- Memory content
    path,            -- Organization path
    tags,            -- Concatenated tags for searching
    domain,          -- Domain ID
    tokenize="porter unicode61"  -- Use Porter stemming algorithm
);

-- Triggers to keep FTS index in sync with memory nodes
CREATE TRIGGER memory_nodes_ai AFTER INSERT ON MEMORY_NODES BEGIN
    INSERT INTO memory_content_fts(id, content, path, domain)
    VALUES (new.id, new.content, new.path, new.domain);
END;

CREATE TRIGGER memory_nodes_ad AFTER DELETE ON MEMORY_NODES BEGIN
    DELETE FROM memory_content_fts WHERE id = old.id;
END;

CREATE TRIGGER memory_nodes_au AFTER UPDATE ON MEMORY_NODES BEGIN
    DELETE FROM memory_content_fts WHERE id = old.id;
    INSERT INTO memory_content_fts(id, content, path, domain)
    VALUES (new.id, new.content, new.path, new.domain);
END;

-- Trigger to update tags in FTS when tags are added/removed
CREATE TRIGGER memory_tags_ai AFTER INSERT ON MEMORY_TAGS BEGIN
    UPDATE memory_content_fts 
    SET tags = (SELECT group_concat(tag, ' ') FROM MEMORY_TAGS WHERE nodeId = new.nodeId)
    WHERE id = new.nodeId;
END;

CREATE TRIGGER memory_tags_ad AFTER DELETE ON MEMORY_TAGS BEGIN
    UPDATE memory_content_fts 
    SET tags = (SELECT group_concat(tag, ' ') FROM MEMORY_TAGS WHERE nodeId = old.nodeId)
    WHERE id = old.nodeId;
END;
```

## 3. Storage Interface

To support easy switching between JSON and SQLite storage, we'll create an abstract storage interface:

```typescript
// storage/MemoryStorage.ts
export interface MemoryStorage {
    initialize(): Promise<void>;
    
    // Domain operations
    getDomains(): Promise<Map<string, DomainInfo>>;
    saveDomains(domains: Map<string, DomainInfo>): Promise<void>;
    createDomain(domain: DomainInfo): Promise<void>;
    
    // Persistence operations
    getPersistenceState(): Promise<PersistenceState>;
    savePersistenceState(state: PersistenceState): Promise<void>;
    
    // Memory operations
    getMemories(domain: string): Promise<{ nodes: Map<string, MemoryNode>, edges: GraphEdge[] }>;
    saveMemories(domain: string, nodes: Map<string, MemoryNode>, edges: GraphEdge[]): Promise<void>;
    
    // Search operations
    searchContent(query: string, domain?: string): Promise<MemoryNode[]>;
}
```

### 3.1 JSON Implementation

```typescript
// storage/JsonMemoryStorage.ts
export class JsonMemoryStorage implements MemoryStorage {
    private storageDir: string;
    private memoriesDir: string;
    private domainsFile: string;
    private persistenceFile: string;

    constructor(storageDir: string) {
        this.storageDir = storageDir;
        this.memoriesDir = path.join(storageDir, 'memories');
        this.domainsFile = path.join(storageDir, 'domains.json');
        this.persistenceFile = path.join(storageDir, 'persistence.json');
    }

    async initialize(): Promise<void> {
        await fs.mkdir(this.storageDir, { recursive: true });
        await fs.mkdir(this.memoriesDir, { recursive: true });
    }

    async getDomains(): Promise<Map<string, DomainInfo>> {
        try {
            const data = await fs.readFile(this.domainsFile, 'utf-8');
            const parsed = JSON.parse(data);
            const domains = new Map<string, DomainInfo>();
            
            Object.entries(parsed).forEach(([id, info]) => {
                domains.set(id, info as DomainInfo);
            });
            
            return domains;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return new Map();
            }
            throw error;
        }
    }

    async saveDomains(domains: Map<string, DomainInfo>): Promise<void> {
        const data = Object.fromEntries(domains);
        await fs.writeFile(this.domainsFile, JSON.stringify(data, null, 2));
    }

    // ... other methods implementation
}
```

### 3.2 SQLite Implementation

```typescript
// storage/SqliteMemoryStorage.ts
export class SqliteMemoryStorage implements MemoryStorage {
    private dbPath: string;
    private db: Database | null = null;

    constructor(storageDir: string) {
        this.dbPath = path.join(storageDir, 'memory-graph.db');
    }

    private async getDatabase(): Promise<Database> {
        if (!this.db) {
            this.db = await open({
                filename: this.dbPath,
                driver: sqlite3.Database
            });
        }
        return this.db;
    }

    async initialize(): Promise<void> {
        const db = await this.getDatabase();
        
        // Create tables if they don't exist
        await db.exec(`
            -- Create tables
            CREATE TABLE IF NOT EXISTS DOMAINS (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                created TEXT NOT NULL,
                lastAccess TEXT NOT NULL
            );
            
            -- ... other table creation statements
            
            -- Create indexes
            CREATE INDEX IF NOT EXISTS idx_memory_nodes_domain ON MEMORY_NODES(domain);
            -- ... other index creation statements
            
            -- Create FTS virtual table
            CREATE VIRTUAL TABLE IF NOT EXISTS memory_content_fts USING fts5(
                id, content, path, tags, domain,
                tokenize="porter unicode61"
            );
            
            -- ... trigger creation statements
        `);
    }

    async getDomains(): Promise<Map<string, DomainInfo>> {
        const db = await this.getDatabase();
        const rows = await db.all('SELECT * FROM DOMAINS');
        
        const domains = new Map<string, DomainInfo>();
        for (const row of rows) {
            domains.set(row.id, {
                id: row.id,
                name: row.name,
                description: row.description,
                created: row.created,
                lastAccess: row.lastAccess
            });
        }
        
        return domains;
    }

    // ... other methods implementation
    
    async searchContent(query: string, domain?: string): Promise<MemoryNode[]> {
        const db = await this.getDatabase();
        
        let sql = `
            SELECT m.* FROM MEMORY_NODES m
            JOIN memory_content_fts fts ON m.id = fts.id
            WHERE memory_content_fts MATCH ?
        `;
        
        const params = [query];
        
        if (domain) {
            sql += ' AND m.domain = ?';
            params.push(domain);
        }
        
        const rows = await db.all(sql, params);
        return rows.map(row => this.rowToMemoryNode(row));
    }
}
```

## 4. Storage Factory

To simplify the creation of the appropriate storage implementation:

```typescript
// storage/StorageFactory.ts
export enum StorageType {
    JSON = 'json',
    SQLITE = 'sqlite'
}

export class StorageFactory {
    static createStorage(type: StorageType, storageDir: string): MemoryStorage {
        switch (type) {
            case StorageType.JSON:
                return new JsonMemoryStorage(storageDir);
            case StorageType.SQLITE:
                return new SqliteMemoryStorage(storageDir);
            default:
                throw new Error(`Unknown storage type: ${type}`);
        }
    }
}
```

## 5. MemoryGraph Refactoring

The `MemoryGraph` class will be refactored to use the storage interface:

```typescript
export class MemoryGraph {
    private nodes: Map<string, MemoryNode>;
    private edges: GraphEdge[];
    private config: MemoryGraphConfig;
    private currentDomain: string;
    private domains: Map<string, DomainInfo>;
    private storage: MemoryStorage;

    constructor(config: MemoryGraphConfig) {
        this.nodes = new Map();
        this.edges = [];
        this.config = config;
        this.currentDomain = config.defaultDomain || 'general';
        this.domains = new Map();
        
        // Create storage implementation based on config
        this.storage = StorageFactory.createStorage(
            config.storageType || StorageType.JSON,
            config.storageDir
        );
    }

    async initialize(): Promise<void> {
        // Initialize storage
        await this.storage.initialize();
        
        // Load domains
        this.domains = await this.storage.getDomains();
        
        // Create default domain if needed
        if (this.domains.size === 0) {
            const defaultDomain: DomainInfo = {
                id: 'general',
                name: 'General',
                description: 'Default domain for general memories',
                created: new Date().toISOString(),
                lastAccess: new Date().toISOString()
            };
            this.domains.set('general', defaultDomain);
            await this.storage.saveDomains(this.domains);
        }
        
        // Load persistence state
        try {
            const state = await this.storage.getPersistenceState();
            if (this.domains.has(state.currentDomain)) {
                this.currentDomain = state.currentDomain;
            }
        } catch (error) {
            // Create default persistence state
            const state: PersistenceState = {
                currentDomain: this.currentDomain,
                lastAccess: new Date().toISOString()
            };
            await this.storage.savePersistenceState(state);
        }
        
        // Load current domain's memories
        const { nodes, edges } = await this.storage.getMemories(this.currentDomain);
        this.nodes = nodes;
        this.edges = edges;
    }

    // ... other methods refactored to use storage
}
```

## 6. Configuration

The `MemoryGraphConfig` interface will be updated to include storage type:

```typescript
export interface MemoryGraphConfig {
    storageDir: string;
    defaultPath?: string;
    defaultDomain?: string;
    storageType?: StorageType;
}
```

The MCP configuration will be updated to include the storage type:

```json
{
  "mcpServers": {
    "memory-graph": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-v",
        "/home/aaron/.mcp/memory-graph:/app/data",
        "-e",
        "MEMORY_DIR=/app/data",
        "-e",
        "STORAGE_TYPE=sqlite",  // or "json"
        "-e",
        "LOAD_ALL_FILES=true",
        "-e",
        "DEFAULT_PATH=/memories",
        "memory-graph:local"
      ],
      "env": {},
      "disabled": false,
      "autoApprove": [
        "forget_memory",
        "create_domain",
        "store_memory",
        "list_domains",
        "traverse_memories",
        "select_domain",
        "generate_mermaid_graph"
      ]
    }
  }
}
```

## 7. Full-Text Search Tool

A new MCP tool will be added to expose the full-text search capability:

```typescript
// Add to MEMORY_TOOLS in memoryTools.ts
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
}
```

Implementation in `MemoryTools` class:

```typescript
private async handleSearchMemoryContent(args: { query: string, domain?: string, maxResults?: number }): Promise<ToolResponse> {
    try {
        const results = await this.graph.searchContent(
            args.query,
            args.domain,
            args.maxResults || 20
        );
        
        return {
            content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
        };
    } catch (error) {
        throw new McpError(ErrorCode.InternalError, `Failed to search memory content: ${error}`);
    }
}
```

## 8. JSON-SQLite Converter

A standalone utility script will be provided for converting between storage formats:

```typescript
// scripts/convert-storage.ts
import { promises as fs } from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { MemoryNode, GraphEdge, DomainInfo, PersistenceState } from '../src/types/graph.js';

async function convertJsonToSqlite(jsonDir: string, sqliteFile: string): Promise<void> {
    // Open SQLite database
    const db = await open({
        filename: sqliteFile,
        driver: sqlite3.Database
    });
    
    // Create schema (tables, indexes, triggers)
    await createSchema(db);
    
    // Read domains.json
    const domainsData = await fs.readFile(path.join(jsonDir, 'domains.json'), 'utf-8');
    const domains = JSON.parse(domainsData) as Record<string, DomainInfo>;
    
    // Insert domains
    for (const [id, domain] of Object.entries(domains)) {
        await db.run(
            'INSERT INTO DOMAINS (id, name, description, created, lastAccess) VALUES (?, ?, ?, ?, ?)',
            [id, domain.name, domain.description, domain.created, domain.lastAccess]
        );
        
        // Read domain memory file
        const memoryFile = path.join(jsonDir, 'memories', `${id}.json`);
        const memoryData = await fs.readFile(memoryFile, 'utf-8');
        const memory = JSON.parse(memoryData) as { nodes: Record<string, MemoryNode>, edges: GraphEdge[] };
        
        // Insert nodes
        for (const [nodeId, node] of Object.entries(memory.nodes)) {
            await db.run(
                'INSERT INTO MEMORY_NODES (id, domain, content, timestamp, path) VALUES (?, ?, ?, ?, ?)',
                [nodeId, id, node.content, node.timestamp, node.path || '/']
            );
            
            // Insert tags
            if (node.tags) {
                for (const tag of node.tags) {
                    await db.run(
                        'INSERT INTO MEMORY_TAGS (nodeId, tag) VALUES (?, ?)',
                        [nodeId, tag]
                    );
                }
            }
            
            // Insert domain references
            if (node.domainRefs) {
                for (const ref of node.domainRefs) {
                    await db.run(
                        'INSERT INTO DOMAIN_REFS (nodeId, domain, targetDomain, targetNodeId, description, bidirectional) VALUES (?, ?, ?, ?, ?, ?)',
                        [nodeId, id, ref.domain, ref.nodeId, ref.description || null, ref.bidirectional ? 1 : 0]
                    );
                }
            }
        }
        
        // Insert edges
        for (const edge of memory.edges) {
            await db.run(
                'INSERT INTO MEMORY_EDGES (id, source, target, type, strength, timestamp, domain) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [edge.source + '-' + edge.target + '-' + edge.type, edge.source, edge.target, edge.type, edge.strength, edge.timestamp, id]
            );
        }
    }
    
    // Read persistence.json
    const persistenceData = await fs.readFile(path.join(jsonDir, 'persistence.json'), 'utf-8');
    const persistence = JSON.parse(persistenceData) as PersistenceState;
    
    // Insert persistence
    await db.run(
        'INSERT INTO PERSISTENCE (id, currentDomain, lastAccess, lastMemoryId) VALUES (?, ?, ?, ?)',
        [1, persistence.currentDomain, persistence.lastAccess, persistence.lastMemoryId || null]
    );
    
    await db.close();
    console.log(`Conversion complete. SQLite database created at ${sqliteFile}`);
}

async function convertSqliteToJson(sqliteFile: string, jsonDir: string): Promise<void> {
    // Implementation for converting from SQLite to JSON
    // ...
}

async function createSchema(db: any): Promise<void> {
    // Create tables, indexes, and triggers as defined in the schema
    // ...
}

// Example usage
// convertJsonToSqlite('/path/to/json/data', '/path/to/sqlite/database.db');
// convertSqliteToJson('/path/to/sqlite/database.db', '/path/to/json/data');
```

## 9. Implementation Plan

1. **Phase 1: Storage Interface**
   - Create the abstract `MemoryStorage` interface
   - Implement the JSON storage class
   - Refactor `MemoryGraph` to use the storage interface

2. **Phase 2: SQLite Implementation**
   - Implement the SQLite schema
   - Create the SQLite storage class
   - Add the storage factory

3. **Phase 3: Full-Text Search**
   - Implement the FTS virtual table and triggers
   - Add the search content method to the storage interface
   - Create the search memory content MCP tool

4. **Phase 4: Converter Utility**
   - Implement the JSON to SQLite converter
   - Implement the SQLite to JSON converter
   - Add command-line interface for the converter

5. **Phase 5: Testing and Documentation**
   - Write unit tests for all components
   - Update documentation
   - Create examples

## 10. Conclusion

The SQLite storage implementation will provide a more efficient and scalable alternative to the current JSON file-based storage system. It will maintain compatibility with the existing memory graph architecture while adding new capabilities like full-text search. The abstract storage interface will allow easy switching between storage backends, and the converter utility will facilitate migration between them.
