# Technical Context

## Technologies Used
- TypeScript/Node.js
- @modelcontextprotocol/sdk
- @modelcontextprotocol/sdk/server
- @modelcontextprotocol/sdk/types

## Development Setup
1. Node.js Environment
   - Node.js runtime
   - npm package manager
   - TypeScript compiler

2. Project Structure
   ```
   memory-graph/
   ├── src/
   │   ├── index.ts           # Main server entry
   │   ├── graph/             # Knowledge graph implementation
   │   ├── tools/             # MCP tool implementations
   │   └── types/             # TypeScript type definitions
   ├── tests/                 # Test files
   ├── tsconfig.json          # TypeScript configuration
   └── package.json           # Project dependencies
   ```

## Technical Constraints
1. MCP Protocol Requirements
   - Must implement MCP Server interface
   - Must use StdioServerTransport
   - Must handle tool requests/responses

2. Data Storage
   - Local file system based
   - JSON format for persistence
   - Configurable storage path

3. Type Safety
   - Strict TypeScript configuration
   - Type definitions for all interfaces
   - Input validation for tools

4. Error Handling
   - Proper MCP error responses
   - Graceful failure handling
   - Error logging
