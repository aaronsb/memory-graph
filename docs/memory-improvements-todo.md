# Memory Graph Improvements - Todo List

This document outlines the planned improvements to the memory-graph architecture based on our experience with cross-domain references and memory traversal.

## 1. Enhanced Domain Pointer References

### Overview
Improve the domain reference system to make cross-domain memory connections more fluid and intuitive, while maintaining bidirectional relationships when appropriate.

### Tasks

- [x] **Update Types**
  - [x] Extend `StoreMemoryInput` interface to include domain pointer attributes:
    ```typescript
    interface StoreMemoryInput {
      // Existing fields...
      domainPointer?: {
        domain: string;
        entryPointId?: string;  // Optional - system finds best entry point if not specified
        bidirectional: boolean; // Default to true
        description?: string;
      };
    }
    ```
  - [x] Update `MemoryNode` interface to better support domain pointers

- [x] **Modify Memory Storage**
  - [x] Update `storeMemory` function in `MemoryGraph.ts` to handle domain pointers
  - [x] Implement bidirectional reference creation when flag is set
  - [x] Add validation to ensure target domain exists

- [x] **Cross-Domain Relationship Handling**
  - [x] Create helper function to establish cross-domain relationships
  - [x] Implement logic to find appropriate entry point when not specified
  - [x] Add error handling for invalid domain references

## 2. Traverse Memories Tool

### Overview
Create a new tool that provides a connected view of the memory graph, emphasizing relationships and connections between memories, with the ability to follow paths across domain boundaries automatically.

### Tasks

- [x] **Define Tool Interface**
  - [x] Add new tool definition to `MEMORY_TOOLS` in `memoryTools.ts`:
    ```typescript
    traverse_memories: {
      name: 'traverse_memories' as ToolName,
      description: 'Traverse the memory graph following relationships and domain pointers',
      inputSchema: {
        type: 'object',
        properties: {
          startNodeId: {
            type: 'string',
            description: 'Optional starting memory ID (uses recent memory if not specified)',
          },
          maxDepth: {
            type: 'number',
            description: 'Maximum depth of relationships to traverse',
            minimum: 1,
            maximum: 5,
            default: 2,
          },
          followDomainPointers: {
            type: 'boolean',
            description: 'Whether to follow connections across domains',
            default: true,
          },
          targetDomain: {
            type: 'string',
            description: 'Optional specific domain to traverse',
          },
          maxNodesPerDomain: {
            type: 'number',
            description: 'Maximum number of nodes to return per domain',
            default: 20,
          },
        },
        required: [],
      },
    }
    ```
  - [x] Add corresponding type definition in `graph.ts`:
    ```typescript
    export interface TraverseMemoriesInput {
      startNodeId?: string;
      maxDepth?: number;
      followDomainPointers?: boolean;
      targetDomain?: string;
      maxNodesPerDomain?: number;
    }
    ```

- [x] **Implement Traversal Logic**
  - [x] Create `traverseMemories` method in `MemoryGraph.ts`
  - [x] Implement breadth-first or depth-first traversal algorithm
  - [x] Add support for crossing domain boundaries
  - [x] Handle circular references to prevent infinite loops
  - [x] Implement domain-specific node limits

- [x] **Format Output**
  - [x] Create a narrative, hierarchical text format for the output
  - [x] Include full memory content without truncation
  - [x] Show both incoming and outgoing connections
  - [x] Clearly mark cross-domain connections
  - [x] Include traversal context (starting point, depth, domains)

- [x] **Add Tool Handler**
  - [x] Implement `handleTraverseMemories` method in `MemoryTools` class
  - [x] Add case to `handleToolCall` switch statement
  - [x] Include appropriate error handling



## 3. Testing

Develop tests after working out the operating principle of the feature improvement first.

- [ ] **Unit Tests**
  - [ ] Test domain pointer creation
  - [ ] Test bidirectional references
  - [ ] Test traverse_memories with various parameters
  - [ ] Test cross-domain traversal

- [ ] **Integration Tests**
  - [ ] Test complete workflows across multiple domains
  - [ ] Verify output format is as expected
  - [ ] Test error handling and edge cases

## 4. Documentation

- [ ] **Update Architecture Documentation**
  - [ ] Add domain pointer reference section to `memoryArchitecture.md`
  - [ ] Document traverse_memories tool usage and examples
  - [ ] Update diagrams to show cross-domain relationships

- [ ] **Add Usage Examples**
  - [ ] Create examples of domain pointer creation
  - [ ] Provide sample traverse_memories queries and outputs
  - [ ] Document best practices for cross-domain memory organization

## Implementation Notes

1. Keep the system "fluid" by treating domain pointers as natural memory attributes rather than rigid structures
2. Ensure the traverse_memories tool provides a distinct value compared to recall_memories
3. Preserve full memory content and relationships in the traversal output
4. Use actual memory IDs for precise reference while providing human-readable context
5. Defer memory indexing improvements until transitioning to a SQLite-based storage approach
