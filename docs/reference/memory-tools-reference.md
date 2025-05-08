# Memory Tools Reference

This document provides a comprehensive reference for all tools available in the Memory Graph MCP. Each tool is described with its purpose, parameters, usage examples, and best practices.

## Table of Contents

1. [Domain Management Tools](#domain-management-tools)
   - [select_domain](#select_domain)
   - [list_domains](#list_domains)
   - [create_domain](#create_domain)

2. [Memory Management Tools](#memory-management-tools)
   - [store_memory](#store_memory)
   - [recall_memories](#recall_memories)
   - [edit_memory](#edit_memory)
   - [forget_memory](#forget_memory)

3. [Visualization Tools](#visualization-tools)
   - [generate_mermaid_graph](#generate_mermaid_graph)

4. [Search Tools](#search-tools)
   - [search_memory_content](#search_memory_content)
   - [traverse_memories](#traverse_memories)

## Domain Management Tools

### select_domain

Switch to a different memory domain.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Domain identifier to switch to |

#### Response

Returns domain information for the selected domain.

#### Example

```json
{
  "id": "select_domain",
  "params": {
    "id": "personal-journal"
  }
}
```

#### Best Practices

- Always save your work in the current domain before switching to another domain
- Use domain switching sparingly to maintain context
- Consider using domain references instead if you only need to reference information from another domain

---

### list_domains

List all available memory domains.

#### Parameters

None

#### Response

Returns information about all domains, including:
- List of domain objects with id, name, description, created and lastAccess timestamps
- Current domain indicator

#### Example

```json
{
  "id": "list_domains",
  "params": {}
}
```

#### Best Practices

- Use this tool to discover available domains before performing domain-specific operations
- Check the timestamps to understand which domains are actively used

---

### create_domain

Create a new memory domain.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Unique identifier for the domain |
| name | string | Yes | Human-readable name for the domain |
| description | string | Yes | Purpose or scope of the domain |

#### Response

Returns the created domain information.

#### Example

```json
{
  "id": "create_domain",
  "params": {
    "id": "technical-documentation",
    "name": "Technical Documentation",
    "description": "Documentation for technical systems and architecture"
  }
}
```

#### Best Practices

- Use descriptive IDs that reflect the domain purpose (e.g., "project-management", "personal-journal")
- Provide a clear description to help understand the domain's scope
- Create separate domains for distinctly different contexts or projects
- Don't create too many domains – aim for a balance between separation and manageability

## Memory Management Tools

### store_memory

Store new information in the memory graph.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| content | string | Yes | Main memory content |
| path | string | No | Organizational path (default: "/") |
| tags | string[] | No | Array of tags for categorization |
| relationships | object | No | Relationships to other memories |
| domainRefs | object[] | No | References to memories in other domains |
| domainPointer | object | No | Pointer to another domain (for cross-domain connections) |

#### Relationship Types

- `follows`: Sequential relationship (memory A happens after memory B)
- `relates_to`: General connection between memories
- `supports`: Memory provides evidence/support for another
- `contradicts`: Memory contradicts another
- `refines`: Memory clarifies or extends another
- `synthesizes`: Memory combines insights from others

#### Relationship Format

```json
"relationships": {
  "relationship_type": [
    {
      "targetId": "target_memory_id",
      "strength": 0.8  // 0.0 to 1.0, higher means stronger connection
    }
  ]
}
```

#### Domain Reference Format

```json
"domainRefs": [
  {
    "domain": "target_domain_id",
    "nodeId": "target_memory_id",
    "description": "Optional context for the reference"
  }
]
```

#### Response

Returns the created memory node with its ID and timestamp.

#### Example

```json
{
  "id": "store_memory",
  "params": {
    "content": "The microservices architecture we chose allows for independent scaling of components, improving overall system resilience.",
    "path": "/architecture/decisions",
    "tags": ["architecture", "microservices", "scaling"],
    "relationships": {
      "relates_to": [
        {
          "targetId": "previous_memory_id",
          "strength": 0.9
        }
      ]
    }
  }
}
```

#### Best Practices

- Keep memory content focused on a single topic or insight
- Use consistent paths to organize related information
- Add relevant tags to improve searchability
- Create explicit relationships to build a connected knowledge graph
- Use relationship strength to indicate confidence or importance
- For cross-domain relationships, use domainRefs to maintain separation with connections

---

### recall_memories

Retrieve memories using various strategies.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| maxNodes | number | Yes | Maximum number of nodes to return |
| strategy | string | Yes | Search strategy: recent, related, path, tag, content, combinedStrategy |
| startNodeId | string | No | Required for 'related' strategy |
| path | string | No | Required for 'path' strategy |
| tags | string[] | No | Required for 'tag' strategy |
| search | object | No | Required for 'content' strategy |
| relationshipTypes | string[] | No | Filter by relationship types |
| minStrength | number | No | Minimum relationship strength (0-1) |
| before | string | No | Only include memories before this timestamp |
| after | string | No | Only include memories after this timestamp |
| combinedStrategy | object | No | Use multiple strategies together |
| sortBy | string | No | Sort by: "relevance", "date", or "strength" |
| matchDetails | boolean | No | Include details about matched content |

#### Search Options Format

```json
"search": {
  "keywords": ["term1", "term2"],
  "fuzzyMatch": true,
  "regex": false,
  "caseSensitive": false
}
```

#### Combined Strategy Format

```json
"combinedStrategy": {
  "recent": { "maxNodes": 5 },
  "path": { "path": "/architecture", "maxNodes": 5 },
  "tag": { "tags": ["microservices"], "maxNodes": 5 }
}
```

#### Response

Returns an array of memory nodes matching the search criteria.

#### Example

```json
{
  "id": "recall_memories",
  "params": {
    "maxNodes": 10,
    "strategy": "combinedStrategy",
    "combinedStrategy": {
      "path": {
        "path": "/architecture/decisions",
        "maxNodes": 5
      },
      "tag": {
        "tags": ["microservices"],
        "maxNodes": 5
      }
    },
    "sortBy": "date"
  }
}
```

#### Best Practices

- Start with a specific strategy that matches your retrieval needs
- Use combinedStrategy for more comprehensive searches
- Limit maxNodes appropriately to focus on most relevant results
- Consider using matchDetails: true when searching content to see what matched
- Use sortBy to control how results are ordered
- For path strategy, use broader paths for wider searches, more specific paths for focused recall
- When searching by tags, include multiple related tags for better results

---

### edit_memory

Edit an existing memory's content and relationships.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Memory ID to edit |
| content | string | No | Updated memory content |
| path | string | No | Updated organizational path |
| tags | string[] | No | Updated tags |
| relationships | object | No | Updated relationships |
| domainRefs | object[] | No | Updated domain references |
| targetDomain | string | No | Domain to move memory to |

#### Response

Returns the updated memory node.

#### Example

```json
{
  "id": "edit_memory",
  "params": {
    "id": "memory123",
    "content": "Updated content with more details about the microservices architecture.",
    "tags": ["architecture", "microservices", "scaling", "resilience"],
    "relationships": {
      "relates_to": [
        {
          "targetId": "memory456",
          "strength": 0.8
        }
      ]
    }
  }
}
```

#### Example (Moving to Another Domain)

```json
{
  "id": "edit_memory",
  "params": {
    "id": "memory123",
    "targetDomain": "archived-decisions"
  }
}
```

#### Best Practices

- Only provide parameters that need to change (unchanged fields will keep their current values)
- When providing relationships, the entire relationships object is replaced (not merged)
- When moving to another domain (targetDomain), verify the target domain exists first
- Consider copying important relationships when moving between domains
- Remember that moving a memory may affect other memories that reference it in the source domain

---

### forget_memory

Remove a memory from the graph.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Memory ID to remove |
| cascade | boolean | No | Whether to also remove connected memories (default: false) |

#### Response

Returns success status.

#### Example

```json
{
  "id": "forget_memory",
  "params": {
    "id": "memory123",
    "cascade": false
  }
}
```

#### Best Practices

- Use forget_memory sparingly, as deleted memories cannot be recovered
- Consider editing or archiving memories instead of deleting them
- Be very careful with cascade: true, as it can remove multiple connected memories
- Always verify the memory ID before deleting
- Consider using targetDomain with edit_memory to move to an archive domain instead of permanent deletion

## Visualization Tools

### generate_mermaid_graph

Generate a Mermaid flowchart visualization of memory relationships.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startNodeId | string | Yes | Starting memory ID for the graph |
| maxDepth | number | No | Maximum depth of relationships to traverse (1-5, default: 2) |
| direction | string | No | Graph direction: 'TB', 'BT', 'LR', 'RL' (default: 'LR') |
| relationshipTypes | string[] | No | Filter specific relationship types |
| minStrength | number | No | Minimum relationship strength (0-1) |
| contentFormat | object | No | Options for formatting node content |

#### Content Format Options

```json
"contentFormat": {
  "maxLength": 50,
  "truncationSuffix": "...",
  "includeTimestamp": false,
  "includeId": false
}
```

#### Response

Returns a Mermaid graph definition string that can be rendered as a flowchart.

#### Example

```json
{
  "id": "generate_mermaid_graph",
  "params": {
    "startNodeId": "memory123",
    "maxDepth": 3,
    "direction": "LR",
    "relationshipTypes": ["follows", "relates_to"],
    "minStrength": 0.6,
    "contentFormat": {
      "maxLength": 60,
      "truncationSuffix": "...",
      "includeTimestamp": false,
      "includeId": true
    }
  }
}
```

#### Best Practices

- Choose direction based on relationship semantics:
  - LR/RL: For showing flow/progression
  - TB/BT: For hierarchical relationships
- Adjust maxDepth (1-5) to control visualization complexity
- Use minStrength to filter for stronger relationships
- Filter relationshipTypes for focused views
- For large memory graphs, start with a smaller maxDepth (1-2) and increase if needed
- Include node IDs (includeId: true) if you need to reference specific nodes in follow-up operations

## Search Tools

### search_memory_content

Search for memories using full-text search capabilities.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | Yes | Search query text |
| domain | string | No | Optional domain to restrict search to |
| maxResults | number | No | Maximum number of results to return (default: 20) |

#### Response

Returns an array of memory nodes matching the search query.

#### Example

```json
{
  "id": "search_memory_content",
  "params": {
    "query": "microservices architecture resilience",
    "domain": "technical-documentation",
    "maxResults": 15
  }
}
```

#### Best Practices

- Use specific, targeted terms in your query
- Include synonyms or related terms to broaden the search
- For SQLite and MariaDB storage backends, this uses full-text search capabilities
- When using JSON storage, be aware that search is more limited and based on basic string matching
- Use the maxResults parameter to control the number of results, especially for broad queries

---

### traverse_memories

Traverse the memory graph following relationships and domain pointers.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startNodeId | string | No | Starting memory ID (uses recent memory if not specified) |
| maxDepth | number | No | Maximum depth of relationships to traverse (default: 2) |
| followDomainPointers | boolean | No | Whether to follow connections across domains (default: true) |
| targetDomain | string | No | Optional specific domain to traverse |
| maxNodesPerDomain | number | No | Maximum number of nodes to return per domain (default: 20) |

#### Response

Returns a hierarchical representation of connected memories, showing both incoming and outgoing relationships.

#### Example

```json
{
  "id": "traverse_memories",
  "params": {
    "startNodeId": "memory123",
    "maxDepth": 3,
    "followDomainPointers": true,
    "maxNodesPerDomain": 15
  }
}
```

#### Best Practices

- Use traverse_memories when you want to explore the connection network around a specific memory
- This differs from recall_memories by providing a more narrative, hierarchical view of connections
- Especially useful for understanding how different pieces of information relate to each other
- Increase maxDepth gradually to avoid overwhelming results
- When working across multiple domains, use followDomainPointers: true to see the full picture
- If a specific domain is of interest, use targetDomain to focus the traversal