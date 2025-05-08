# Memory Graph MCP Server

An MCP server that provides persistent memory capabilities through a local knowledge graph implementation. This server enables AI assistants to maintain context and information across chat sessions using a graph-based storage system.

## Features

- Domain-based memory organization for context isolation
- Store and retrieve memories with content, tags, and metadata
- Cross-domain memory references with relationship tracking
- Memory domain transfer capability
- Multiple storage backends (JSON, SQLite, and MariaDB)
- Multiple transport protocols (STDIO and HTTP)
- Full-text search capabilities with SQL-based storage backends
- Advanced content search with fuzzy matching and regex support
- Combine multiple search strategies (content, path, tags)
- Flexible result sorting and relevance scoring
- Graph traversal across domains and relationships
- Mermaid graph visualization for memory connections
- Docker and Docker Compose support

## Documentation

### Getting Started
- [Getting Started Guide](docs/guides/getting-started.md) - Quick setup and basic usage guide
- [Use Cases](docs/guides/use-cases.md) - Examples of how to use Memory Graph in real-world scenarios
- [Configuration](docs/guides/configuration.md) - Comprehensive configuration options

### Features
- [Storage Overview](docs/features/storage/overview.md) - Overview of storage backends
- [Transport Overview](docs/features/transport/overview.md) - Overview of transport types

### Core Concepts
- [Memory Architecture](docs/concepts/memory-architecture.md) - Domain-based memory system
- [Graph Model](docs/concepts/graph-model.md) - Graph data model explanation

### Reference
- [Memory Tools Reference](docs/reference/memory-tools-reference.md) - Comprehensive tool documentation
- [Database Schemas](docs/reference/database-schemas.md) - Technical reference for database schemas

### Developer Documentation
- [Architecture](docs/development/architecture.md) - System architecture and design patterns
- [Contributing](docs/development/contributing.md) - Contributing guidelines
- [Testing](docs/development/testing.md) - Testing strategy

## Installation

### Local Installation

```bash
# Install dependencies
npm install

# Build the TypeScript code
npm run build

# Clean build directory
npm run clean
```

### Docker Installation

The server is available as a Docker container from GitHub Container Registry:

```bash
# Pull the image
docker pull ghcr.io/aaronsb/memory-graph:latest

# Or build locally
./scripts/build-local.sh
```

## Usage

### Docker Usage

Run the container with your desired configuration:

```bash
# Using STDIO transport (default)
docker run -v /path/to/data:/app/data \
  -e MEMORY_DIR=/app/data \
  -e TRANSPORT_TYPE=STDIO \
  -e STORAGE_TYPE=sqlite \
  ghcr.io/aaronsb/memory-graph:latest

# Using HTTP transport
docker run -v /path/to/data:/app/data \
  -e MEMORY_DIR=/app/data \
  -e TRANSPORT_TYPE=HTTP \
  -e PORT=3000 \
  -e HOST=127.0.0.1 \
  -p 3000:3000 \
  ghcr.io/aaronsb/memory-graph:latest

# Using MariaDB storage
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

### Docker Compose

For convenience, a Docker Compose configuration is provided:

```bash
# Start with Docker Compose
docker-compose up -d

# Stop services
docker-compose down
```

### Local Usage

```bash
# Start the server
npm start

# Run using custom configuration
MEMORY_DIR=/path/to/data STORAGE_TYPE=sqlite npm start
```

## Configuration

The server can be configured using environment variables:

### General Configuration

- `MEMORY_DIR`: Directory to store memory files (default: `./data`)
- `MEMORY_FILES`: Comma-separated list of specific memory files to use
- `LOAD_ALL_FILES`: Set to 'true' to load all JSON files in the storage directory
- `DEFAULT_PATH`: Default path for storing memories
- `STRICT_MODE`: Set to 'true' to ensure all logging goes to stderr, preventing interference with JSON-RPC communication on stdout

### Storage Configuration

- `STORAGE_TYPE`: Storage backend to use (`json`, `sqlite`, or `mariadb`, default: `json`)

#### MariaDB Configuration (when using `STORAGE_TYPE=mariadb`)

- `MARIADB_HOST`: Database server hostname (default: `localhost`)
- `MARIADB_PORT`: Database server port (default: `3306`)
- `MARIADB_USER`: Database username (default: `root`)
- `MARIADB_PASSWORD`: Database password (default: empty)
- `MARIADB_DATABASE`: Database name (default: `memory_graph`)
- `MARIADB_CONNECTION_LIMIT`: Maximum number of connections in the pool (default: `10`)

### Transport Configuration

- `TRANSPORT_TYPE`: Communication transport to use (`STDIO` or `HTTP`, default: `STDIO`)
- `PORT`: Port number for HTTP transport (required when `TRANSPORT_TYPE=HTTP`)
- `HOST`: Host address for HTTP transport (default: `127.0.0.1`, only used when `TRANSPORT_TYPE=HTTP`)

## MCP Configuration

To use this server with an AI assistant via MCP, add it to your MCP configuration file:

### STDIO Transport (Default)

```json
{
  "mcpServers": {
    "memory-graph": {
      "command": "node",
      "args": ["/path/to/memory-graph/build/index.js"],
      "env": {
        "MEMORY_DIR": "/path/to/memory/storage",
        "STORAGE_TYPE": "sqlite",
        "STRICT_MODE": "true"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

### HTTP Transport

```json
{
  "mcpServers": {
    "memory-graph": {
      "command": "node",
      "args": ["/path/to/memory-graph/build/index.js"],
      "env": {
        "MEMORY_DIR": "/path/to/memory/storage",
        "STORAGE_TYPE": "sqlite",
        "TRANSPORT_TYPE": "HTTP",
        "PORT": "3000",
        "STRICT_MODE": "true"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

### Docker with MariaDB

```json
{
  "mcpServers": {
    "memory-graph": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "--network=host",
        "-v", "/path/to/data:/app/data",
        "-e", "MEMORY_DIR=/app/data",
        "-e", "STORAGE_TYPE=mariadb",
        "-e", "MARIADB_HOST=localhost",
        "-e", "MARIADB_PORT=3306",
        "-e", "MARIADB_USER=memory_user",
        "-e", "MARIADB_PASSWORD=secure_password",
        "-e", "MARIADB_DATABASE=memory_graph",
        "-e", "STRICT_MODE=true",
        "ghcr.io/aaronsb/memory-graph:latest"
      ],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

## Storage Options

The Memory Graph MCP supports three storage backends:

- **JSON**: Simple file-based storage (default)
  - One JSON file per domain in the `memories/` directory
  - Good for smaller datasets and simple deployments
  - Easy to inspect and manually edit if needed

- **SQLite**: Database storage with improved performance
  - Single SQLite database file for all domains
  - Better performance for large datasets
  - Full-text search capabilities
  - More efficient memory usage
  - Good for local deployments

- **MariaDB**: Production-ready database storage
  - Uses a MariaDB/MySQL database server
  - Ideal for large-scale deployments
  - Full-text search capabilities
  - Better scalability and concurrency support
  - Suitable for deployments with high load or multiple concurrent users

To switch between storage types, set the `STORAGE_TYPE` environment variable to `json`, `sqlite`, or `mariadb`.

For detailed information about storage options, including how to convert between formats, see [Storage Overview](docs/features/storage/overview.md) and [Converting Between Storage Types](docs/features/storage/converting.md).

## Available Memory Tools

The Memory Graph MCP provides the following tools:

### Domain Management

- `select_domain`: Switch to a different memory domain
- `list_domains`: List all available memory domains
- `create_domain`: Create a new memory domain

### Memory Operations

- `store_memory`: Store new information in the memory graph
- `recall_memories`: Retrieve memories using various strategies
- `edit_memory`: Edit an existing memory or move it to another domain
- `forget_memory`: Remove a memory from the graph

### Visualization

- `generate_mermaid_graph`: Generate a visual representation of memory relationships

### Search

- `search_memory_content`: Full-text search capabilities (with SQLite and MariaDB backends)
- `traverse_memories`: Explore connections between memories across domains

For detailed information about all tools and their parameters, see the [Memory Tools Reference](docs/reference/memory-tools-reference.md).

## Project Structure

```
memory-graph/
├── src/
│   ├── graph/           # Knowledge graph implementation
│   ├── storage/         # Storage backends (JSON, SQLite, MariaDB)
│   ├── tools/           # MCP tool implementations
│   ├── types/           # TypeScript type definitions
│   └── index.ts         # Main server entry
├── data/                # Memory storage (created at runtime)
└── docs/                # Project documentation
```

## Development

### Building

```bash
# Build the TypeScript code
npm run build

# Build local Docker image
./scripts/build-local.sh
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test:watch
```

### Converting Between Storage Types

```bash
# Convert from JSON to SQLite
npx ts-node scripts/convert-storage.ts json2sqlite /path/to/json/data /path/to/sqlite/file.db

# Convert from SQLite to JSON
npx ts-node scripts/convert-storage.ts sqlite2json /path/to/sqlite/file.db /path/to/json/data

# Convert from JSON to MariaDB
npx ts-node scripts/convert-storage.ts json2mariadb /path/to/json/data "mariadb://user:password@localhost:3306/memory_graph"
```

## License

MIT