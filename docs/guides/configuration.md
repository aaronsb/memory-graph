# Memory Graph Configuration Guide

This guide covers all configuration options for the Memory Graph MCP server, including environment variables, storage options, transport types, and special modes like strict mode.

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Storage Configuration](#storage-configuration)
3. [Transport Configuration](#transport-configuration)
4. [Strict Mode](#strict-mode)
5. [MCP Configuration Examples](#mcp-configuration-examples)

## Environment Variables

The Memory Graph MCP server can be configured using the following environment variables:

### General Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `MEMORY_DIR` | Directory to store memory files | `./data` | `/path/to/data` |
| `MEMORY_FILES` | Comma-separated list of specific memory files to use | (none) | `general.json,work.json` |
| `LOAD_ALL_FILES` | Load all JSON files in the storage directory | `false` | `true` |
| `DEFAULT_PATH` | Default path for storing memories | `/` | `/memories` |
| `STRICT_MODE` | Ensure all logging goes to stderr | `false` | `true` |

### Storage Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `STORAGE_TYPE` | Storage backend to use (`json`, `sqlite`, or `mariadb`) | `json` | `sqlite` |

### MariaDB Configuration

These variables are only used when `STORAGE_TYPE=mariadb`:

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `MARIADB_HOST` | Database server hostname | `localhost` | `db.example.com` |
| `MARIADB_PORT` | Database server port | `3306` | `3307` |
| `MARIADB_USER` | Database username | `root` | `memory_user` |
| `MARIADB_PASSWORD` | Database password | (empty) | `secure_password` |
| `MARIADB_DATABASE` | Database name | `memory_graph` | `my_memory_db` |
| `MARIADB_CONNECTION_LIMIT` | Maximum connections in pool | `10` | `20` |

### Transport Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `TRANSPORT_TYPE` | Communication transport (`STDIO` or `HTTP`) | `STDIO` | `HTTP` |
| `PORT` | Port number for HTTP transport | (required) | `3000` |
| `HOST` | Host address for HTTP transport | `127.0.0.1` | `0.0.0.0` |

## Storage Configuration

The Memory Graph MCP supports three storage backends:

### JSON Storage

The simplest storage option, using JSON files:

```bash
STORAGE_TYPE=json
```

- One JSON file per domain in the `memories/` directory
- Good for smaller datasets and simple deployments
- Easy to inspect and manually edit if needed

### SQLite Storage

A more efficient database storage option:

```bash
STORAGE_TYPE=sqlite
```

- Single SQLite database file for all domains
- Better performance for large datasets
- Full-text search capabilities
- More efficient memory usage
- Good for local deployments

### MariaDB Storage

A production-ready database storage option:

```bash
STORAGE_TYPE=mariadb
MARIADB_HOST=localhost
MARIADB_PORT=3306
MARIADB_USER=memory_user
MARIADB_PASSWORD=secure_password
MARIADB_DATABASE=memory_graph
```

- Uses a MariaDB/MySQL database server
- Ideal for large-scale deployments
- Full-text search capabilities
- Better scalability and concurrency support
- Suitable for deployments with high load or multiple concurrent users

For more details on storage options and how to convert between them, see the [Storage Switching Guide](storage-switching.md).

## Transport Configuration

The Memory Graph MCP supports two transport types:

### STDIO Transport

The default transport, suitable for direct MCP integration:

```bash
TRANSPORT_TYPE=STDIO
```

- Simple stdin/stdout communication
- No network configuration required
- Used by default when integrating with AI assistants

### HTTP Transport

A network-based transport suitable for remote connections:

```bash
TRANSPORT_TYPE=HTTP
PORT=3000
HOST=127.0.0.1
```

- RESTful API over HTTP
- Accessible over the network
- Suitable for multi-user deployments
- Allows connection from multiple clients

## Strict Mode

Strict mode ensures clean JSON-RPC communication by redirecting all logging to stderr instead of stdout. This prevents parsing errors in MCP clients that expect only valid JSON-RPC messages on stdout.

### Problem Addressed

Some MCP clients have difficulty handling mixed output on stdio where both error messages and informational logging get mingled in the JSON-RPC stream. This can lead to errors like:

```
SyntaxError: Unexpected token 'S', "STORAGE_TYPE: sqlite" is not valid JSON
```

### Enabling Strict Mode

To enable strict mode, set the `STRICT_MODE` environment variable to `true`:

```bash
STRICT_MODE=true
```

### How It Works

When strict mode is enabled:

1. All proper JSON-RPC communication goes to stdout
2. All informational logging is redirected to stderr

This implementation ensures that the stdout stream contains only valid JSON-RPC messages, while all logging information is sent to stderr.

## MCP Configuration Examples

### Basic Configuration with STDIO

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

### HTTP Transport Configuration

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

### Docker with MariaDB Configuration

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

### Recommended Auto-Approve Tools

For a better user experience, consider auto-approving these common tools:

```json
"autoApprove": [
  "store_memory",
  "recall_memories",
  "list_domains",
  "select_domain",
  "generate_mermaid_graph"
]
```

This allows the AI assistant to use these tools without requiring explicit user approval each time.