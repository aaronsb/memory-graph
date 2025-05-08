# HTTP Transport

HTTP transport provides network-based communication for Memory Graph MCP, enabling remote access and multi-user capabilities.

## Overview

The HTTP transport enables communication over the network using a RESTful HTTP API, making it suitable for remote access and multi-user deployments.

```
┌─────────────┐                ┌─────────────────┐
│             │    HTTP/JSON   │                 │
│  MCP Client ├───────────────►│ Memory Graph    │
│  (Any HTTP  │◄───────────────┤ MCP Server      │
│   Client)   │                │                 │
└─────────────┘                └─────────────────┘
      HTTP(S) Protocol
```

## How HTTP Transport Works

1. The server listens for HTTP requests on a configured port
2. Clients send JSON-RPC requests as HTTP POST bodies to the endpoint
3. The server processes the requests and executes the appropriate tools
4. The server sends JSON-RPC responses back as HTTP responses
5. Multiple clients can connect simultaneously

## Configuration

To use HTTP transport, set the appropriate environment variables:

```bash
# Enable HTTP transport
TRANSPORT_TYPE=HTTP

# Required HTTP settings
PORT=3000  # Port to listen on

# Optional HTTP settings
HOST=127.0.0.1  # Default, listens on localhost only
```

To allow connections from other machines, use:

```bash
HOST=0.0.0.0  # Listen on all interfaces
```

### MCP Configuration Example

When configuring an AI assistant to use Memory Graph MCP with HTTP transport:

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
        "HOST": "127.0.0.1"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

### Docker Configuration

When using Docker with HTTP transport, map the container port to a host port:

```bash
docker run \
  -v /path/to/data:/app/data \
  -e MEMORY_DIR=/app/data \
  -e TRANSPORT_TYPE=HTTP \
  -e PORT=3000 \
  -p 3000:3000 \
  ghcr.io/aaronsb/memory-graph:latest
```

## API Endpoint

The HTTP transport exposes a single endpoint for JSON-RPC communication:

```
POST /
Content-Type: application/json
```

Request body:

```json
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

```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "JSON-serialized tool result"
      }
    ]
  }
}
```

Error response:

```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "error": {
    "code": -32603,
    "message": "Error message"
  }
}
```

## Testing HTTP Transport

You can test the HTTP endpoint using curl:

```bash
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "test-request",
    "method": "tool",
    "params": {
      "name": "list_domains",
      "input": {}
    }
  }'
```

## Custom HTTP Client Implementation

If you need to implement a custom client for the HTTP transport:

```typescript
// Example HTTP client implementation
async function callMemoryGraphTool(toolName: string, input: any) {
  const response = await fetch('http://localhost:3000', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: crypto.randomUUID(),
      method: 'tool',
      params: {
        name: toolName,
        input: input
      }
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }
  
  const result = await response.json();
  
  if (result.error) {
    throw new Error(`RPC error: ${result.error.message}`);
  }
  
  return JSON.parse(result.result.content[0].text);
}

// Example usage
const domains = await callMemoryGraphTool('list_domains', {});
console.log(domains);
```

## Advantages

- **Remote Access**: Accessible from anywhere on the network
- **Multiple Clients**: Multiple clients can connect simultaneously
- **Standard Protocol**: Uses standard HTTP protocol
- **Tooling**: Can use standard HTTP tools and libraries
- **Integration**: Easy integration with web applications
- **Persistence**: Server can continue running independently of clients

## Limitations

- **Network Exposure**: Requires proper security measures
- **Configuration**: Requires more configuration than STDIO
- **Resources**: Uses more system resources
- **Firewall**: May require firewall configuration
- **Overhead**: Additional overhead from HTTP protocol

## When to Use HTTP Transport

HTTP transport is ideal for:
- Remote access to the Memory Graph MCP
- Multi-user environments
- Integration with web applications
- Dockerized deployments
- Scenarios requiring persistent server
- Applications where the client and server are on different machines

## Docker Networking Considerations

When running Memory Graph MCP with HTTP transport in Docker:

### Standard Port Mapping

```bash
docker run \
  -p 3000:3000 \  # Map container port to host port
  -e TRANSPORT_TYPE=HTTP \
  -e PORT=3000 \
  ghcr.io/aaronsb/memory-graph:latest
```

### Host Network Mode

```bash
docker run \
  --network=host \  # Use host network directly
  -e TRANSPORT_TYPE=HTTP \
  -e PORT=3000 \
  ghcr.io/aaronsb/memory-graph:latest
```

### Docker Compose

```yaml
version: '3'
services:
  memory-graph:
    image: ghcr.io/aaronsb/memory-graph:latest
    volumes:
      - ./data:/app/data
    environment:
      - MEMORY_DIR=/app/data
      - TRANSPORT_TYPE=HTTP
      - PORT=3000
      - HOST=0.0.0.0
    ports:
      - "3000:3000"
```

## Security Considerations

When using HTTP transport, consider these security measures:

1. **Network Isolation**: By default, the server only listens on localhost (127.0.0.1)
2. **Firewall Rules**: Restrict access to the HTTP port
3. **Reverse Proxy**: Place behind a secure reverse proxy (e.g., Nginx with SSL)
4. **Authentication**: Implement authentication middleware if needed
5. **Access Control**: Configure appropriate tool permissions
6. **HTTPS**: Use HTTPS for encryption in production environments

### Adding Authentication

For production use, consider implementing authentication:

```typescript
import express from 'express';
import { HttpServerTransport } from '@anthropic-ai/mcp';

const app = express();

// Simple API key authentication middleware
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// Create and use the HTTP transport with the Express app
const transport = new HttpServerTransport({ app });
// ... rest of server setup
```

## Implementation Details

The HTTP transport is implemented using Express.js. The server:

1. Creates an Express application
2. Sets up middleware for JSON parsing
3. Creates an endpoint to handle JSON-RPC requests
4. Validates and processes incoming requests
5. Returns responses with appropriate HTTP status codes

## Performance Considerations

For optimal performance with HTTP transport:

1. **Connection Pooling**: When using MariaDB, adjust connection pool size based on expected client load
2. **Request Rate**: Consider implementing rate limiting for high-traffic scenarios
3. **Response Size**: Large memory sets may require pagination or result limiting
4. **Timeouts**: Configure appropriate request timeouts for long-running operations