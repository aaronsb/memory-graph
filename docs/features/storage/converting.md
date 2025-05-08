# Converting Between Storage Types

Memory Graph MCP supports converting data between different storage backends. This document explains how to use the conversion utility to migrate between JSON, SQLite, and MariaDB storage types.

## Conversion Utility

The Memory Graph MCP includes a command-line utility for converting between storage types, located at `scripts/convert-storage.ts`.

## Available Conversion Paths

The utility supports all conversion paths between the supported storage types:

- JSON to SQLite
- JSON to MariaDB
- SQLite to JSON
- SQLite to MariaDB
- MariaDB to JSON
- MariaDB to SQLite

## Using the Conversion Tool

### Basic Syntax

```bash
npx ts-node scripts/convert-storage.ts <conversion-type> <source-path> <destination-path>
```

Where:
- `<conversion-type>` is the type of conversion (e.g., `json2sqlite`)
- `<source-path>` is the path to the source data
- `<destination-path>` is the path for the destination data

### JSON to SQLite

Convert from JSON file-based storage to SQLite:

```bash
npx ts-node scripts/convert-storage.ts json2sqlite /path/to/json/data /path/to/sqlite/file.db
```

This will:
1. Read all JSON domain files from the source directory
2. Create a new SQLite database at the destination path
3. Convert all domains, nodes, and edges to the SQLite schema
4. Preserve all relationships and metadata

### JSON to MariaDB

Convert from JSON file-based storage to MariaDB:

```bash
npx ts-node scripts/convert-storage.ts json2mariadb /path/to/json/data "mariadb://user:password@localhost:3306/memory_graph"
```

The MariaDB connection string format is:
```
mariadb://username:password@hostname:port/database
```

### SQLite to JSON

Convert from SQLite to JSON file-based storage:

```bash
npx ts-node scripts/convert-storage.ts sqlite2json /path/to/sqlite/file.db /path/to/json/data
```

This will:
1. Read all data from the SQLite database
2. Create a directory structure for the JSON storage
3. Create domain JSON files for each domain in the database
4. Create domains.json and persistence.json files

### SQLite to MariaDB

Convert from SQLite to MariaDB:

```bash
npx ts-node scripts/convert-storage.ts sqlite2mariadb /path/to/sqlite/file.db "mariadb://user:password@localhost:3306/memory_graph"
```

### MariaDB to JSON

Convert from MariaDB to JSON file-based storage:

```bash
npx ts-node scripts/convert-storage.ts mariadb2json "mariadb://user:password@localhost:3306/memory_graph" /path/to/json/data
```

### MariaDB to SQLite

Convert from MariaDB to SQLite:

```bash
npx ts-node scripts/convert-storage.ts mariadb2sqlite "mariadb://user:password@localhost:3306/memory_graph" /path/to/sqlite/file.db
```

## Conversion Process Details

The conversion process follows these general steps:

1. **Connect to Source**: Open the source storage and read schema information
2. **Prepare Destination**: Create and initialize the destination storage
3. **Convert Domains**: Transfer domain metadata
4. **Convert Nodes**: Transfer all memory nodes with their content and metadata
5. **Convert Relationships**: Transfer all edges between nodes
6. **Convert State**: Transfer persistence state information
7. **Verify**: Perform basic verification of the conversion

## Data Preservation

The conversion process preserves all critical data:

- All domain metadata (IDs, names, descriptions, timestamps)
- All memory nodes (content, paths, tags, timestamps)
- All relationships between nodes (type, strength, timestamps)
- Current domain selection and persistence state

## Best Practices

### Before Converting

1. **Backup Your Data**: Always create a backup of your data before conversion
2. **Stop the Server**: Ensure the Memory Graph MCP server is not running during conversion
3. **Verify Source**: Check that your source data is valid and accessible
4. **Check Permissions**: Ensure you have appropriate permissions for both source and destination

### After Converting

1. **Test New Storage**: Start the server with the new storage and verify functionality
2. **Keep Backup**: Maintain the backup of the old storage until you're confident in the conversion
3. **Update Configuration**: Update your configuration files to use the new storage type

## Troubleshooting

### Common Issues

#### Database Connection Issues

When converting to/from MariaDB:

```
Error: Failed to connect to database: ER_ACCESS_DENIED_ERROR
```

Solution:
- Check that the database server is running
- Verify username and password in the connection string
- Ensure the database exists
- Check network connectivity and firewall settings

#### File Permission Issues

When working with file-based storage:

```
Error: EACCES: permission denied, open '/path/to/file'
```

Solution:
- Check file and directory permissions
- Run the command with appropriate user permissions
- Ensure the destination directory exists

#### Out of Memory

When converting large datasets:

```
FATAL ERROR: JavaScript heap out of memory
```

Solution:
- Increase Node.js memory limit:
  ```bash
  NODE_OPTIONS=--max-old-space-size=4096 npx ts-node scripts/convert-storage.ts ...
  ```

### Logging and Debugging

The conversion script outputs progress information during conversion. For more detailed logging:

```bash
DEBUG=true npx ts-node scripts/convert-storage.ts json2sqlite /path/to/json /path/to/sqlite.db
```

This will print additional debugging information during the conversion process.

## Implementation Details

The conversion utility uses the same storage implementations as the main application:

- `JsonMemoryStorage` for JSON file-based storage
- `SqliteMemoryStorage` for SQLite database storage
- `MariaDbMemoryStorage` for MariaDB database storage

This ensures that the conversion process uses the same code paths as the regular application operations, reducing the risk of inconsistencies.