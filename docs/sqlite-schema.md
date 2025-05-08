# Memory Graph SQLite Schema Documentation

This document provides a complete reference for the SQLite database schema used by Memory Graph MCP. This schema can be independently implemented to create a compatible database for use with the MCP server or to build alternative tools that interact with Memory Graph data.

## Schema Overview

The Memory Graph database uses SQLite with the following key components:

1. **Core Tables**: For storing domains, memories, relationships, and state
2. **Many-to-Many Relationship Tables**: For tags and cross-domain references
3. **Full-Text Search**: Using SQLite's FTS5 extension for content searching
4. **Indexes and Triggers**: For performance and data integrity

## Table Definitions

### DOMAINS

Stores information about memory domains (isolated memory contexts).

```sql
CREATE TABLE DOMAINS (
    id TEXT PRIMARY KEY,              -- Unique domain identifier
    name TEXT NOT NULL,               -- Human-readable name
    description TEXT,                 -- Purpose/scope of the domain
    created TEXT NOT NULL,            -- ISO timestamp
    lastAccess TEXT NOT NULL          -- ISO timestamp
);
```

### PERSISTENCE

Single-row table storing the system's current state. Only one row with `id = 1` should exist.

```sql
CREATE TABLE PERSISTENCE (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Enforces single row
    currentDomain TEXT NOT NULL,           -- Currently active domain
    lastAccess TEXT NOT NULL,              -- ISO timestamp
    lastMemoryId TEXT,                     -- Most recently created memory (optional)
    FOREIGN KEY (currentDomain) REFERENCES DOMAINS(id)
);
```

### MEMORY_NODES

Stores individual memory nodes with their content and metadata.

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

### MEMORY_TAGS

Many-to-many relationship table for memory node tags.

```sql
CREATE TABLE MEMORY_TAGS (
    nodeId TEXT NOT NULL,         -- Memory node ID
    tag TEXT NOT NULL,            -- Tag value
    PRIMARY KEY (nodeId, tag),    -- Prevents duplicate tags
    FOREIGN KEY (nodeId) REFERENCES MEMORY_NODES(id) ON DELETE CASCADE
);
```

### MEMORY_EDGES

Stores relationships between memory nodes.

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

### DOMAIN_REFS

Many-to-many relationship table for cross-domain references.

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

## Indexes

For optimal performance, the following indexes are created:

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

## Full-Text Search

The SQLite implementation uses FTS5 for full-text search capabilities:

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

## Triggers

Triggers keep the FTS index in sync with the main tables:

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

## Creating a Compatible Database

To create a compatible SQLite database from scratch, you can use this initialization script:

```sql
-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Create tables
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
    content_summary TEXT,
    summary_timestamp TEXT,
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

-- Create indexes
-- For fast domain-based filtering
CREATE INDEX idx_memory_nodes_domain ON MEMORY_NODES(domain);

-- For fast tag lookups
CREATE INDEX idx_memory_tags_tag ON MEMORY_TAGS(tag);

-- For fast edge traversal
CREATE INDEX idx_memory_edges_source ON MEMORY_EDGES(source, domain);
CREATE INDEX idx_memory_edges_target ON MEMORY_EDGES(target, domain);

-- For fast domain reference lookups
CREATE INDEX idx_domain_refs_target ON DOMAIN_REFS(targetDomain, targetNodeId);

-- Create FTS virtual table and triggers
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

-- Triggers to keep FTS index in sync with memory nodes
CREATE TRIGGER memory_nodes_ai AFTER INSERT ON MEMORY_NODES BEGIN
    INSERT INTO memory_content_fts(id, content, content_summary, path, domain)
    VALUES (new.id, new.content, new.content_summary, new.path, new.domain);
END;

CREATE TRIGGER memory_nodes_ad AFTER DELETE ON MEMORY_NODES BEGIN
    DELETE FROM memory_content_fts WHERE id = old.id;
END;

CREATE TRIGGER memory_nodes_au AFTER UPDATE ON MEMORY_NODES BEGIN
    DELETE FROM memory_content_fts WHERE id = old.id;
    INSERT INTO memory_content_fts(id, content, content_summary, path, domain)
    VALUES (new.id, new.content, new.content_summary, new.path, new.domain);
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

## Data Formats

### Timestamps

All timestamps in the database should be stored in ISO 8601 format (e.g., `2023-04-15T10:30:45.123Z`).

### IDs

- Domain IDs: Typically UUIDs as text strings
- Memory node IDs: Typically UUIDs as text strings
- Edge IDs: Composite ID formed by combining `source-target-type`

## Using the Schema with External Tools

When using this schema with external tools or custom implementations:

1. Ensure SQLite is compiled with FTS5 extension support
2. Maintain referential integrity between tables
3. Always use transactions when making multiple related changes
4. Preserve the trigger logic for FTS updates
5. Follow the ID generation and timestamp format conventions

## Schema Version

This schema documentation is based on Memory Graph MCP as of May 2025.