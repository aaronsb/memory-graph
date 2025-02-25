# Memory Graph Improvements - Todo List

This document outlines the planned improvements to the memory-graph architecture based on our experience with cross-domain references and memory traversal.

## 1. Enhanced Domain Pointer References

### Overview
Improve the domain reference system to make cross-domain memory connections more fluid and intuitive, while maintaining bidirectional relationships when appropriate.

### Tasks

- [ ] **Update Types**
  - [ ] Extend `StoreMemoryInput` interface to include domain pointer attributes:
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
  - [ ] Update `MemoryNode` interface to better support domain pointers

- [ ] **Modify Memory Storage**
  - [ ] Update `storeMemory` function in `MemoryGraph.ts` to handle domain pointers
  - [ ] Implement bidirectional reference creation when flag is set
  - [ ] Add validation to ensure target domain exists

- [ ] **Cross-Domain Relationship Handling**
  - [ ] Create helper function to establish cross-domain relationships
  - [ ] Implement logic to find appropriate entry point when not specified
  - [ ] Add error handling for invalid domain references

## 2. Traverse Memories Tool

### Overview
Create a new tool that provides a connected view of the memory graph, emphasizing relationships and connections between memories, with the ability to follow paths across domain boundaries automatically.

### Tasks

- [ ] **Define Tool Interface**
  - [ ] Add new tool definition to `MEMORY_TOOLS` in `memoryTools.ts`:
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
  - [ ] Add corresponding type definition in `graph.ts`:
    ```typescript
    export interface TraverseMemoriesInput {
      startNodeId?: string;
      maxDepth?: number;
      followDomainPointers?: boolean;
      targetDomain?: string;
      maxNodesPerDomain?: number;
    }
    ```

- [ ] **Implement Traversal Logic**
  - [ ] Create `traverseMemories` method in `MemoryGraph.ts`
  - [ ] Implement breadth-first or depth-first traversal algorithm
  - [ ] Add support for crossing domain boundaries
  - [ ] Handle circular references to prevent infinite loops
  - [ ] Implement domain-specific node limits

- [ ] **Format Output**
  - [ ] Create a narrative, hierarchical text format for the output
  - [ ] Include full memory content without truncation
  - [ ] Show both incoming and outgoing connections
  - [ ] Clearly mark cross-domain connections
  - [ ] Include traversal context (starting point, depth, domains)

- [ ] **Add Tool Handler**
  - [ ] Implement `handleTraverseMemories` method in `MemoryTools` class
  - [ ] Add case to `handleToolCall` switch statement
  - [ ] Include appropriate error handling

## 3. Testing

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
