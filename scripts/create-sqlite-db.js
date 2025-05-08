/**
 * Example script to create and initialize a Memory Graph SQLite database
 * This can be used independently of the main MCP server
 */

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Database file path
const DB_PATH = path.join(process.cwd(), 'memory-graph-example.db');

/**
 * Initialize the database schema
 * @param {object} db - SQLite database connection
 */
async function initializeSchema(db) {
  console.log('Creating schema...');
  
  // Create tables and indexes
  await db.exec(`
    -- Enable foreign keys
    PRAGMA foreign_keys = ON;

    -- Create tables
    -- Domains table
    CREATE TABLE IF NOT EXISTS DOMAINS (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created TEXT NOT NULL,
        lastAccess TEXT NOT NULL
    );

    -- Persistence state table (single row)
    CREATE TABLE IF NOT EXISTS PERSISTENCE (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        currentDomain TEXT NOT NULL,
        lastAccess TEXT NOT NULL,
        lastMemoryId TEXT,
        FOREIGN KEY (currentDomain) REFERENCES DOMAINS(id)
    );

    -- Memory nodes table
    CREATE TABLE IF NOT EXISTS MEMORY_NODES (
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
    CREATE TABLE IF NOT EXISTS MEMORY_TAGS (
        nodeId TEXT NOT NULL,
        tag TEXT NOT NULL,
        PRIMARY KEY (nodeId, tag),
        FOREIGN KEY (nodeId) REFERENCES MEMORY_NODES(id) ON DELETE CASCADE
    );

    -- Memory edges table
    CREATE TABLE IF NOT EXISTS MEMORY_EDGES (
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
    CREATE TABLE IF NOT EXISTS DOMAIN_REFS (
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
    CREATE INDEX IF NOT EXISTS idx_memory_nodes_domain ON MEMORY_NODES(domain);

    -- For fast tag lookups
    CREATE INDEX IF NOT EXISTS idx_memory_tags_tag ON MEMORY_TAGS(tag);

    -- For fast edge traversal
    CREATE INDEX IF NOT EXISTS idx_memory_edges_source ON MEMORY_EDGES(source, domain);
    CREATE INDEX IF NOT EXISTS idx_memory_edges_target ON MEMORY_EDGES(target, domain);

    -- For fast domain reference lookups
    CREATE INDEX IF NOT EXISTS idx_domain_refs_target ON DOMAIN_REFS(targetDomain, targetNodeId);
  `);

  // Create FTS5 table and triggers
  await db.exec(`
    -- Enable FTS5 extension for full-text search
    CREATE VIRTUAL TABLE IF NOT EXISTS memory_content_fts USING fts5(
        id,              -- Memory ID
        content,         -- Memory content
        content_summary, -- Memory summary
        path,            -- Organization path
        tags,            -- Concatenated tags for searching
        domain,          -- Domain ID
        tokenize="porter unicode61"  -- Use Porter stemming algorithm
    );

    -- Triggers to keep FTS index in sync with memory nodes
    CREATE TRIGGER IF NOT EXISTS memory_nodes_ai AFTER INSERT ON MEMORY_NODES BEGIN
        INSERT INTO memory_content_fts(id, content, content_summary, path, domain)
        VALUES (new.id, new.content, new.content_summary, new.path, new.domain);
    END;

    CREATE TRIGGER IF NOT EXISTS memory_nodes_ad AFTER DELETE ON MEMORY_NODES BEGIN
        DELETE FROM memory_content_fts WHERE id = old.id;
    END;

    CREATE TRIGGER IF NOT EXISTS memory_nodes_au AFTER UPDATE ON MEMORY_NODES BEGIN
        DELETE FROM memory_content_fts WHERE id = old.id;
        INSERT INTO memory_content_fts(id, content, content_summary, path, domain)
        VALUES (new.id, new.content, new.content_summary, new.path, new.domain);
    END;

    -- Trigger to update tags in FTS when tags are added/removed
    CREATE TRIGGER IF NOT EXISTS memory_tags_ai AFTER INSERT ON MEMORY_TAGS BEGIN
        UPDATE memory_content_fts 
        SET tags = (SELECT group_concat(tag, ' ') FROM MEMORY_TAGS WHERE nodeId = new.nodeId)
        WHERE id = new.nodeId;
    END;

    CREATE TRIGGER IF NOT EXISTS memory_tags_ad AFTER DELETE ON MEMORY_TAGS BEGIN
        UPDATE memory_content_fts 
        SET tags = (SELECT group_concat(tag, ' ') FROM MEMORY_TAGS WHERE nodeId = old.nodeId)
        WHERE id = old.nodeId;
    END;
  `);

  console.log('Schema created successfully');
}

/**
 * Create a sample domain
 * @param {object} db - SQLite database connection
 * @returns {string} - The created domain ID
 */
async function createSampleDomain(db) {
  const now = new Date().toISOString();
  const domainId = uuidv4();
  
  await db.run(
    'INSERT INTO DOMAINS (id, name, description, created, lastAccess) VALUES (?, ?, ?, ?, ?)',
    [domainId, 'Sample Domain', 'A sample domain for testing', now, now]
  );
  
  // Set as current domain in persistence state
  const persistenceExists = await db.get('SELECT 1 FROM PERSISTENCE WHERE id = 1');
  
  if (persistenceExists) {
    await db.run(
      'UPDATE PERSISTENCE SET currentDomain = ?, lastAccess = ? WHERE id = 1',
      [domainId, now]
    );
  } else {
    await db.run(
      'INSERT INTO PERSISTENCE (id, currentDomain, lastAccess) VALUES (1, ?, ?)',
      [domainId, now]
    );
  }
  
  console.log(`Created domain: ${domainId}`);
  return domainId;
}

/**
 * Add sample memories with relationships
 * @param {object} db - SQLite database connection
 * @param {string} domainId - Domain ID
 */
async function addSampleMemories(db, domainId) {
  const now = new Date().toISOString();
  
  // Create first memory node
  const node1Id = uuidv4();
  await db.run(
    'INSERT INTO MEMORY_NODES (id, domain, content, timestamp, path, content_summary) VALUES (?, ?, ?, ?, ?, ?)',
    [
      node1Id,
      domainId,
      'This is the first memory node with important information about the project.',
      now,
      '/projects',
      'First memory with project info'
    ]
  );
  
  // Add tags to first node
  await db.run('INSERT INTO MEMORY_TAGS (nodeId, tag) VALUES (?, ?)', [node1Id, 'project']);
  await db.run('INSERT INTO MEMORY_TAGS (nodeId, tag) VALUES (?, ?)', [node1Id, 'important']);
  
  // Create second memory node
  const node2Id = uuidv4();
  await db.run(
    'INSERT INTO MEMORY_NODES (id, domain, content, timestamp, path) VALUES (?, ?, ?, ?, ?)',
    [
      node2Id,
      domainId,
      'This is the second memory node with related details to the first node.',
      now,
      '/projects/details'
    ]
  );
  
  // Add tags to second node
  await db.run('INSERT INTO MEMORY_TAGS (nodeId, tag) VALUES (?, ?)', [node2Id, 'details']);
  
  // Create edge between nodes
  const edgeId = `${node1Id}-${node2Id}-related_to`;
  await db.run(
    'INSERT INTO MEMORY_EDGES (id, source, target, type, strength, timestamp, domain) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [edgeId, node1Id, node2Id, 'related_to', 0.8, now, domainId]
  );
  
  // Update persistence with latest memory
  await db.run(
    'UPDATE PERSISTENCE SET lastMemoryId = ? WHERE id = 1',
    [node2Id]
  );
  
  console.log(`Added sample memories: ${node1Id}, ${node2Id} with relationship`);
}

/**
 * Perform a sample full-text search
 * @param {object} db - SQLite database connection
 * @param {string} query - Search query
 */
async function performSearch(db, query) {
  console.log(`Searching for: "${query}"`);
  
  const rows = await db.all(`
    SELECT m.* FROM MEMORY_NODES m
    JOIN memory_content_fts fts ON m.id = fts.id
    WHERE memory_content_fts MATCH ?
    LIMIT 10
  `, [query]);
  
  console.log(`Found ${rows.length} results:`);
  
  for (const row of rows) {
    // Get tags for this node
    const tagRows = await db.all('SELECT tag FROM MEMORY_TAGS WHERE nodeId = ?', [row.id]);
    const tags = tagRows.map(t => t.tag);
    
    console.log(`- ID: ${row.id}`);
    console.log(`  Content: ${row.content.substring(0, 50)}${row.content.length > 50 ? '...' : ''}`);
    console.log(`  Path: ${row.path}`);
    console.log(`  Tags: ${tags.join(', ')}`);
    console.log(`  Summary: ${row.content_summary || 'N/A'}`);
    console.log('-----------------------------');
  }
}

/**
 * Main function
 */
async function main() {
  console.log(`Creating database at: ${DB_PATH}`);
  
  try {
    // Open database connection
    const db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });
    
    // Initialize schema
    await initializeSchema(db);
    
    // Create sample data
    const domainId = await createSampleDomain(db);
    await addSampleMemories(db, domainId);
    
    // Perform a sample search
    await performSearch(db, 'project');
    
    console.log('Database setup complete!');
    console.log(`Database file: ${DB_PATH}`);
    
    // Close database connection
    await db.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the script
main().catch(console.error);