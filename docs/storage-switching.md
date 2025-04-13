# Switching Between Storage Types in Memory Graph MCP

The Memory Graph MCP server supports two storage backends:
- **JSON**: Simple file-based storage (default)
- **SQLite**: Database storage with improved performance and search capabilities

This document explains how to switch between these storage types and how to convert existing data.

## Configuring Storage Type

The storage type is controlled by the `STORAGE_TYPE` environment variable, which can be set to either `json` or `sqlite`.

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
       "-e", "STORAGE_TYPE=sqlite",  // Change this to "json" or "sqlite"
       "ghcr.io/aaronsb/memory-graph:latest"
     ],
     "env": {
       "STORAGE_TYPE": "sqlite"  // Change this to "json" or "sqlite"
     },
     "transportType": "stdio"
   }
   ```

3. Save the file and restart the VSCode Cline plugin for the changes to take effect.

### In Docker Run Command

If running the server directly with Docker:

```bash
docker run --rm -i \
  -v /path/to/data:/app/data \
  -e MEMORY_DIR=/app/data \
  -e STORAGE_TYPE=sqlite \  # Change this to "json" or "sqlite"
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
```

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

| Feature | JSON | SQLite |
|---------|------|--------|
| Simplicity | Simple file-based storage | Requires SQLite database |
| Performance | Good for small datasets | Better for large datasets |
| Search | Basic in-memory search | Full-text search capabilities |
| Durability | File-based (one file per domain) | Single database file |
| Backup | Easy to backup individual files | Need to backup database file |

## Implementation Details

The storage implementation is abstracted through the `MemoryStorage` interface, allowing the system to switch between backends seamlessly. The actual implementation is selected in `MemoryGraph.ts`:

```typescript
// Initialize storage based on config
const storageType = (config.storageType?.toLowerCase() === 'sqlite') 
  ? StorageType.SQLITE 
  : StorageType.JSON;

this.storage = StorageFactory.createStorage(storageType, config.storageDir);
```

This design allows for easy addition of other storage backends in the future.
