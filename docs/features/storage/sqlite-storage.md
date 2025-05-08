# SQLite Storage

SQLite storage provides a more efficient database backend for Memory Graph MCP, using a single SQLite file to store all memory data.

## Overview

SQLite storage offers several advantages over JSON storage:
- Better performance for large memory sets
- Full-text search capabilities
- More efficient memory usage
- Single file for all domains
- Supports complex queries and filters

## Database Structure

When using SQLite storage, the following database tables are created:

```
DOMAINS           # List of all domains and metadata
PERSISTENCE       # Session state tracking
MEMORY_NODES      # Memory node data
MEMORY_TAGS       # Many-to-many relationship for tags
MEMORY_EDGES      # Relationships between memories
DOMAIN_REFS       # Cross-domain references
memory_content_fts  # Full-text search virtual table
```

### Table Schemas

#### DOMAINS

```sql
CREATE TABLE DOMAINS (
    id TEXT PRIMARY KEY,              -- Unique domain identifier
    name TEXT NOT NULL,               -- Human-readable name
    description TEXT,                 -- Purpose/scope of the domain
    created TEXT NOT NULL,            -- ISO timestamp
    lastAccess TEXT NOT NULL          -- ISO timestamp
);
```

#### PERSISTENCE

```sql
CREATE TABLE PERSISTENCE (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Enforces single row
    currentDomain TEXT NOT NULL,           -- Currently active domain
    lastAccess TEXT NOT NULL,              -- ISO timestamp
    lastMemoryId TEXT,                     -- Most recently created memory (optional)
    FOREIGN KEY (currentDomain) REFERENCES DOMAINS(id)
);
```

#### MEMORY_NODES

```sql
CREATE TABLE MEMORY_NODES (
    id TEXT PRIMARY KEY,          -- Unique memory identifier
    domain TEXT NOT NULL,         -- Domain this memory belongs to
    content TEXT NOT NULL,        -- Main memory content
    timestamp TEXT NOT NULL,      -- ISO timestamp of creation
    path TEXT DEFAULT '/',        -- Organizational path
    content_summary TEXT,         -- Optional summary of the content
    summary_timestamp TEXT,       -- When the summary was last updated
    FOREIGN KEY (domain) REFERENCES DOMAINS(id)
);
```

#### MEMORY_TAGS

```sql
CREATE TABLE MEMORY_TAGS (
    nodeId TEXT NOT NULL,         -- Memory node ID
    tag TEXT NOT NULL,            -- Tag value
    PRIMARY KEY (nodeId, tag),    -- Prevents duplicate tags
    FOREIGN KEY (nodeId) REFERENCES MEMORY_NODES(id) ON DELETE CASCADE
);
```

#### MEMORY_EDGES

```sql
CREATE TABLE MEMORY_EDGES (
    id TEXT PRIMARY KEY,          -- Composite edge ID (source-target-type)
    source TEXT NOT NULL,         -- Source memory node ID
    target TEXT NOT NULL,         -- Target memory node ID
    type TEXT NOT NULL,           -- Relationship type
    strength REAL NOT NULL CHECK (strength >= 0 AND strength <= 1), -- Relationship strength (0-1)
    timestamp TEXT NOT NULL,      -- ISO timestamp
    domain TEXT NOT NULL,         -- Domain this edge belongs to
    FOREIGN KEY (source) REFERENCES MEMORY_NODES(id) ON DELETE CASCADE,
    FOREIGN KEY (target) REFERENCES MEMORY_NODES(id) ON DELETE CASCADE,
    FOREIGN KEY (domain) REFERENCES DOMAINS(id)
);
```

#### DOMAIN_REFS

```sql
CREATE TABLE DOMAIN_REFS (
    nodeId TEXT NOT NULL,         -- Source memory node ID
    domain TEXT NOT NULL,         -- Source domain
    targetDomain TEXT NOT NULL,   -- Target domain
    targetNodeId TEXT NOT NULL,   -- Target memory node ID
    description TEXT,             -- Optional reference description
    bidirectional INTEGER NOT NULL DEFAULT 0, -- 0=one-way, 1=bidirectional
    PRIMARY KEY (nodeId, targetDomain, targetNodeId), -- Prevents duplicates
    FOREIGN KEY (nodeId) REFERENCES MEMORY_NODES(id) ON DELETE CASCADE,
    FOREIGN KEY (domain) REFERENCES DOMAINS(id),
    FOREIGN KEY (targetDomain) REFERENCES DOMAINS(id)
);
```

### Full-Text Search

SQLite storage uses the FTS5 extension for full-text search capabilities:

```sql
-- Full-text search virtual table
CREATE VIRTUAL TABLE memory_content_fts USING fts5(
    id,              -- Memory ID
    content,         -- Memory content
    content_summary, -- Memory summary
    path,            -- Organization path
    tags,            -- Concatenated tags for searching
    domain,          -- Domain ID
    tokenize="porter unicode61"  -- Use Porter stemming algorithm
);
```

Triggers keep the FTS index in sync with changes to the main tables:

```sql
-- Insert trigger for memory nodes
CREATE TRIGGER memory_nodes_ai AFTER INSERT ON MEMORY_NODES BEGIN
    INSERT INTO memory_content_fts(id, content, content_summary, path, domain)
    VALUES (new.id, new.content, new.content_summary, new.path, new.domain);
END;

-- Update trigger for memory nodes
CREATE TRIGGER memory_nodes_au AFTER UPDATE ON MEMORY_NODES BEGIN
    DELETE FROM memory_content_fts WHERE id = old.id;
    INSERT INTO memory_content_fts(id, content, content_summary, path, domain)
    VALUES (new.id, new.content, new.content_summary, new.path, new.domain);
END;

-- Delete trigger for memory nodes
CREATE TRIGGER memory_nodes_ad AFTER DELETE ON MEMORY_NODES BEGIN
    DELETE FROM memory_content_fts WHERE id = old.id;
END;

-- Insert trigger for memory tags
CREATE TRIGGER memory_tags_ai AFTER INSERT ON MEMORY_TAGS BEGIN
    UPDATE memory_content_fts 
    SET tags = (SELECT group_concat(tag, ' ') FROM MEMORY_TAGS WHERE nodeId = new.nodeId)
    WHERE id = new.nodeId;
END;

-- Delete trigger for memory tags
CREATE TRIGGER memory_tags_ad AFTER DELETE ON MEMORY_TAGS BEGIN
    UPDATE memory_content_fts 
    SET tags = (SELECT group_concat(tag, ' ') FROM MEMORY_TAGS WHERE nodeId = old.nodeId)
    WHERE id = old.nodeId;
END;
```

## Configuration

To use SQLite storage, set the `STORAGE_TYPE` environment variable:

```bash
STORAGE_TYPE=sqlite
```

Additional configuration options:

```bash
# Directory where the SQLite database will be stored
MEMORY_DIR=/path/to/memory/directory
```

The database file will be created at:
```
/path/to/memory/directory/memory-graph.db
```

## Advantages

- **Performance**: Better query performance than JSON storage
- **Full-Text Search**: Advanced search capabilities using FTS5
- **Memory Efficiency**: Loads only necessary data, not entire domains
- **Single File**: All domains in one database file
- **Transactions**: ACID compliance for data integrity
- **Indexes**: Optimized data access with database indexes

## Limitations

- **Inspection**: Requires SQL tools to inspect data
- **Concurrency**: Limited concurrent write operations
- **Deployment**: Not ideal for high-load production environments
- **Dependencies**: Requires SQLite compilation with FTS5 support

## When to Use SQLite Storage

SQLite storage is ideal for:
- Medium-sized deployments
- Personal or single-user applications
- Systems with lots of memory nodes
- Use cases requiring full-text search
- Local applications without database server

## Implementation Details

The SQLite storage implementation is handled by the `SqliteMemoryStorage` class. Key operations:

- **Database Initialization**: Tables, indexes, and triggers are created automatically
- **Transactions**: Used for multi-step operations for data integrity
- **Query Building**: Parameterized queries prevent SQL injection
- **Connection Management**: Single connection with proper closing

## Full-Text Search Features

The SQLite FTS5 implementation provides:

- **Word Stemming**: "running" matches "run", etc.
- **Unicode Support**: Proper handling of international text
- **Phrase Searches**: Match exact phrases in content
- **Relevance Ranking**: Results ordered by relevance
- **Content + Tags**: Search both content and tags

Example search query:

```sql
SELECT m.* FROM MEMORY_NODES m
JOIN memory_content_fts fts ON m.id = fts.id
WHERE memory_content_fts MATCH ?
AND m.domain = ?
ORDER BY rank
LIMIT ?
```

## Testing with SQLite Storage

For testing with SQLite storage:

```typescript
// In your test setup
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'memory-test-'));
const graph = new MemoryGraph({ 
  storageDir: tempDir, 
  storageType: 'sqlite' 
});
await graph.initialize();

// Run your tests...

// Cleanup
await fs.rm(tempDir, { recursive: true, force: true });
```

## Converting To/From SQLite Storage

To convert between storage types:

```bash
# Convert from JSON to SQLite
npx ts-node scripts/convert-storage.ts json2sqlite /path/to/json/data /path/to/sqlite/file.db

# Convert from SQLite to JSON
npx ts-node scripts/convert-storage.ts sqlite2json /path/to/sqlite/file.db /path/to/json/data

# Convert from SQLite to MariaDB
npx ts-node scripts/convert-storage.ts sqlite2mariadb /path/to/sqlite/file.db "mariadb://user:password@localhost:3306/memory_graph"
```

For more details on conversion, see [Converting Between Storage Types](converting.md).