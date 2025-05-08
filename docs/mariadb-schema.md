# Memory Graph MariaDB Schema Documentation

This document provides a complete reference for implementing the Memory Graph MCP schema in MariaDB. This schema can be used to create a compatible database for use with the MCP server or to build alternative tools that interact with Memory Graph data.

## Schema Overview

The Memory Graph database can be implemented in MariaDB with the following key components:

1. **Core Tables**: For storing domains, memories, relationships, and state
2. **Many-to-Many Relationship Tables**: For tags and cross-domain references
3. **Full-Text Search**: Using MariaDB's FULLTEXT indexes instead of SQLite's FTS5
4. **Indexes and Functions**: For performance and data integrity

## Key Differences from SQLite

When implementing the Memory Graph schema in MariaDB, there are several important differences from the SQLite version:

1. **Full-Text Search**: MariaDB uses `FULLTEXT` indexes instead of SQLite's FTS5 virtual tables
2. **Custom Functions**: MariaDB requires a custom function to concatenate tags for searching
3. **View-Based Search**: A view is used to facilitate searching across content and tags
4. **Data Types**: More specific data types are used (VARCHAR instead of TEXT for fixed-length fields)
5. **Boolean Values**: MariaDB uses BOOLEAN type instead of INTEGER for boolean flags

## Table Definitions

### DOMAINS

Stores information about memory domains (isolated memory contexts).

```sql
CREATE TABLE DOMAINS (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created VARCHAR(30) NOT NULL,
    lastAccess VARCHAR(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### PERSISTENCE

Single-row table storing the system's current state. Only one row with `id = 1` should exist.

```sql
CREATE TABLE PERSISTENCE (
    id INT PRIMARY KEY CHECK (id = 1),
    currentDomain VARCHAR(36) NOT NULL,
    lastAccess VARCHAR(30) NOT NULL,
    lastMemoryId VARCHAR(36),
    FOREIGN KEY (currentDomain) REFERENCES DOMAINS(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### MEMORY_NODES

Stores individual memory nodes with their content and metadata.

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

### MEMORY_TAGS

Many-to-many relationship table for memory node tags.

```sql
CREATE TABLE MEMORY_TAGS (
    nodeId VARCHAR(36) NOT NULL,
    tag VARCHAR(255) NOT NULL,
    PRIMARY KEY (nodeId, tag),
    FOREIGN KEY (nodeId) REFERENCES MEMORY_NODES(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### MEMORY_EDGES

Stores relationships between memory nodes.

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

### DOMAIN_REFS

Many-to-many relationship table for cross-domain references.

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

## Full-Text Search Implementation

MariaDB implements full-text search differently than SQLite. Instead of FTS5 virtual tables, MariaDB uses `FULLTEXT` indexes:

```sql
-- Full-text search index on content and summary
ALTER TABLE MEMORY_NODES ADD FULLTEXT INDEX ft_memory_content (content, content_summary);
```

### Custom Function for Tag Concatenation

To support searching with tags, we create a function to concatenate tags for a node:

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

We create a view that combines the memory content with its tags for comprehensive searching:

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

## Searching Memory Content

In MariaDB, full-text searches are performed using the `MATCH AGAINST` syntax:

```sql
-- Basic search on memory content
SELECT m.* FROM MEMORY_NODES m
WHERE MATCH(m.content, m.content_summary) AGAINST('search term' IN NATURAL LANGUAGE MODE);

-- Search with tags using the view (if your MariaDB supports indexing views)
SELECT * FROM memory_content_search 
WHERE MATCH(content, content_summary, tags) AGAINST('search term' IN NATURAL LANGUAGE MODE);

-- Alternative search with tags for older MariaDB versions
SELECT m.*, get_node_tags(m.id) AS tags
FROM MEMORY_NODES m
WHERE 
    MATCH(m.content, m.content_summary) AGAINST('search term' IN NATURAL LANGUAGE MODE)
    OR get_node_tags(m.id) LIKE '%search term%';
```

## Creating a Compatible Database

To create a compatible MariaDB database from scratch, use the provided script:

```bash
# Create and initialize the MariaDB database
node scripts/create-mariadb-db.js
```

Or run the SQL script directly using the MariaDB CLI:

```bash
mysql -u username -p < scripts/create-mariadb-schema.sql
```

## Data Formats

### Timestamps

All timestamps in the database should be stored in ISO 8601 format (e.g., `2023-04-15T10:30:45.123Z`).

### IDs

- Domain IDs: Typically UUIDs as text strings (VARCHAR(36))
- Memory node IDs: Typically UUIDs as text strings (VARCHAR(36))
- Edge IDs: Composite ID formed by combining `source-target-type` (VARCHAR(255))

## Performance Considerations

For optimal performance in MariaDB:

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

## Compatibility Notes

This MariaDB schema is designed to be compatible with the Memory Graph MCP's expected data model. To ensure compatibility:

1. Keep the table structure and relationships identical to the SQLite schema
2. Ensure all queries use the appropriate syntax for MariaDB
3. Test full-text search functionality thoroughly
4. Use the provided example code for reference

## Schema Version

This schema documentation is based on Memory Graph MCP as of May 2025.