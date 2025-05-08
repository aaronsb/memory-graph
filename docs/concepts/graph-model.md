# Memory Graph Data Model

This document explains the graph data model that forms the foundation of the Memory Graph MCP. Understanding this model is key to effectively using and extending the system.

## Graph-Based Knowledge Representation

The Memory Graph uses a property graph model to represent knowledge, with:

- **Nodes (Vertices)**: Representing individual memory units
- **Edges**: Representing relationships between memories
- **Properties**: Metadata attached to nodes and edges
- **Domains**: Isolated contexts containing subgraphs

This graph structure allows for flexible, interconnected knowledge representation while maintaining clear organizational boundaries.

## Core Components

### Memory Nodes

Memory nodes are the primary elements in the graph, representing individual units of information:

```typescript
interface MemoryNode {
  id: string;                // Unique identifier
  content: string;           // Main memory content
  timestamp: string;         // Creation time (ISO format)
  path?: string;             // Organizational path (default: "/")
  tags?: string[];           // Categorization labels
  content_summary?: string;  // Optional content summary
  domainRefs?: DomainRef[];  // Cross-domain references
}
```

Key characteristics:
- Each node has unique ID within its domain
- Content holds the primary information
- Path provides hierarchical organization
- Tags enable flexible categorization
- Optional summary provides condensed representation

### Graph Edges

Edges connect memory nodes to represent relationships between pieces of information:

```typescript
interface GraphEdge {
  source: string;     // Source node ID
  target: string;     // Target node ID
  type: string;       // Relationship type
  strength: number;   // Relationship strength (0-1)
  timestamp: string;  // Creation time (ISO format)
}
```

Key characteristics:
- Directional (source → target)
- Typed relationships with semantic meaning
- Weighted connections with strength values
- Temporal tracking of when relationships were established

### Relationship Types

The graph supports various relationship types to express different semantic connections:

| Type | Description | Example |
|------|-------------|---------|
| `follows` | Sequential relationship | Step 1 → Step 2 |
| `relates_to` | General connection | Topic A → Topic B |
| `supports` | Evidential relationship | Evidence → Conclusion |
| `contradicts` | Opposing information | Viewpoint A → Viewpoint B |
| `refines` | Clarifying information | Rough idea → Polished concept |
| `synthesizes` | Combined insights | Source 1 + Source 2 → Summary |

These relationships enable rich knowledge representation and reasoning.

### Domains

Domains provide isolated contexts for organizing memories:

```typescript
interface DomainInfo {
  id: string;          // Unique domain identifier
  name: string;        // Human-readable name
  description: string; // Purpose/scope of the domain
  created: string;     // Creation timestamp
  lastAccess: string;  // Last access timestamp
}
```

Key characteristics:
- Each domain contains its own set of nodes and edges
- Domains separate different conceptual contexts
- Cross-domain references connect information across domains
- Switching between domains changes the active context

### Cross-Domain References

Cross-domain references enable connections between nodes in different domains:

```typescript
interface DomainRef {
  domain: string;       // Target domain
  nodeId: string;       // Target node ID
  description?: string; // Reference context
  bidirectional?: boolean; // Two-way connection
}
```

Key characteristics:
- Maintains domain isolation while enabling connections
- Can be one-way or bidirectional
- Optional description provides context for the reference

## Graph Operations

The graph model supports these core operations:

### Node Operations

- **Creation**: Adding new memory nodes to the graph
- **Retrieval**: Finding nodes by various criteria
- **Update**: Modifying node content and metadata
- **Deletion**: Removing nodes from the graph

### Edge Operations

- **Connection**: Creating relationships between nodes
- **Traversal**: Following connections to explore related memories
- **Strength Adjustment**: Modifying relationship weights
- **Relationship Removal**: Deleting connections between nodes

### Domain Operations

- **Domain Creation**: Establishing new isolated contexts
- **Domain Selection**: Switching the active context
- **Cross-Domain Reference**: Creating connections across domains
- **Domain Transfer**: Moving nodes between domains

## Graph Traversal

Graph traversal is a key operation that allows exploring connected knowledge:

```
           ┌─────────┐
           │Memory A │
           └────┬────┘
                │
                ▼
┌─────────┐    ┌─────────┐    ┌─────────┐
│Memory B │◄───┤Memory C ├───►│Memory D │
└─────────┘    └────┬────┘    └─────────┘
                    │
                    ▼
                ┌─────────┐
                │Memory E │
                └─────────┘
```

Key traversal parameters:
- **Starting Node**: Entry point for exploration
- **Maximum Depth**: How far to follow connections
- **Relationship Types**: Which types of edges to traverse
- **Minimum Strength**: Threshold for connection significance
- **Domain Boundaries**: Whether to cross between domains

## Data Storage

The graph model is implemented in three storage backends:

1. **JSON Storage**:
   - One file per domain
   - Simple in-memory graph implementation
   - Loads complete graph for each domain

2. **SQLite Storage**:
   - Database representation of the graph
   - Tables for nodes, edges, domains, and tags
   - Full-text search capabilities

3. **MariaDB Storage**:
   - Client-server database implementation
   - Same schema model as SQLite
   - Better performance for concurrent access

All implementations maintain the same graph semantics despite different storage mechanisms.

## Memory Node Example

```json
{
  "id": "b8e5c9d2-3f4a-4ea1-9c12-94e1f421b308",
  "content": "The microservices architecture allows for independent scaling of components.",
  "timestamp": "2023-07-15T14:32:18.456Z",
  "path": "/architecture/decisions",
  "tags": ["architecture", "microservices", "scaling"],
  "content_summary": "Microservices enable independent scaling"
}
```

## Graph Edge Example

```json
{
  "source": "b8e5c9d2-3f4a-4ea1-9c12-94e1f421b308",
  "target": "7a2f8b6d-5c9e-4d12-8e3f-1a9b7c8d6e5f",
  "type": "relates_to",
  "strength": 0.8,
  "timestamp": "2023-07-15T14:35:22.789Z"
}
```

## Domain Example

```json
{
  "id": "technical-architecture",
  "name": "Technical Architecture",
  "description": "Architectural decisions and system design documentation",
  "created": "2023-06-01T09:12:34.567Z",
  "lastAccess": "2023-07-15T14:30:00.123Z"
}
```

## Implementation Considerations

When working with the graph model, consider these aspects:

1. **Node Granularity**: Decide how to divide information into nodes
2. **Relationship Semantics**: Choose appropriate relationship types
3. **Domain Boundaries**: Determine logical separation of contexts
4. **Traversal Patterns**: Plan how to navigate the graph effectively
5. **Storage Performance**: Select appropriate backend for scale