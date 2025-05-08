# MariaDB Storage

MariaDB storage provides a robust, production-ready database backend for Memory Graph MCP, using a MariaDB server to store memory data with support for high concurrency and better scalability.

## Overview

MariaDB storage offers several advantages for production deployments:
- Client-server architecture for multi-user access
- Connection pooling for high performance
- Full-text search capabilities
- Better handling of concurrent operations
- Suitable for large-scale deployments

## Database Structure

The MariaDB schema uses the same general structure as SQLite, but with MariaDB-specific optimizations:

```
DOMAINS           # List of all domains and metadata
PERSISTENCE       # Session state tracking
MEMORY_NODES      # Memory node data
MEMORY_TAGS       # Many-to-many relationship for tags
MEMORY_EDGES      # Relationships between memories
DOMAIN_REFS       # Cross-domain references
```

### Table Schemas

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

### Full-Text Search

MariaDB implements full-text search differently than SQLite, using FULLTEXT indexes:

```sql
-- Full-text search index on content and summary
ALTER TABLE MEMORY_NODES ADD FULLTEXT INDEX ft_memory_content (content, content_summary);
```

For tag-inclusive searching, a custom function and search view are created:

```sql
-- Function to concatenate tags for a node
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

-- View for combined content and tag searching
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

## Configuration

To use MariaDB storage, set the appropriate environment variables:

```bash
# Select MariaDB storage
STORAGE_TYPE=mariadb

# MariaDB connection configuration
MARIADB_HOST=localhost
MARIADB_PORT=3306
MARIADB_USER=memory_user
MARIADB_PASSWORD=secure_password
MARIADB_DATABASE=memory_graph
MARIADB_CONNECTION_LIMIT=10
```

## Advantages

- **Scalability**: Better handling of large datasets
- **Concurrency**: Multiple concurrent connections supported
- **Performance**: Optimized for high-load scenarios
- **Full-Text Search**: Advanced search capabilities
- **Connection Pooling**: Efficient connection management
- **Reliability**: Production-ready database system
- **Backup**: Standard database backup procedures

## Limitations

- **Complexity**: Requires separate database server
- **Setup**: More complex initial configuration
- **Dependencies**: Requires MariaDB server installation
- **Maintenance**: Requires database administration
- **Resources**: Higher system resource requirements

## When to Use MariaDB Storage

MariaDB storage is ideal for:
- Production deployments
- Multi-user environments
- High-load scenarios
- Large memory datasets
- Systems requiring high reliability
- Deployments with concurrency requirements

## Implementation Details

The MariaDB storage implementation is handled by the `MariaDbMemoryStorage` class. Key features:

- **Connection Pooling**: Uses connection pool for efficient resource usage
- **Query Building**: Parameterized queries prevent SQL injection
- **Transaction Support**: ACID compliance for data integrity
- **Error Handling**: Robust error handling and connection recovery
- **Unicode Support**: Full UTF-8 support with utf8mb4 charset

## Connection Pooling

MariaDB storage uses connection pooling for better performance:

```typescript
this.pool = createPool({
  host: config.host || 'localhost',
  port: config.port || 3306,
  user: config.user || 'root',
  password: config.password || '',
  database: config.database || 'memory_graph',
  waitForConnections: true,
  connectionLimit: config.connectionLimit || 10,
  queueLimit: 0
});
```

Connection usage follows best practices:

```typescript
async getConnection(): Promise<PoolConnection> {
  try {
    return await this.pool.getConnection();
  } catch (error) {
    console.error('Error getting database connection:', error);
    throw new Error(`Failed to get database connection: ${error.message}`);
  }
}

// Example usage
async searchContent(query: string, domain?: string, maxResults: number = 20): Promise<MemoryNode[]> {
  const conn = await this.getConnection();
  
  try {
    // Perform database operations...
    
    return results;
  } finally {
    conn.release(); // Always release the connection
  }
}
```

## Full-Text Search Features

MariaDB full-text search provides:

- **Natural Language Mode**: Default ranking by relevance
- **Boolean Mode**: Advanced search with operators
- **Phrase Matching**: Match exact phrases in content
- **Relevance Ranking**: Results ordered by relevance score
- **Wildcards**: Partial word matching with wildcards

Example search query:

```sql
-- Basic search on memory content
SELECT m.* FROM MEMORY_NODES m
WHERE MATCH(m.content, m.content_summary) AGAINST(? IN NATURAL LANGUAGE MODE)
AND m.domain = ?
LIMIT ?
```

## Database Setup

### Database Initialization

To create a new MariaDB database for the Memory Graph:

```sql
-- Create database
CREATE DATABASE memory_graph CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user
CREATE USER 'memory_user'@'localhost' IDENTIFIED BY 'secure_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON memory_graph.* TO 'memory_user'@'localhost';
FLUSH PRIVILEGES;
```

### Docker Setup

For Docker deployments with MariaDB:

```bash
# Run MariaDB container
docker run -d --name memory-mariadb \
  -e MYSQL_ROOT_PASSWORD=root_password \
  -e MYSQL_DATABASE=memory_graph \
  -e MYSQL_USER=memory_user \
  -e MYSQL_PASSWORD=secure_password \
  -p 3306:3306 \
  mariadb:latest

# Run Memory Graph with MariaDB connection
docker run -v /path/to/data:/app/data \
  --network=host \
  -e MEMORY_DIR=/app/data \
  -e STORAGE_TYPE=mariadb \
  -e MARIADB_HOST=localhost \
  -e MARIADB_PORT=3306 \
  -e MARIADB_USER=memory_user \
  -e MARIADB_PASSWORD=secure_password \
  -e MARIADB_DATABASE=memory_graph \
  ghcr.io/aaronsb/memory-graph:latest
```

## Performance Considerations

For optimal performance with MariaDB:

1. **InnoDB Buffer Pool**: Configure appropriate buffer pool size
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

3. **Connection Limits**: Adjust connection pool size based on workload
   ```
   MARIADB_CONNECTION_LIMIT=20  # Increase for higher concurrency
   ```

## Converting To/From MariaDB Storage

To convert between storage types:

```bash
# Convert from JSON to MariaDB
npx ts-node scripts/convert-storage.ts json2mariadb /path/to/json/data "mariadb://user:password@localhost:3306/memory_graph"

# Convert from SQLite to MariaDB
npx ts-node scripts/convert-storage.ts sqlite2mariadb /path/to/sqlite/file.db "mariadb://user:password@localhost:3306/memory_graph"

# Convert from MariaDB to JSON
npx ts-node scripts/convert-storage.ts mariadb2json "mariadb://user:password@localhost:3306/memory_graph" /path/to/json/data

# Convert from MariaDB to SQLite
npx ts-node scripts/convert-storage.ts mariadb2sqlite "mariadb://user:password@localhost:3306/memory_graph" /path/to/sqlite/file.db
```

For more details on conversion, see [Converting Between Storage Types](converting.md).