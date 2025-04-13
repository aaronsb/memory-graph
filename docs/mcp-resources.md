# Memory Graph MCP Resources

This document describes the Model Context Protocol (MCP) resources provided by the memory-graph server. These resources allow AI models to access information about the memory graph structure, including domains, relationships, tags, and essential memories.

## Available Resources

### 1. Domain Statistics

**URI:** `memory://domains/statistics`

**Description:** Statistics about memory domains including counts and timestamps.

**Response Format:**
```json
{
  "domains": [
    {
      "id": "domain_id",
      "name": "Domain Name",
      "description": "Domain description",
      "created": "ISO timestamp",
      "lastAccess": "ISO timestamp",
      "statistics": {
        "memoryCount": 0,
        "firstMemoryDate": "ISO timestamp or null",
        "lastMemoryDate": "ISO timestamp or null"
      }
    }
  ]
}
```

**Use Cases:**
- Get an overview of available domains
- Determine which domains are most active
- Find domains with the most memories

### 2. Memory Edge Filter Terms

**URI:** `memory://edges/filter-terms`

**Description:** Available relationship types for filtering memory edges, with frequency counts.

**Response Format:**
```json
{
  "filterTerms": [
    {
      "type": "relationship_type",
      "frequency": 1
    }
  ]
}
```

**Use Cases:**
- Discover available relationship types for filtering
- Identify the most common relationship types
- Use in conjunction with the `recall_memories` tool to filter by relationship type

### 3. Popular Tags

**URI:** `memory://tags/popular`

**Description:** Most frequently used memory tags (top 10).

**Response Format:**
```json
{
  "popularTags": [
    {
      "tag": "tag_name",
      "frequency": 1
    }
  ]
}
```

If no tags are available:
```json
{
  "popularTags": [],
  "message": "No tags available in the memory graph"
}
```

**Use Cases:**
- Discover common themes across memories
- Use popular tags for filtering memories
- Understand the taxonomy of the knowledge graph

### 4. Essential Priority Memories

**URI:** `essential_priority://domains`

**Description:** Top-level memories that provide essential context for each domain, prioritized by graph metrics.

**Response Format:**
```json
{
  "domains": [
    {
      "id": "domain_id",
      "name": "Domain Name",
      "description": "Domain description",
      "essentialMemories": [
        {
          "id": "memory_id",
          "content": "Memory content",
          "timestamp": "ISO timestamp",
          "importanceScore": 12.5,
          "graphMetrics": {
            "connectionCount": 2,
            "strengthSum": 1.5,
            "keyRelationships": 1,
            "averageStrength": 0.75
          },
          "tags": ["tag1", "tag2"]
        }
      ]
    }
  ]
}
```

If no memories are available:
```json
{
  "domains": [],
  "message": "No memories available in the memory graph"
}
```

**Use Cases:**
- Get immediate context about the most important memories in each domain
- Understand the core concepts in a domain without traversing the entire graph
- Prioritize memories based on their centrality and importance in the graph structure

## Importance Score Calculation

The importance score for essential priority memories is calculated using a weighted formula based on graph metrics:

```
importanceScore = (connectionCount * 2) + (strengthSum * 3) + (keyRelationships * 4)
```

Where:
- `connectionCount`: Number of connections to/from the memory (degree centrality)
- `strengthSum`: Sum of relationship strengths for all connections
- `keyRelationships`: Number of high-value relationship types (e.g., "synthesizes", "summarizes", "relates_to")

This formula prioritizes memories that are:
1. Well-connected to other memories
2. Have strong relationships
3. Have high-value relationship types

## Implementation Details

The resources are implemented in the `MemoryResources` class in `src/resources/memoryResources.ts`. The class uses SQL queries to extract data from the SQLite database and format it for the MCP resources.

The MCP server is configured to expose these resources in `src/index.ts`, where the resource handlers are set up to handle resource requests.
