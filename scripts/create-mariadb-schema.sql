-- MariaDB Schema for Memory Graph MCP
-- Compatible with the SQLite implementation

-- Enable foreign key constraints
SET FOREIGN_KEY_CHECKS=1;

-- Create tables
-- Domains table
CREATE TABLE IF NOT EXISTS DOMAINS (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created VARCHAR(30) NOT NULL,
    lastAccess VARCHAR(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Persistence state table (single row)
CREATE TABLE IF NOT EXISTS PERSISTENCE (
    id INT PRIMARY KEY CHECK (id = 1),
    currentDomain VARCHAR(36) NOT NULL,
    lastAccess VARCHAR(30) NOT NULL,
    lastMemoryId VARCHAR(36),
    FOREIGN KEY (currentDomain) REFERENCES DOMAINS(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Memory nodes table
CREATE TABLE IF NOT EXISTS MEMORY_NODES (
    id VARCHAR(36) PRIMARY KEY,
    domain VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    timestamp VARCHAR(30) NOT NULL,
    path VARCHAR(255) DEFAULT '/',
    content_summary TEXT,
    summary_timestamp VARCHAR(30),
    FOREIGN KEY (domain) REFERENCES DOMAINS(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Memory tags table (many-to-many)
CREATE TABLE IF NOT EXISTS MEMORY_TAGS (
    nodeId VARCHAR(36) NOT NULL,
    tag VARCHAR(255) NOT NULL,
    PRIMARY KEY (nodeId, tag),
    FOREIGN KEY (nodeId) REFERENCES MEMORY_NODES(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Memory edges table
CREATE TABLE IF NOT EXISTS MEMORY_EDGES (
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

-- Domain references table
CREATE TABLE IF NOT EXISTS DOMAIN_REFS (
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

-- Full-text search indexes
-- MariaDB uses FULLTEXT indexes instead of FTS5 virtual tables
ALTER TABLE MEMORY_NODES ADD FULLTEXT INDEX ft_memory_content (content, content_summary);

-- Create concatenated tags function and view for searching
DELIMITER //
CREATE OR REPLACE FUNCTION get_node_tags(node_id VARCHAR(36)) 
RETURNS TEXT
DETERMINISTIC
BEGIN
  DECLARE result TEXT;
  SELECT GROUP_CONCAT(tag SEPARATOR ' ') INTO result FROM MEMORY_TAGS WHERE nodeId = node_id;
  RETURN result;
END //
DELIMITER ;

-- Create a view that combines memory node content with tags for full-text searching
CREATE OR REPLACE VIEW memory_content_search AS
SELECT 
    m.id,
    m.content,
    m.content_summary,
    m.path,
    m.domain,
    get_node_tags(m.id) AS tags
FROM MEMORY_NODES m;

-- Add FULLTEXT index to the view if your MariaDB version supports indexing views
-- If not supported, you'll need to use JOINs in your queries
-- ALTER TABLE memory_content_search ADD FULLTEXT INDEX ft_memory_content_full (content, content_summary, tags);

-- Create triggers to maintain the concatenated tags in the full-text index
DELIMITER //

-- Insert trigger for memory nodes (not needed in MariaDB as the view handles this)

-- Update trigger for memory tags (not needed in MariaDB as the function handles this)

-- NOTE: In MariaDB, the view and function will automatically update with the underlying table changes
-- so explicit triggers to update FTS indexes like in SQLite are not needed

DELIMITER ;

-- Additional MariaDB-specific optimizations
-- Set the transaction isolation level for better performance
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- Optional: Optimize for memory usage if run on a server with sufficient RAM
-- SET GLOBAL innodb_buffer_pool_size = 1G; -- Adjust based on available RAM

-- Set character set and collation explicitly
SET NAMES utf8mb4;
SET SESSION character_set_client = utf8mb4;
SET SESSION character_set_connection = utf8mb4;
SET SESSION character_set_results = utf8mb4;
SET SESSION collation_connection = utf8mb4_unicode_ci;