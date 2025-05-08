# Transport Types

The Memory Graph MCP server supports multiple transport protocols for communication with clients. This document explains the available transport types, their configuration, and use cases.

## Transport Overview

Memory Graph MCP supports two primary transport mechanisms:

1. **STDIO Transport**: Communication via standard input/output streams
2. **HTTP Transport**: Communication via RESTful HTTP endpoints

Each transport type has its own advantages and use cases, allowing flexibility in how the Memory Graph MCP is deployed and integrated.

## STDIO Transport

The STDIO transport is the default transport mechanism, using standard input and output streams for communication.

### How STDIO Transport Works

```
┌─────────────┐                ┌─────────────────┐
│             │    JSON-RPC    │                 │
│  MCP Client ├───────────────►│ Memory Graph    │
│  (e.g., AI) │◄───────────────┤ MCP Server      │
│             │                │                 │
└─────────────┘                └─────────────────┘
      stdin/stdout streams
```

1. The server reads JSON-RPC requests from standard input (stdin)
2. The server processes the requests and executes the appropriate tools
3. The server writes JSON-RPC responses to standard output (stdout)
4. The MCP client reads and processes these responses

### Configuration

STDIO transport is the default and requires minimal configuration:

```bash
# Using default STDIO transport
TRANSPORT_TYPE=STDIO
```

### Use Cases

STDIO transport is ideal for:

- Direct integration with AI assistants through the MCP protocol
- Local usage where client and server run on the same machine
- Simple deployments without network configuration
- Environments where security is managed through process isolation

### Strict Mode

When using STDIO transport, it's important to consider Strict Mode, which ensures clean separation of JSON-RPC communication and logging:

```bash
STRICT_MODE=true
```

With Strict Mode enabled:
- JSON-RPC messages go to stdout
- Logging and errors go to stderr

This prevents parsing errors in MCP clients that expect clean JSON-RPC messages. For more details, see the [Configuration Guide](../guides/configuration.md#strict-mode).

## HTTP Transport

The HTTP transport enables network-based communication using a RESTful API over HTTP.

### How HTTP Transport Works

```
┌─────────────┐                ┌─────────────────┐
│             │    HTTP/JSON   │                 │
│  MCP Client ├───────────────►│ Memory Graph    │
│  (Any HTTP  │◄───────────────┤ MCP Server      │
│   Client)   │                │                 │
└─────────────┘                └─────────────────┘
      HTTP(S) Protocol
```

1. The server listens for HTTP requests on a specified port
2. Clients send JSON-RPC requests as HTTP POST bodies to the endpoint
3. The server processes requests and returns JSON-RPC responses
4. Multiple clients can connect simultaneously

### Configuration

HTTP transport requires additional configuration:

```bash
# HTTP transport configuration
TRANSPORT_TYPE=HTTP
PORT=3000
HOST=127.0.0.1  # Default, only listens on localhost
```

To allow connections from other machines:

```bash
HOST=0.0.0.0  # Listen on all interfaces
```

### Use Cases

HTTP transport is ideal for:

- Deployments where client and server are on different machines
- Multi-user environments where multiple clients need access
- Integration with web applications or services
- Dockerized deployments accessed over a network
- Scenarios requiring load balancing or proxying

### API Endpoint

The HTTP transport exposes a single endpoint for JSON-RPC communication:

```
POST /
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "method": "tool",
  "params": {
    "name": "tool_name",
    "input": { /* tool-specific parameters */ }
  }
}
```

Response:

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "result": { /* tool-specific response */ }
}
```

## Docker Networking Considerations

When running the Memory Graph MCP in Docker, networking configuration depends on the transport type:

### STDIO Transport with Docker

For STDIO transport, use the `-i` flag to keep stdin open:

```bash
docker run -i -v /path/to/data:/app/data \
  -e MEMORY_DIR=/app/data \
  ghcr.io/aaronsb/memory-graph:latest
```

### HTTP Transport with Docker

For HTTP transport, expose the port and configure networking:

```bash
# Listen only on localhost
docker run -v /path/to/data:/app/data \
  -e MEMORY_DIR=/app/data \
  -e TRANSPORT_TYPE=HTTP \
  -e PORT=3000 \
  -p 127.0.0.1:3000:3000 \
  ghcr.io/aaronsb/memory-graph:latest

# Listen on all interfaces
docker run -v /path/to/data:/app/data \
  -e MEMORY_DIR=/app/data \
  -e TRANSPORT_TYPE=HTTP \
  -e PORT=3000 \
  -e HOST=0.0.0.0 \
  -p 3000:3000 \
  ghcr.io/aaronsb/memory-graph:latest
```

### MariaDB with Docker

When using MariaDB storage with Docker, you may need host networking:

```bash
docker run --network=host \
  -v /path/to/data:/app/data \
  -e MEMORY_DIR=/app/data \
  -e STORAGE_TYPE=mariadb \
  -e MARIADB_HOST=localhost \
  ghcr.io/aaronsb/memory-graph:latest
```

## Security Considerations

### STDIO Transport Security

- Security is primarily handled through process isolation
- No network exposure means reduced attack surface
- Consider file permissions for data directory

### HTTP Transport Security

- By default, HTTP transport is not encrypted
- HTTP transport listens only on localhost by default
- For production use, consider:
  - Placing behind a secure reverse proxy (e.g., Nginx with SSL)
  - Implementing authentication middleware
  - Using IP restrictions and firewalls
  - Setting up API keys or other authorization methods

## Performance Considerations

### STDIO Transport

- Lower overhead for local communication
- Single client per server instance
- No serialization/deserialization beyond JSON

### HTTP Transport

- Additional overhead from HTTP protocol
- Supports multiple concurrent clients
- Network latency impacts performance
- May require connection pooling for database backends

## Choosing a Transport Type

| Consider                       | STDIO                           | HTTP                                     |
|--------------------------------|---------------------------------|------------------------------------------|
| **Deployment Environment**     | Local AI integration            | Network service, multi-user deployments |
| **Client Location**            | Same machine                    | Can be remote                           |
| **Number of Clients**          | Single client                   | Multiple clients                        |
| **Security Requirements**      | Process isolation               | Needs additional security measures      |
| **Networking Complexity**      | Minimal                         | Requires network configuration          |
| **Integration Ease**           | Simple for MCP clients          | Works with any HTTP client              |
| **Scaling Approach**           | Multiple processes              | Load balancing, horizontal scaling      |