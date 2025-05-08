# Memory Architecture

The memory system uses a domain-based architecture to organize and manage memories effectively. This document explains the core concepts and implementation details.

## Domain-Based Organization

Memories are organized into domains to provide logical separation and context-specific storage. Each domain represents a distinct context or category of memories.

```mermaid
graph TD
    subgraph File Structure
        D[domains.json] --> G[general.json]
        D --> W[work.json]
        D --> P[personal.json]
        PS[persistence.json]
    end

    subgraph Memory Flow
        M1[New Memory] --> |Domain Check| DC{Domain Exists?}
        DC -->|Yes| SM[Store Memory]
        DC -->|No| CD[Create Domain]
        CD --> SM
    end
```

### File Structure

The system maintains three types of files:

1. `domains.json`: Master list of all memory domains
2. `persistence.json`: Session state tracking
3. `memories/{domain}.json`: Domain-specific memory files

```mermaid
classDiagram
    class DomainInfo {
        +string id
        +string name
        +string description
        +string created
        +string lastAccess
    }
    
    class PersistenceState {
        +string currentDomain
        +string lastAccess
        +string lastMemoryId
    }

    class MemoryNode {
        +string id
        +string content
        +string timestamp
        +string[] tags
        +DomainRef[] domainRefs
    }

    class DomainRef {
        +string domain
        +string nodeId
        +string description
    }

    MemoryNode --> DomainRef
```

## Cross-Domain References

Memories can reference nodes in other domains while maintaining domain isolation. This enables creating connections across contexts while keeping the primary organization clean.

```mermaid
graph LR
    subgraph Work Domain
        W1[Project Plan]
        W2[Meeting Notes]
    end

    subgraph Personal Domain
        P1[Work-Life Balance]
        P2[Personal Goals]
    end

    P1 -->|references| W1
    P2 -->|relates_to| W2
```

## Memory Operations

### Domain Selection
```mermaid
sequenceDiagram
    participant C as Client
    participant M as MemoryGraph
    participant FS as FileSystem

    C->>M: selectDomain('work')
    M->>FS: Save current state
    M->>M: Clear memory state
    M->>FS: Load work domain
    M->>FS: Update persistence
    M->>C: Return domain info
```

### Memory Storage
```mermaid
sequenceDiagram
    participant C as Client
    participant M as MemoryGraph
    participant FS as FileSystem

    C->>M: storeMemory(input)
    M->>M: Create node
    M->>M: Process relationships
    M->>M: Add domain refs
    M->>FS: Save to domain file
    M->>C: Return node
```

### Memory Domain Transfer
```mermaid
sequenceDiagram
    participant C as Client
    participant M as MemoryGraph
    participant FS as FileSystem

    C->>M: editMemory({id, targetDomain})
    M->>M: Validate targetDomain exists
    M->>M: Remove node from source domain
    M->>M: Save source domain state
    M->>M: Switch to target domain
    M->>M: Add node to target domain
    M->>M: Save target domain state
    M->>M: Switch back to original domain
    M->>C: Return updated node
```

## Usage Examples

### Creating a Domain
```typescript
await graph.createDomain(
  'work',
  'Work Domain',
  'Work-related memories'
);
```

### Storing Cross-Domain Memory
```typescript
// Store memory in work domain
const workMemory = await graph.storeMemory({
  content: 'Important project deadline'
});

// Reference work memory from personal domain
await graph.selectDomain('personal');
await graph.storeMemory({
  content: 'Need to balance project work with personal time',
  domainRefs: [{
    domain: 'work',
    nodeId: workMemory.id,
    description: 'Related work project'
  }]
});
```

### Moving Memory Between Domains
```typescript
// Move a memory from the current domain to the 'archives' domain
await graph.editMemory({
  id: 'memory123',
  targetDomain: 'archives'
});

// Edit content and move to another domain in one operation
await graph.editMemory({
  id: 'memory456',
  content: 'Updated content with new information',
  summary: 'Updated project notes',
  targetDomain: 'projects'
});
```

## Best Practices

1. **Domain Organization**
   - Create domains for distinct contexts (work, personal, learning, etc.)
   - Use the general domain for memories that don't fit a specific context
   - Keep domain purposes clear and well-defined

2. **Cross-Domain References**
   - Use sparingly to maintain domain clarity
   - Include descriptive reference text to explain relationships
   - Consider domain boundaries when creating connections

3. **Memory Management**
   - Work primarily in one domain at a time
   - Use tags within domains for finer categorization
   - Regularly review and maintain domain organization

## Implementation Details

The domain-based architecture is implemented through several key components:

```mermaid
graph TD
    subgraph Core Components
        MG[MemoryGraph] --> DM[Domain Manager]
        MG --> MM[Memory Manager]
        MG --> PM[Persistence Manager]
    end

    subgraph Storage Layer
        DM --> |Manages| DF[Domain Files]
        MM --> |Stores| MN[Memory Nodes]
        PM --> |Tracks| PS[Persistence State]
    end

    subgraph Operations
        O1[Create Domain]
        O2[Switch Domain]
        O3[Store Memory]
        O4[Recall Memory]
    end

    MG --> O1
    MG --> O2
    MG --> O3
    MG --> O4
```

### Key Features

1. **Domain Isolation**
   - Each domain has its own memory file
   - Memory operations are scoped to current domain
   - Cross-domain references maintain isolation

2. **State Management**
   - Automatic persistence of session state
   - Last used domain restoration
   - Memory state preservation during switches

3. **Error Handling**
   - Domain existence validation
   - File system error recovery
   - Reference integrity checks
