# Memory Graph Database Schemas

This document provides comprehensive documentation for the database schemas used by Memory Graph MCP. It covers both SQLite and MariaDB implementations, providing a complete reference for developers working with the database backends.

## Table of Contents

1. [Introduction](#introduction)
2. [Common Database Concepts](#common-database-concepts)
3. [SQLite Implementation](#sqlite-implementation)
4. [MariaDB Implementation](#mariadb-implementation)
5. [Full-Text Search](#full-text-search)
6. [Data Formats and Conventions](#data-formats-and-conventions)
7. [Implementation Notes](#implementation-notes)

## Introduction

The Memory Graph MCP supports multiple storage backends, including JSON file-based storage, SQLite, and MariaDB. The SQL-based backends (SQLite and MariaDB) share a common schema design but with implementation-specific variations to leverage the unique features of each database system.

This document focuses on the database schemas for:

- **SQLite**: A file-based relational database, ideal for single-user deployments
- **MariaDB**: A client-server relational database, suitable for multi-user and production deployments

Both implementations support the same core functionality, including:

- Domain-based memory organization
- Memory node storage with tags and metadata
- Relationship tracking between memories
- Cross-domain references
- Full-text search capabilities

## Common Database Concepts

### Core Data Model

The database schema revolves around these key components:

1. **Domains**: Isolated contexts for organizing memories
2. **Memory Nodes**: Individual memories with content and metadata
3. **Edges**: Relationships between memory nodes
4. **Tags**: Categorization labels for memories
5. **Domain References**: Cross-domain connections between memories

### Core Tables

Both SQLite and MariaDB implementations include these tables:

- `DOMAINS`: Stores domain metadata
- `PERSISTENCE`: Tracks system state
- `MEMORY_NODES`: Stores memory content and metadata
- `MEMORY_TAGS`: Many-to-many relationship for memory tags
- `MEMORY_EDGES`: Stores relationships between memories
- `DOMAIN_REFS`: Tracks cross-domain references

## SQLite Implementation

### Table Definitions

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

### SQLite Indexes

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

### SQLite Full-Text Search

SQLite uses the FTS5 extension for full-text search:

```sql
-- Enable FTS5 extension for full-text search
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

### SQLite Triggers

```sql
-- Insert trigger for memory nodes
CREATE TRIGGER memory_nodes_ai AFTER INSERT ON MEMORY_NODES BEGIN
    INSERT INTO memory_content_fts(id, content, content_summary, path, domain)
    VALUES (new.id, new.content, new.content_summary, new.path, new.domain);
END;

-- Delete trigger for memory nodes
CREATE TRIGGER memory_nodes_ad AFTER DELETE ON MEMORY_NODES BEGIN
    DELETE FROM memory_content_fts WHERE id = old.id;
END;

-- Update trigger for memory nodes
CREATE TRIGGER memory_nodes_au AFTER UPDATE ON MEMORY_NODES BEGIN
    DELETE FROM memory_content_fts WHERE id = old.id;
    INSERT INTO memory_content_fts(id, content, content_summary, path, domain)
    VALUES (new.id, new.content, new.content_summary, new.path, new.domain);
END;

-- Insert trigger for memory tags (to update FTS index)
CREATE TRIGGER memory_tags_ai AFTER INSERT ON MEMORY_TAGS BEGIN
    UPDATE memory_content_fts 
    SET tags = (SELECT group_concat(tag, ' ') FROM MEMORY_TAGS WHERE nodeId = new.nodeId)
    WHERE id = new.nodeId;
END;

-- Delete trigger for memory tags (to update FTS index)
CREATE TRIGGER memory_tags_ad AFTER DELETE ON MEMORY_TAGS BEGIN
    UPDATE memory_content_fts 
    SET tags = (SELECT group_concat(tag, ' ') FROM MEMORY_TAGS WHERE nodeId = old.nodeId)
    WHERE id = old.nodeId;
END;
```

## MariaDB Implementation

### Key Differences from SQLite

When implementing the Memory Graph schema in MariaDB, there are several important differences from the SQLite version:

1. **Full-Text Search**: MariaDB uses `FULLTEXT` indexes instead of SQLite's FTS5 virtual tables
2. **Custom Functions**: MariaDB requires a custom function to concatenate tags for searching
3. **View-Based Search**: A view is used to facilitate searching across content and tags
4. **Data Types**: More specific data types are used (VARCHAR instead of TEXT for fixed-length fields)
5. **Boolean Values**: MariaDB uses BOOLEAN type instead of INTEGER for boolean flags

### Table Definitions

#### DOMAINS

```sql
CREATE TABLE DOMAINS (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created VARCHAR(30) NOT NULL,
    lastAccess VARCHAR(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### PERSISTENCE

```sql
CREATE TABLE PERSISTENCE (
    id INT PRIMARY KEY CHECK (id = 1),
    currentDomain VARCHAR(36) NOT NULL,
    lastAccess VARCHAR(30) NOT NULL,
    lastMemoryId VARCHAR(36),
    FOREIGN KEY (currentDomain) REFERENCES DOMAINS(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### MEMORY_NODES

```sql
CREATE TABLE MEMORY_NODES (
    id VARCHAR(36) PRIMARY KEY,
    domain VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    timestamp VARCHAR(30) NOT NULL,
    path VARCHAR(255) DEFAULT '/',
    content_summary TEXT,
    summary_timestamp VARCHAR(30),
    FOREIGN KEY (domain) REFERENCES DOMAINS(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### MEMORY_TAGS

```sql
CREATE TABLE MEMORY_TAGS (
    nodeId VARCHAR(36) NOT NULL,
    tag VARCHAR(255) NOT NULL,
    PRIMARY KEY (nodeId, tag),
    FOREIGN KEY (nodeId) REFERENCES MEMORY_NODES(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### MEMORY_EDGES

```sql
CREATE TABLE MEMORY_EDGES (
    id VARCHAR(255) PRIMARY KEY,
    source VARCHAR(36) NOT NULL,
    target VARCHAR(36) NOT NULL,
    type VARCHAR(255) NOT NULL,
    strength DECIMAL(3,2) NOT NULL CHECK (strength >= 0 AND strength <= 1),
    timestamp VARCHAR(30) NOT NULL,
    domain VARCHAR(36) NOT NULL,
    FOREIGN KEY (source) REFERENCES MEMORY_NODES(id) ON DELETE CASCADE,
    FOREIGN KEY (target) REFERENCES MEMORY_NODES(id) ON DELETE CASCADE,
    FOREIGN KEY (domain) REFERENCES DOMAINS(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### DOMAIN_REFS

```sql
CREATE TABLE DOMAIN_REFS (
    nodeId VARCHAR(36) NOT NULL,
    domain VARCHAR(36) NOT NULL,
    targetDomain VARCHAR(36) NOT NULL,
    targetNodeId VARCHAR(36) NOT NULL,
    description TEXT,
    bidirectional BOOLEAN NOT NULL DEFAULT 0,
    PRIMARY KEY (nodeId, targetDomain, targetNodeId),
    FOREIGN KEY (nodeId) REFERENCES MEMORY_NODES(id) ON DELETE CASCADE,
    FOREIGN KEY (domain) REFERENCES DOMAINS(id),
    FOREIGN KEY (targetDomain) REFERENCES DOMAINS(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### MariaDB Indexes

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

### MariaDB Full-Text Search

MariaDB implements full-text search differently than SQLite. Instead of FTS5 virtual tables, MariaDB uses `FULLTEXT` indexes:

```sql
-- Full-text search index on content and summary
ALTER TABLE MEMORY_NODES ADD FULLTEXT INDEX ft_memory_content (content, content_summary);
```

### Custom Function for Tag Concatenation

```sql
DELIMITER //
CREATE FUNCTION get_node_tags(node_id VARCHAR(36)) 
RETURNS TEXT
DETERMINISTIC
BEGIN
  DECLARE result TEXT;
  SELECT GROUP_CONCAT(tag SEPARATOR ' ') INTO result FROM MEMORY_TAGS WHERE nodeId = node_id;
  RETURN result;
END //
DELIMITER ;
```

### Search View

```sql
CREATE VIEW memory_content_search AS
SELECT 
    m.id,
    m.content,
    m.content_summary,
    m.path,
    m.domain,
    get_node_tags(m.id) AS tags
FROM MEMORY_NODES m;
```

## Full-Text Search

Both SQLite and MariaDB implementations support full-text search, but with different approaches:

### SQLite FTS5

SQLite uses the FTS5 virtual table extension with Porter stemming and unicode61 tokenizer, providing:

- Word stemming (e.g., "running" matches "run")
- Unicode support for international text
- Fast token-based matching
- Support for phrase queries and fuzzy matching

Example query:

```sql
SELECT m.* FROM MEMORY_NODES m
JOIN memory_content_fts fts ON m.id = fts.id
WHERE memory_content_fts MATCH ?;
```

### MariaDB FULLTEXT

MariaDB uses built-in FULLTEXT indexes with the following capabilities:

- Natural language mode for relevance-based matching
- Boolean mode for more complex queries
- Support for stopwords and stemming with specific configurations
- Unicode support with utf8mb4 character set

Example queries:

```sql
-- Basic search on memory content
SELECT m.* FROM MEMORY_NODES m
WHERE MATCH(m.content, m.content_summary) AGAINST('search term' IN NATURAL LANGUAGE MODE);

-- Search with tags using the view
SELECT * FROM memory_content_search 
WHERE MATCH(content, content_summary, tags) AGAINST('search term' IN NATURAL LANGUAGE MODE);
```

## Data Formats and Conventions

### Timestamps

All timestamps in both database systems should be stored in ISO 8601 format (e.g., `2023-04-15T10:30:45.123Z`).

### IDs

- **Domain IDs**: Typically UUIDs as text strings
- **Memory node IDs**: Typically UUIDs as text strings
- **Edge IDs**: Composite ID formed by combining `source-target-type`

### Strength Values

Relationship strength is stored as a decimal value between 0.0 and 1.0, where higher values indicate stronger connections.

## Implementation Notes

### SQLite Considerations

1. **Foreign Keys**: Must be explicitly enabled with `PRAGMA foreign_keys = ON;`
2. **FTS5 Requirement**: SQLite must be compiled with FTS5 extension support
3. **Transactions**: Important for multiple related changes to maintain integrity
4. **Concurrency**: Limited support for concurrent access

### MariaDB Considerations

1. **InnoDB Buffer Pool**: Configure appropriate buffer pool size for your server
   ```sql
   SET GLOBAL innodb_buffer_pool_size = 1G; -- Adjust based on available RAM
   ```

2. **Character Set**: Use utf8mb4 charset and collation for proper Unicode support
   ```sql
   SET NAMES utf8mb4;
   SET SESSION character_set_client = utf8mb4;
   SET SESSION character_set_connection = utf8mb4;
   SET SESSION character_set_results = utf8mb4;
   SET SESSION collation_connection = utf8mb4_unicode_ci;
   ```

3. **Transaction Isolation**: Consider the appropriate isolation level for your use case
   ```sql
   SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
   ```

4. **Connection Pooling**: The MariaDB implementation uses connection pooling for better performance with multiple concurrent users

### Common Implementation Patterns

Both implementations follow these patterns:

1. **Abstract Storage Interface**: Both storage backends implement the `MemoryStorage` interface
2. **Domain Isolation**: Each domain's data is logically separated
3. **Relationship Traversal**: Graph edges are stored with source, target, and type
4. **Tag Management**: Many-to-many relationship between nodes and tags
5. **Cross-Domain References**: Explicit references between domains maintain isolation

## Creating Compatible Databases

### SQLite Initialization

```bash
# Create SQLite database
sqlite3 memory-graph.db < scripts/create-sqlite-schema.sql
```

### MariaDB Initialization

```bash
# Create MariaDB database
mysql -u username -p < scripts/create-mariadb-schema.sql
```

Or use the provided script:

```bash
# Create and initialize the MariaDB database
node scripts/create-mariadb-db.js
```

When creating new schema implementations, ensure these key points are maintained:

1. Table structure should match the defined schema
2. Foreign key relationships must be preserved
3. Indexing should be implemented for performance
4. Full-text search capability should be implemented
5. Triggers or equivalents should be used to maintain data integrity