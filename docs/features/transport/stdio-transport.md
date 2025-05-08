# STDIO Transport

STDIO transport is the default communication mechanism for Memory Graph MCP, using standard input and output streams for JSON-RPC communication.

## Overview

The STDIO transport enables direct process-to-process communication, making it ideal for integration with AI assistants and other systems that can spawn and communicate with child processes.

```
┌─────────────┐                ┌─────────────────┐
│             │    JSON-RPC    │                 │
│  MCP Client ├───────────────►│ Memory Graph    │
│  (e.g., AI) │◄───────────────┤ MCP Server      │
│             │                │                 │
└─────────────┘                └─────────────────┘
      stdin/stdout streams
```

## How STDIO Transport Works

1. The client (e.g., an AI assistant) spawns the Memory Graph MCP server as a child process
2. The client sends JSON-RPC requests to the server's standard input
3. The server processes the requests and executes the appropriate tools
4. The server sends JSON-RPC responses to standard output
5. The client reads and processes these responses

## Configuration

STDIO transport is the default transport type and requires minimal configuration:

```bash
# STDIO transport (default, can be omitted)
TRANSPORT_TYPE=STDIO
```

In addition, you can enable Strict Mode to ensure clean separation of JSON-RPC communication and logging:

```bash
# Enable Strict Mode (recommended)
STRICT_MODE=true
```

### MCP Configuration Example

When configuring an AI assistant to use Memory Graph MCP with STDIO transport:

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

### Docker Configuration

When using Docker with STDIO transport, use the `-i` flag to keep stdin open:

```bash
docker run -i \
  -v /path/to/data:/app/data \
  -e MEMORY_DIR=/app/data \
  -e STORAGE_TYPE=sqlite \
  -e STRICT_MODE=true \
  ghcr.io/aaronsb/memory-graph:latest
```

## JSON-RPC Protocol

The STDIO transport uses the JSON-RPC 2.0 protocol for communication:

### Request Format

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

### Response Format

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

### Error Response

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

## Strict Mode

The STDIO transport can be used with Strict Mode enabled, which ensures proper separation of JSON-RPC messages and logging information:

```bash
STRICT_MODE=true
```

When Strict Mode is enabled:
1. All proper JSON-RPC communication goes to stdout
2. All informational logging is redirected to stderr

This ensures that the stdout stream contains only valid JSON-RPC messages, preventing parsing errors in MCP clients.

### Problem Addressed by Strict Mode

Some MCP clients have difficulty handling mixed output on stdio where both error messages and informational logging get mingled in the JSON-RPC stream. This can lead to errors like:

```
SyntaxError: Unexpected token 'S', "STORAGE_TYPE: sqlite" is not valid JSON
```

## Advantages

- **Simplicity**: No network configuration required
- **Security**: No network exposure
- **Direct Communication**: Lower latency for local usage
- **No Dependencies**: Doesn't require HTTP server setup
- **Process Isolation**: Security through process boundaries

## Limitations

- **Single Client**: Only one client can connect at a time
- **Same Machine**: Client must be on the same machine as the server
- **No API Access**: Can't be accessed by external tools
- **Process Lifetime**: Server lives and dies with the client process

## When to Use STDIO Transport

STDIO transport is ideal for:
- Direct integration with AI assistants through MCP
- Local usage where client and server run on the same machine
- Simple deployments without network configuration
- Single-user environments
- Scenarios where security is managed through process isolation

## Implementation Details

The STDIO transport is implemented using the `StdioServerTransport` class from the `@anthropic-ai/mcp` SDK. This class:

1. Reads JSON-RPC requests from stdin
2. Validates and parses the requests
3. Dispatches the requests to the appropriate tool handlers
4. Serializes the responses to stdout

## Debugging

When debugging applications using STDIO transport:

1. Set `STRICT_MODE=true` to ensure logging and JSON-RPC communication are separated
2. Examine stderr for logs and diagnostic information
3. Use tools like `tee` to capture both stdout and stderr output:
   ```bash
   node /path/to/index.js 2> server.log | tee client.log
   ```

## Security Considerations

While STDIO transport doesn't expose network services, security considerations include:

1. **File Permissions**: Ensure the server executable and data files have appropriate permissions
2. **Input Validation**: All input from stdin is validated before processing
3. **Tool Permissions**: Configure appropriate auto-approve settings for tools
4. **Environment Variables**: Protect sensitive environment variables (e.g., database credentials)