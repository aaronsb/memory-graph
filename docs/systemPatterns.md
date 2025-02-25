# System Patterns

## Architecture
- MCP Server architecture using @modelcontextprotocol/sdk
- Local knowledge graph for data persistence
- TypeScript/Node.js implementation

## Key Technical Decisions
1. Knowledge Graph Structure
   - Graph-based data model for flexible relationship mapping
   - Nodes represent memory units with metadata
   - Edges represent relationships between memories
   - Customizable memory paths for organization

2. Data Persistence
   - Local file system storage
   - JSON-based data format
   - Configurable storage location

3. MCP Integration
   - Implements MCP Server interface
   - Provides tools for memory operations
   - Uses StdioServerTransport for communication

## Design Patterns
1. Server Pattern
   - Single instance MCP server
   - Handles tool requests and responses
   - Manages memory graph operations

2. Repository Pattern
   - Abstracts knowledge graph data access
   - Handles CRUD operations for memory nodes
   - Manages relationships between nodes

3. Tool Pattern
   - Implements MCP tool interface
   - Provides memory management operations
   - Handles input validation and error handling

4. Visualization Pattern
   - MermaidGenerator for graph visualization
   - Configurable node content formatting
   - Flexible graph traversal and filtering
   - Customizable visual representation

## Visualization Architecture
1. Content Formatting
   - MermaidContentFormat interface for configuration
   - Customizable content truncation
   - Optional metadata display (IDs, timestamps)
   - Extensible formatting options

2. Graph Generation
   - BFS traversal with depth control
   - Relationship type filtering
   - Strength-based edge filtering
   - Configurable graph direction

3. Node Representation
   - Structured node content formatting
   - Metadata integration
   - Escaped special characters
   - Consistent indentation and layout
