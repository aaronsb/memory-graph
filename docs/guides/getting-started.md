# Getting Started with Memory Graph MCP

This guide will help you get up and running with the Memory Graph MCP server, which provides persistent memory capabilities for AI assistants through a local knowledge graph implementation.

## Installation

### Prerequisites

- Node.js 18 or higher
- npm 7 or higher
- Optional: Docker for containerized deployment

### Local Installation

1. Clone the repository or install the package:

```bash
# Clone the repository
git clone https://github.com/aaronsb/memory-graph.git
cd memory-graph

# Install dependencies
npm install
```

2. Build the TypeScript code:

```bash
npm run build
```

### Docker Installation

The server is available as a Docker container:

```bash
# Pull the image
docker pull ghcr.io/aaronsb/memory-graph:latest
```

## Quick Configuration

The Memory Graph MCP server can be configured using environment variables:

### Basic Configuration

```bash
# Directory for storing memory files
MEMORY_DIR=/path/to/data

# Storage type (json, sqlite, or mariadb)
STORAGE_TYPE=sqlite

# Transport type (STDIO or HTTP)
TRANSPORT_TYPE=STDIO

# Enable strict mode for clean JSON-RPC communication
STRICT_MODE=true
```

### Quick Start

#### Running Locally

```bash
# Run with default configuration
npm start

# Run with custom configuration
MEMORY_DIR=/path/to/data STORAGE_TYPE=sqlite npm start
```

#### Running with Docker

```bash
# Using STDIO transport (default)
docker run -v /path/to/data:/app/data \
  -e MEMORY_DIR=/app/data \
  -e STORAGE_TYPE=sqlite \
  -e STRICT_MODE=true \
  ghcr.io/aaronsb/memory-graph:latest

# Using HTTP transport
docker run -v /path/to/data:/app/data \
  -e MEMORY_DIR=/app/data \
  -e TRANSPORT_TYPE=HTTP \
  -e PORT=3000 \
  -p 3000:3000 \
  ghcr.io/aaronsb/memory-graph:latest
```

## Hello World Example

Let's go through a simple example of using the Memory Graph MCP:

### 1. Start the Server

```bash
# Start the server with default configuration
npm start
```

### 2. Configure MCP Client

Add the following to your MCP configuration file (e.g., `claude_desktop_config.json`):

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
      "autoApprove": [
        "store_memory",
        "recall_memories",
        "list_domains",
        "select_domain"
      ]
    }
  }
}
```

### 3. Basic Operations

Here are the basic operations you can perform with the Memory Graph MCP:

#### Creating a Domain

```
I'd like to create a memory domain for my project notes. Can you create a domain called "project-notes" with a description "Notes and information about my current projects"?
```

The AI will use the `create_domain` tool to create a new domain.

#### Storing a Memory

```
Please store this information: We decided to use a microservices architecture for the new API to improve scalability. Each service will have its own database to ensure loose coupling.
```

The AI will use the `store_memory` tool to save this information.

#### Recalling Memories

```
What do you remember about our architecture decisions?
```

The AI will use the `recall_memories` tool to retrieve relevant memories.

#### Visualizing Memories

```
Can you create a visual graph showing how our architecture decisions connect to other project information?
```

The AI will use the `generate_mermaid_graph` tool to create a visual representation.

## Next Steps

Now that you have the Memory Graph MCP running and understand basic operations, you can:

- Learn about [domain-based memory architecture](memoryArchitecture.md)
- Explore [use cases and examples](use-cases.md)
- Configure [storage backends](storage-switching.md) for better performance
- Understand the [complete set of memory tools](memory-tools-reference.md)

For full documentation, see our [README](../README.md) and explore other guides in the docs directory.