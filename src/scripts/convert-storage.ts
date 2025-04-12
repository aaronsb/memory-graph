#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { MemoryNode, GraphEdge, DomainInfo, PersistenceState } from '../types/graph.js';

/**
 * Create the SQLite schema (tables, indexes, triggers)
 */
async function createSchema(db: any): Promise<void> {
  // Create tables
  await db.exec(`
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
  `);

  // Create indexes
  await db.exec(`
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

  // Create FTS virtual table and triggers
  await db.exec(`
    -- Enable FTS5 extension for full-text search
    CREATE VIRTUAL TABLE IF NOT EXISTS memory_content_fts USING fts5(
        id,              -- Memory ID
        content,         -- Memory content
        path,            -- Organization path
        tags,            -- Concatenated tags for searching
        domain,          -- Domain ID
        tokenize="porter unicode61"  -- Use Porter stemming algorithm
    );

    -- Triggers to keep FTS index in sync with memory nodes
    CREATE TRIGGER IF NOT EXISTS memory_nodes_ai AFTER INSERT ON MEMORY_NODES BEGIN
        INSERT INTO memory_content_fts(id, content, path, domain)
        VALUES (new.id, new.content, new.path, new.domain);
    END;

    CREATE TRIGGER IF NOT EXISTS memory_nodes_ad AFTER DELETE ON MEMORY_NODES BEGIN
        DELETE FROM memory_content_fts WHERE id = old.id;
    END;

    CREATE TRIGGER IF NOT EXISTS memory_nodes_au AFTER UPDATE ON MEMORY_NODES BEGIN
        DELETE FROM memory_content_fts WHERE id = old.id;
        INSERT INTO memory_content_fts(id, content, path, domain)
        VALUES (new.id, new.content, new.path, new.domain);
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
}

/**
 * Convert JSON storage to SQLite
 */
async function convertJsonToSqlite(jsonDir: string, sqliteFile: string): Promise<void> {
  console.log(`Converting JSON data from ${jsonDir} to SQLite database at ${sqliteFile}`);
  
  // Open SQLite database
  const db = await open({
    filename: sqliteFile,
    driver: sqlite3.Database
  });
  
  try {
    // Create schema (tables, indexes, triggers)
    await createSchema(db);
    
    // Read domains.json
    console.log('Reading domains.json...');
    const domainsData = await fs.readFile(path.join(jsonDir, 'domains.json'), 'utf-8');
    const domains = JSON.parse(domainsData) as Record<string, DomainInfo>;
    
    // Insert domains
    console.log(`Found ${Object.keys(domains).length} domains`);
    for (const [id, domain] of Object.entries(domains)) {
      console.log(`Processing domain: ${id} (${domain.name})`);
      await db.run(
        'INSERT INTO DOMAINS (id, name, description, created, lastAccess) VALUES (?, ?, ?, ?, ?)',
        [id, domain.name, domain.description, domain.created, domain.lastAccess]
      );
      
      // Read domain memory file
      const memoryFile = path.join(jsonDir, 'memories', `${id}.json`);
      console.log(`Reading memory file: ${memoryFile}`);
      const memoryData = await fs.readFile(memoryFile, 'utf-8');
      const memory = JSON.parse(memoryData) as { nodes: Record<string, MemoryNode>, edges: GraphEdge[] };
      
      // Insert nodes
      const nodeCount = Object.keys(memory.nodes).length;
      console.log(`Found ${nodeCount} nodes and ${memory.edges.length} edges`);
      
      let nodeCounter = 0;
      for (const [nodeId, node] of Object.entries(memory.nodes)) {
        nodeCounter++;
        if (nodeCounter % 100 === 0) {
          console.log(`Processed ${nodeCounter}/${nodeCount} nodes...`);
        }
        
        await db.run(
          'INSERT INTO MEMORY_NODES (id, domain, content, timestamp, path) VALUES (?, ?, ?, ?, ?)',
          [nodeId, id, node.content, node.timestamp, node.path || '/']
        );
        
        // Insert tags
        if (node.tags && node.tags.length > 0) {
          for (const tag of node.tags) {
            await db.run(
              'INSERT INTO MEMORY_TAGS (nodeId, tag) VALUES (?, ?)',
              [nodeId, tag]
            );
          }
        }
        
        // Insert domain references
        if (node.domainRefs && node.domainRefs.length > 0) {
          for (const ref of node.domainRefs) {
            await db.run(
              'INSERT INTO DOMAIN_REFS (nodeId, domain, targetDomain, targetNodeId, description, bidirectional) VALUES (?, ?, ?, ?, ?, ?)',
              [nodeId, id, ref.domain, ref.nodeId, ref.description || null, ref.bidirectional ? 1 : 0]
            );
          }
        }
      }
      
      // Insert edges
      let edgeCounter = 0;
      for (const edge of memory.edges) {
        edgeCounter++;
        if (edgeCounter % 100 === 0) {
          console.log(`Processed ${edgeCounter}/${memory.edges.length} edges...`);
        }
        
        await db.run(
          'INSERT INTO MEMORY_EDGES (id, source, target, type, strength, timestamp, domain) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [edge.source + '-' + edge.target + '-' + edge.type, edge.source, edge.target, edge.type, edge.strength, edge.timestamp, id]
        );
      }
    }
    
    // Read persistence.json
    console.log('Reading persistence.json...');
    const persistenceData = await fs.readFile(path.join(jsonDir, 'persistence.json'), 'utf-8');
    const persistence = JSON.parse(persistenceData) as PersistenceState;
    
    // Insert persistence
    await db.run(
      'INSERT INTO PERSISTENCE (id, currentDomain, lastAccess, lastMemoryId) VALUES (?, ?, ?, ?)',
      [1, persistence.currentDomain, persistence.lastAccess, persistence.lastMemoryId || null]
    );
    
    console.log(`Conversion complete. SQLite database created at ${sqliteFile}`);
  } catch (error) {
    console.error('Error during conversion:', error);
    throw error;
  } finally {
    await db.close();
  }
}

/**
 * Convert SQLite storage to JSON
 */
async function convertSqliteToJson(sqliteFile: string, jsonDir: string): Promise<void> {
  console.log(`Converting SQLite database from ${sqliteFile} to JSON data at ${jsonDir}`);
  
  // Open SQLite database
  const db = await open({
    filename: sqliteFile,
    driver: sqlite3.Database
  });
  
  try {
    // Create directories
    await fs.mkdir(jsonDir, { recursive: true });
    await fs.mkdir(path.join(jsonDir, 'memories'), { recursive: true });
    
    // Get domains
    console.log('Reading domains...');
    const domains = await db.all('SELECT * FROM DOMAINS');
    const domainsMap: Record<string, DomainInfo> = {};
    
    for (const domain of domains) {
      domainsMap[domain.id] = {
        id: domain.id,
        name: domain.name,
        description: domain.description,
        created: domain.created,
        lastAccess: domain.lastAccess
      };
      
      // Process each domain
      console.log(`Processing domain: ${domain.id} (${domain.name})`);
      
      // Get nodes for this domain
      const nodes = await db.all('SELECT * FROM MEMORY_NODES WHERE domain = ?', [domain.id]);
      const nodesMap: Record<string, MemoryNode> = {};
      
      console.log(`Found ${nodes.length} nodes`);
      for (const node of nodes) {
        // Get tags for this node
        const tags = await db.all('SELECT tag FROM MEMORY_TAGS WHERE nodeId = ?', [node.id]);
        
        // Get domain refs for this node
        const domainRefs = await db.all('SELECT * FROM DOMAIN_REFS WHERE nodeId = ?', [node.id]);
        
        nodesMap[node.id] = {
          id: node.id,
          content: node.content,
          timestamp: node.timestamp,
          path: node.path,
          tags: tags.map(t => t.tag),
          domainRefs: domainRefs.map(ref => ({
            domain: ref.targetDomain,
            nodeId: ref.targetNodeId,
            description: ref.description,
            bidirectional: ref.bidirectional === 1
          }))
        };
      }
      
      // Get edges for this domain
      const edges = await db.all('SELECT * FROM MEMORY_EDGES WHERE domain = ?', [domain.id]);
      console.log(`Found ${edges.length} edges`);
      
      const edgesArray = edges.map(edge => ({
        source: edge.source,
        target: edge.target,
        type: edge.type,
        strength: edge.strength,
        timestamp: edge.timestamp
      }));
      
      // Write domain memory file
      const memoryData = {
        nodes: nodesMap,
        edges: edgesArray
      };
      
      await fs.writeFile(
        path.join(jsonDir, 'memories', `${domain.id}.json`),
        JSON.stringify(memoryData, null, 2)
      );
    }
    
    // Write domains.json
    await fs.writeFile(
      path.join(jsonDir, 'domains.json'),
      JSON.stringify(domainsMap, null, 2)
    );
    
    // Get persistence state
    const persistence = await db.get('SELECT * FROM PERSISTENCE WHERE id = 1');
    
    // Write persistence.json
    await fs.writeFile(
      path.join(jsonDir, 'persistence.json'),
      JSON.stringify({
        currentDomain: persistence.currentDomain,
        lastAccess: persistence.lastAccess,
        lastMemoryId: persistence.lastMemoryId
      }, null, 2)
    );
    
    console.log(`Conversion complete. JSON data created at ${jsonDir}`);
  } catch (error) {
    console.error('Error during conversion:', error);
    throw error;
  } finally {
    await db.close();
  }
}

/**
 * Main function to handle command line arguments
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    console.log(`
Storage Conversion Utility

Usage:
  --from <format>     Source storage format (json or sqlite)
  --to <format>       Target storage format (json or sqlite)
  --dir <directory>   Storage directory
  --db <file>         SQLite database file (default: <dir>/memory-graph.db)
  --help, -h          Show this help message

Examples:
  # Convert from JSON to SQLite
  node convert-storage.js --from json --to sqlite --dir /path/to/data
  
  # Convert from SQLite to JSON
  node convert-storage.js --from sqlite --to json --dir /path/to/data --db /path/to/memory-graph.db
`);
    process.exit(0);
  }
  
  // Parse arguments
  const fromIndex = args.indexOf('--from');
  const toIndex = args.indexOf('--to');
  const dirIndex = args.indexOf('--dir');
  const dbIndex = args.indexOf('--db');
  
  if (fromIndex === -1 || toIndex === -1 || dirIndex === -1) {
    console.error('Missing required arguments. Use --help for usage information.');
    process.exit(1);
  }
  
  const fromFormat = args[fromIndex + 1];
  const toFormat = args[toIndex + 1];
  const dir = args[dirIndex + 1];
  const dbFile = dbIndex !== -1 ? args[dbIndex + 1] : path.join(dir, 'memory-graph.db');
  
  if (fromFormat !== 'json' && fromFormat !== 'sqlite') {
    console.error('Invalid source format. Must be "json" or "sqlite".');
    process.exit(1);
  }
  
  if (toFormat !== 'json' && toFormat !== 'sqlite') {
    console.error('Invalid target format. Must be "json" or "sqlite".');
    process.exit(1);
  }
  
  try {
    if (fromFormat === 'json' && toFormat === 'sqlite') {
      await convertJsonToSqlite(dir, dbFile);
    } else if (fromFormat === 'sqlite' && toFormat === 'json') {
      await convertSqliteToJson(dbFile, dir);
    } else {
      console.error(`Conversion from ${fromFormat} to ${toFormat} is not supported.`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Conversion failed:', error);
    process.exit(1);
  }
}

// Run the main function
if (import.meta.url === import.meta.resolve(process.argv[1])) {
  main().catch(console.error);
}

// Export functions for use in other modules
export {
  convertJsonToSqlite,
  convertSqliteToJson
};
