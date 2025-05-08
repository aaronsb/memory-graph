/**
 * Example script to create and initialize a Memory Graph MariaDB database
 * This can be used independently of the main MCP server
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

// Database connection configuration
const DB_CONFIG = {
  host: 'localhost',
  user: 'root',      // Change to your MariaDB username
  password: '',      // Change to your MariaDB password
  database: 'memory_graph',
  multipleStatements: true,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

/**
 * Initialize database and create tables
 * @param {mysql.Connection} connection - MariaDB connection
 */
async function initializeSchema(connection) {
  console.log('Creating schema...');
  
  // Read the SQL schema file
  const schemaPath = path.join(__dirname, 'create-mariadb-schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  // Split and execute the SQL statements
  // Note: This simple approach may not handle all SQL syntax correctly
  // For production, use a proper SQL parser/migration tool
  const statements = schema.split(';')
    .map(statement => statement.trim())
    .filter(statement => statement.length > 0);
  
  for (const statement of statements) {
    await connection.query(statement);
  }
  
  console.log('Schema created successfully');
}

/**
 * Create a sample domain
 * @param {mysql.Connection} connection - MariaDB connection
 * @returns {string} - The created domain ID
 */
async function createSampleDomain(connection) {
  const now = new Date().toISOString();
  const domainId = uuidv4();
  
  await connection.query(
    'INSERT INTO DOMAINS (id, name, description, created, lastAccess) VALUES (?, ?, ?, ?, ?)',
    [domainId, 'Sample Domain', 'A sample domain for testing', now, now]
  );
  
  // Check if persistence state exists
  const [persistenceRows] = await connection.query('SELECT 1 FROM PERSISTENCE WHERE id = 1');
  
  if (persistenceRows.length > 0) {
    await connection.query(
      'UPDATE PERSISTENCE SET currentDomain = ?, lastAccess = ? WHERE id = 1',
      [domainId, now]
    );
  } else {
    await connection.query(
      'INSERT INTO PERSISTENCE (id, currentDomain, lastAccess) VALUES (1, ?, ?)',
      [domainId, now]
    );
  }
  
  console.log(`Created domain: ${domainId}`);
  return domainId;
}

/**
 * Add sample memories with relationships
 * @param {mysql.Connection} connection - MariaDB connection
 * @param {string} domainId - Domain ID
 */
async function addSampleMemories(connection, domainId) {
  const now = new Date().toISOString();
  
  // Create first memory node
  const node1Id = uuidv4();
  await connection.query(
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
  await connection.query('INSERT INTO MEMORY_TAGS (nodeId, tag) VALUES (?, ?)', [node1Id, 'project']);
  await connection.query('INSERT INTO MEMORY_TAGS (nodeId, tag) VALUES (?, ?)', [node1Id, 'important']);
  
  // Create second memory node
  const node2Id = uuidv4();
  await connection.query(
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
  await connection.query('INSERT INTO MEMORY_TAGS (nodeId, tag) VALUES (?, ?)', [node2Id, 'details']);
  
  // Create edge between nodes
  const edgeId = `${node1Id}-${node2Id}-related_to`;
  await connection.query(
    'INSERT INTO MEMORY_EDGES (id, source, target, type, strength, timestamp, domain) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [edgeId, node1Id, node2Id, 'related_to', 0.8, now, domainId]
  );
  
  // Update persistence with latest memory
  await connection.query(
    'UPDATE PERSISTENCE SET lastMemoryId = ? WHERE id = 1',
    [node2Id]
  );
  
  console.log(`Added sample memories: ${node1Id}, ${node2Id} with relationship`);
}

/**
 * Perform a sample full-text search using MariaDB MATCH AGAINST
 * @param {mysql.Connection} connection - MariaDB connection
 * @param {string} query - Search query
 */
async function performSearch(connection, query) {
  console.log(`Searching for: "${query}"`);
  
  // In MariaDB, we use MATCH AGAINST for full-text search
  const [rows] = await connection.query(`
    SELECT m.*, get_node_tags(m.id) AS tags_concat
    FROM MEMORY_NODES m
    WHERE MATCH(m.content, m.content_summary) AGAINST(? IN NATURAL LANGUAGE MODE)
    LIMIT 10
  `, [query]);
  
  console.log(`Found ${rows.length} results:`);
  
  for (const row of rows) {
    // Get tags for this node
    const [tagRows] = await connection.query('SELECT tag FROM MEMORY_TAGS WHERE nodeId = ?', [row.id]);
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
 * Create the database if it doesn't exist
 */
async function createDatabase() {
  // Create a connection without specifying a database
  const tempConnection = await mysql.createConnection({
    host: DB_CONFIG.host,
    user: DB_CONFIG.user,
    password: DB_CONFIG.password
  });
  
  try {
    console.log(`Creating database: ${DB_CONFIG.database}`);
    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS ${DB_CONFIG.database} 
                               CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci`);
  } finally {
    await tempConnection.end();
  }
}

/**
 * Main function
 */
async function main() {
  // Create the database if it doesn't exist
  await createDatabase();
  
  // Create a connection pool
  const pool = mysql.createPool(DB_CONFIG);
  let connection;
  
  try {
    // Get a connection from the pool
    connection = await pool.getConnection();
    
    // Initialize schema
    await initializeSchema(connection);
    
    // Create sample data
    const domainId = await createSampleDomain(connection);
    await addSampleMemories(connection, domainId);
    
    // Perform a sample search
    await performSearch(connection, 'project');
    
    console.log('Database setup complete!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Release the connection back to the pool
    if (connection) connection.release();
    
    // Close the pool
    await pool.end();
  }
}

// Run the script
main().catch(console.error);