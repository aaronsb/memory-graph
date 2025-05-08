# Switching Between Storage Types in Memory Graph MCP

The Memory Graph MCP server supports three storage backends:
- **JSON**: Simple file-based storage (default)
- **SQLite**: Database storage with improved performance and search capabilities
- **MariaDB**: Production-ready database storage with better scalability

This document explains how to switch between these storage types and how to convert existing data.

## Configuring Storage Type

The storage type is controlled by the `STORAGE_TYPE` environment variable, which can be set to `json`, `sqlite`, or `mariadb`.

### In VSCode Cline Plugin Configuration

To switch storage types in the VSCode Cline plugin:

1. Open the MCP settings file:
   ```
   ~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
   ```

2. Update the `STORAGE_TYPE` environment variable in the `memory-graph` server configuration:

   ```json
   "memory-graph": {
     "autoApprove": [],
     "disabled": false,
     "timeout": 60,
     "command": "docker",
     "args": [
       "run",
       "--rm",
       "-i",
       "-v",
       "/home/aaron/Documents/memory-graph-mcp:/app/data",
       "-e", "MEMORY_DIR=/app/data",
       "-e", "STORAGE_TYPE=sqlite",  // Change this to "json", "sqlite", or "mariadb"
       "ghcr.io/aaronsb/memory-graph:latest"
     ],
     "env": {
       "STORAGE_TYPE": "sqlite"  // Change this to "json", "sqlite", or "mariadb"
     },
     "transportType": "stdio"
   }
   ```

3. Save the file and restart the VSCode Cline plugin for the changes to take effect.

### In Docker Run Command

If running the server directly with Docker:

```bash
# For JSON or SQLite storage
docker run --rm -i \
  -v /path/to/data:/app/data \
  -e MEMORY_DIR=/app/data \
  -e STORAGE_TYPE=sqlite \  # Change this to "json" or "sqlite"
  ghcr.io/aaronsb/memory-graph:latest

# For MariaDB storage
docker run --rm -i \
  -v /path/to/data:/app/data \
  -e MEMORY_DIR=/app/data \
  -e STORAGE_TYPE=mariadb \
  -e MARIADB_HOST=localhost \
  -e MARIADB_PORT=3306 \
  -e MARIADB_USER=memory_user \
  -e MARIADB_PASSWORD=secure_password \
  -e MARIADB_DATABASE=memory_graph \
  --network=host \  # To connect to MariaDB on the host
  ghcr.io/aaronsb/memory-graph:latest
```

## Converting Between Storage Formats

When switching storage types, you may want to convert existing data to the new format. The Memory Graph MCP includes a conversion script for this purpose.

### Using the Conversion Script

The conversion script is located at `scripts/convert-storage.ts` and can be run with:

```bash
# Convert from JSON to SQLite
npx ts-node --esm scripts/convert-storage.ts json2sqlite /path/to/json/data /path/to/sqlite/file.db

# Convert from SQLite to JSON
npx ts-node --esm scripts/convert-storage.ts sqlite2json /path/to/sqlite/file.db /path/to/json/data

# Convert from JSON to MariaDB
npx ts-node --esm scripts/convert-storage.ts json2mariadb /path/to/json/data "mariadb://user:password@localhost:3306/memory_graph"

# Convert from SQLite to MariaDB
npx ts-node --esm scripts/convert-storage.ts sqlite2mariadb /path/to/sqlite/file.db "mariadb://user:password@localhost:3306/memory_graph"

# Convert from MariaDB to JSON
npx ts-node --esm scripts/convert-storage.ts mariadb2json "mariadb://user:password@localhost:3306/memory_graph" /path/to/json/data

# Convert from MariaDB to SQLite
npx ts-node --esm scripts/convert-storage.ts mariadb2sqlite "mariadb://user:password@localhost:3306/memory_graph" /path/to/sqlite/file.db
```

Note: The MariaDB connection string format is: `mariadb://user:password@host:port/database`

### Example Workflow

1. Stop the Memory Graph MCP server if it's running
2. Convert your data to the new format
3. Update the configuration to use the new storage type
4. Restart the server

```bash
# Example: Converting from JSON to SQLite
npx ts-node --esm scripts/convert-storage.ts json2sqlite /home/aaron/Documents/memory-graph-mcp /home/aaron/Documents/memory-graph-mcp/memory-graph.db

# Then update the configuration to use STORAGE_TYPE=sqlite
```

## Storage Type Comparison

| Feature | JSON | SQLite | MariaDB |
|---------|------|--------|---------|
| Simplicity | Simple file-based storage | Requires SQLite database | Requires MariaDB server |
| Performance | Good for small datasets | Better for large datasets | Best for large datasets and concurrent access |
| Search | Basic in-memory search | Full-text search capabilities | Full-text search capabilities |
| Durability | File-based (one file per domain) | Single database file | Client-server database with transaction support |
| Backup | Easy to backup individual files | Need to backup database file | Standard database backup procedures (mysqldump) |
| Concurrency | Limited concurrency support | Medium concurrency support | High concurrency support |
| Scalability | Limited to single machine | Limited to single machine | Can scale across multiple servers |
| Deployment | Simplest deployment | Simple deployment | Requires database server setup |

## Implementation Details

The storage implementation is abstracted through the `MemoryStorage` interface, allowing the system to switch between backends seamlessly. The actual implementation is selected in `MemoryGraph.ts`:

```typescript
// Initialize storage based on config
let storageType = StorageType.JSON;
    
if (config.storageType) {
  const typeValue = config.storageType.toLowerCase();
  if (typeValue === 'sqlite') {
    storageType = StorageType.SQLITE;
  } else if (typeValue === 'mariadb') {
    storageType = StorageType.MARIADB;
  }
}

this.storage = StorageFactory.createStorage(storageType, config.storageDir, config.dbConfig);
```

The SQL-based implementations (SQLite and MariaDB) share common functionality through a base `DatabaseStorage` class, which simplifies the addition of new database backends.

### Storage Class Hierarchy

```
MemoryStorage (interface)
├── JsonMemoryStorage
└── DatabaseStorage (abstract)
    ├── SqliteMemoryStorage
    └── MariaDbMemoryStorage
```

This design allows for easy addition of other storage backends in the future.
