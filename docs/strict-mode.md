# Strict Mode for JSON-RPC Communication

## Overview

The Memory Graph MCP server implements a "strict mode" configuration option to ensure proper separation of JSON-RPC messages and logging information. This feature addresses issues where informational logging output sent to stdout can interfere with the JSON-RPC communication stream, causing parsing errors in MCP clients.

## Problem

Some MCP clients have difficulty handling mixed output on stdio where both error messages and informational logging get mingled in the JSON-RPC stream. This can lead to errors like:

```
SyntaxError: Unexpected token 'S', "STORAGE_TYPE: sqlite" is not valid JSON
```

This occurs because the client expects only valid JSON-RPC messages on stdout, but informational logging (like "STORAGE_TYPE: sqlite") is being sent to the same stream.

## Solution

The strict mode configuration ensures that:

1. All proper JSON-RPC communication goes to stdout
2. All informational logging is redirected to stderr

When strict mode is enabled, the server will ensure that only valid JSON-RPC messages are sent to stdout, preventing parsing errors in MCP clients.

## Implementation

The strict mode is implemented by:

1. Adding a `STRICT_MODE` environment variable configuration option
2. Modifying all `console.log` calls to use `console.error` when strict mode is enabled
3. Ensuring all error and informational logging consistently uses `console.error`

This implementation ensures that the stdout stream contains only valid JSON-RPC messages, while all logging information is sent to stderr.

## Usage

To enable strict mode, set the `STRICT_MODE` environment variable to `true` in your MCP configuration:

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

For Docker deployments:

```json
{
  "mcpServers": {
    "memory-graph": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-v", "/path/to/data:/app/data",
        "-e", "MEMORY_DIR=/app/data",
        "-e", "STORAGE_TYPE=sqlite",
        "-e", "STRICT_MODE=true",
        "ghcr.io/[owner]/memory-graph:latest"
      ],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

## Recommendations

It is recommended to always enable strict mode when using the Memory Graph MCP server with Claude or other MCP clients that expect clean JSON-RPC communication. This will prevent parsing errors and ensure reliable operation.
