# Testing Guide

This document provides guidelines and best practices for testing the Memory Graph MCP codebase.

## Testing Philosophy

The Memory Graph MCP follows these testing principles:

1. **Test-Driven Development**: Write tests before or alongside implementation
2. **Comprehensive Coverage**: Test all core functionality
3. **Isolation**: Unit tests should isolate components from their dependencies
4. **Realistic Scenarios**: Integration tests should model real-world use cases
5. **Performance Awareness**: Test for performance regressions in key operations

## Test Types

### Unit Tests

Unit tests focus on testing individual components in isolation:

- Test a single function, method, or class
- Mock or stub external dependencies
- Focus on function behavior, not implementation details
- Test edge cases and error conditions

Example unit test:

```typescript
// MermaidGenerator.test.ts
describe('MermaidGenerator', () => {
  test('should generate valid mermaid syntax', () => {
    const generator = new MermaidGenerator();
    const nodes = new Map([
      ['node1', { id: 'node1', content: 'Test Node 1', timestamp: '2023-01-01T00:00:00Z' }]
    ]);
    const edges = [
      { source: 'node1', target: 'node2', type: 'relates_to', strength: 0.8, timestamp: '2023-01-01T00:00:00Z' }
    ];
    
    const result = generator.generateGraph({
      startNodeId: 'node1',
      nodes,
      edges,
      direction: 'LR'
    });
    
    expect(result).toContain('graph LR');
    expect(result).toContain('node1["Test Node 1"]');
  });
});
```

### Integration Tests

Integration tests verify the interaction between components:

- Test multiple components working together
- Use real implementations instead of mocks when possible
- Verify system behavior across component boundaries
- Test realistic data flows

Example integration test:

```typescript
// MemoryGraph.test.ts (integration aspects)
describe('MemoryGraph with storage', () => {
  let graph: MemoryGraph;
  let tempDir: string;
  
  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'memory-graph-test-'));
    graph = new MemoryGraph({ storageDir: tempDir, storageType: 'json' });
    await graph.initialize();
  });
  
  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });
  
  test('should persist memories across initialization', async () => {
    // Store a memory
    const stored = await graph.storeMemory({
      content: 'Test memory',
      tags: ['test']
    });
    
    // Create a new graph instance with the same storage
    const newGraph = new MemoryGraph({ storageDir: tempDir, storageType: 'json' });
    await newGraph.initialize();
    
    // Recall the memory
    const result = await newGraph.recallMemories({
      maxNodes: 1,
      strategy: 'content',
      search: {
        keywords: ['Test memory']
      }
    });
    
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe(stored.id);
  });
});
```

### Storage Backend Tests

Storage backend tests verify each storage implementation:

- Test all storage operations for each implementation
- Verify data consistency and integrity
- Test error handling and edge cases
- Verify full-text search capabilities

Example storage test:

```typescript
// SqliteMemoryStorage.test.ts
describe('SqliteMemoryStorage', () => {
  let storage: SqliteMemoryStorage;
  let tempDir: string;
  
  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sqlite-test-'));
    storage = new SqliteMemoryStorage(tempDir);
    await storage.initialize();
  });
  
  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });
  
  test('should search content with FTS', async () => {
    // Create test domain
    const domain: DomainInfo = {
      id: 'test',
      name: 'Test Domain',
      description: 'Test domain for SQLite search',
      created: new Date().toISOString(),
      lastAccess: new Date().toISOString()
    };
    await storage.createDomain(domain);
    
    // Create test memories
    const nodes = new Map<string, MemoryNode>();
    nodes.set('node1', {
      id: 'node1',
      content: 'Architecture decisions for microservices',
      timestamp: new Date().toISOString()
    });
    nodes.set('node2', {
      id: 'node2',
      content: 'Deployment strategy for AWS',
      timestamp: new Date().toISOString()
    });
    
    await storage.saveMemories('test', nodes, []);
    
    // Test search
    const results = await storage.searchContent('microservices architecture');
    
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('node1');
  });
});
```

### Tool API Tests

Tool API tests verify the MCP tool implementations:

- Test each tool's handling of various inputs
- Verify expected responses and error handling
- Test input validation and edge cases
- Simulate MCP client interaction

Example tool test:

```typescript
// memoryTools.test.ts
describe('recall_memories tool', () => {
  let memoryTools: MemoryTools;
  let mockGraph: jest.Mocked<MemoryGraphInterface>;
  
  beforeEach(() => {
    mockGraph = {
      recallMemories: jest.fn(),
      storeMemory: jest.fn(),
      // ... other methods
    } as any;
    
    memoryTools = new MemoryTools(mockGraph);
  });
  
  test('should handle recall_memories correctly', async () => {
    // Mock the graph response
    mockGraph.recallMemories.mockResolvedValue({
      nodes: [{
        id: 'node1',
        content: 'Test memory',
        timestamp: '2023-01-01T00:00:00Z'
      }]
    });
    
    // Call the tool
    const result = await memoryTools.handleToolCall({
      name: 'recall_memories',
      input: {
        maxNodes: 10,
        strategy: 'recent'
      }
    });
    
    // Verify result
    expect(mockGraph.recallMemories).toHaveBeenCalledWith({
      maxNodes: 10,
      strategy: 'recent'
    });
    expect(result.content[0].type).toBe('text');
    expect(JSON.parse(result.content[0].text).nodes).toHaveLength(1);
  });
});
```

### Performance Tests

Performance tests identify potential performance issues:

- Test operations with large datasets
- Measure execution time for key operations
- Compare different storage backends
- Establish performance baselines

Example performance test:

```typescript
// performance.test.ts
describe('Performance tests', () => {
  // These tests might be skipped in regular CI runs
  test.skip('should handle large memory sets efficiently', async () => {
    const graph = new MemoryGraph({
      storageDir: './perf_test',
      storageType: 'sqlite'
    });
    await graph.initialize();
    
    // Create many memories
    const startTime = Date.now();
    for (let i = 0; i < 1000; i++) {
      await graph.storeMemory({
        content: `Test memory ${i}`,
        tags: ['performance', 'test']
      });
    }
    const createTime = Date.now() - startTime;
    
    // Recall with various strategies
    const recallTime = await measureRecallPerformance(graph);
    
    // Report results
    console.log(`Created 1000 memories in ${createTime}ms`);
    console.log(`Average recall time: ${recallTime}ms`);
    
    // Cleanup
    // ...
    
    // Soft assertions for CI
    expect(createTime).toBeLessThan(30000); // 30 seconds
    expect(recallTime).toBeLessThan(500); // 500ms
  });
});
```

## Test Setup

### Directory and File Structure

```
memory-graph/
├── src/
│   ├── component/
│   │   ├── Component.ts
│   │   └── Component.test.ts  // Unit tests alongside code
├── tests/
│   ├── integration/           // Integration tests
│   ├── performance/           // Performance tests
│   └── utils/                 // Test utilities
```

### Testing Environment Setup

Tests use these environment settings:

- Temporary directories for storage tests
- In-memory SQLite for database tests
- Mock database for MariaDB tests
- Isolated domains for multi-domain tests

## Test Implementation Best Practices

### Writing Effective Tests

1. **Test Organization**:
   - Group related tests with `describe` blocks
   - Use descriptive test names with `test` or `it`
   - Structure tests as Arrange-Act-Assert (AAA)

2. **Effective Assertions**:
   - Test for the expected result, not implementation details
   - Be specific about what you're testing
   - Include helpful error messages on failures

3. **Test Isolation**:
   - Reset state between tests
   - Don't rely on test execution order
   - Clean up resources (like temp files) after tests

4. **Test Coverage**:
   - Test happy paths, edge cases, and error conditions
   - Verify data integrity and consistency
   - Test asynchronous behavior correctly

### Test Data Management

Managing test data effectively:

```typescript
// Creating test domains
async function createTestDomain(graph: MemoryGraph, id: string): Promise<DomainInfo> {
  return await graph.createDomain(
    id,
    `Test Domain ${id}`,
    `Test domain for ${id}`
  );
}

// Creating test memory nodes
async function createTestMemories(graph: MemoryGraph, count: number): Promise<MemoryNode[]> {
  const nodes: MemoryNode[] = [];
  for (let i = 0; i < count; i++) {
    const node = await graph.storeMemory({
      content: `Test memory ${i}`,
      tags: [`tag${i % 3}`],
      path: `/test/path${i % 5}`
    });
    nodes.push(node);
  }
  return nodes;
}

// Creating test relationships
async function createTestRelationships(graph: MemoryGraph, nodes: MemoryNode[]): Promise<void> {
  for (let i = 0; i < nodes.length - 1; i++) {
    await graph.editMemory({
      id: nodes[i].id,
      relationships: {
        relates_to: [
          { targetId: nodes[i + 1].id, strength: 0.8 }
        ]
      }
    });
  }
}
```

### Mocking and Stubbing

Techniques for isolating components:

```typescript
// Mocking the storage layer
jest.mock('../../src/storage/JsonMemoryStorage', () => {
  return {
    JsonMemoryStorage: jest.fn().mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      getDomains: jest.fn().mockResolvedValue(new Map()),
      saveDomains: jest.fn().mockResolvedValue(undefined),
      // ... other methods
    }))
  };
});

// Stubbing implementation
const storageStub = {
  initialize: jest.fn().mockResolvedValue(undefined),
  getMemories: jest.fn().mockResolvedValue({
    nodes: new Map([
      ['node1', { id: 'node1', content: 'Test', timestamp: new Date().toISOString() }]
    ]),
    edges: []
  }),
  // ... other methods
};
```

## Running Tests

### Basic Test Commands

```bash
# Run all tests
npm test

# Run with watch mode (for development)
npm run test:watch

# Run with coverage report
npm run test:coverage
```

### Running Specific Tests

```bash
# Run tests for a specific file
npm test -- src/graph/MemoryGraph.test.ts

# Run tests matching a pattern
npm test -- -t "should store memory"

# Run a specific test suite
npm test -- -t "MemoryGraph"
```

### CI Integration

Tests run in CI environments with these considerations:

- All tests must pass for PR approval
- Coverage thresholds are enforced
- Performance tests may be skipped or run separately
- Test databases are created and torn down for each run

## Troubleshooting Tests

### Common Issues

1. **Test Data Persistence**:
   - Tests may fail if data from previous tests isn't cleaned up
   - Use unique test directories for storage tests
   - Clean up in `afterEach` or `afterAll` blocks

2. **Asynchronous Testing**:
   - Ensure proper use of `async`/`await` in tests
   - Use appropriate Jest matchers for Promises
   - Watch for unhandled promise rejections

3. **Test Isolation**:
   - Avoid shared state between tests
   - Reset mocks between tests with `jest.resetAllMocks()`
   - Create fresh instances in `beforeEach`

4. **Database Tests**:
   - Use in-memory databases when possible
   - Handle connection pooling properly
   - Ensure database schemas are created correctly

### Debugging Tests

Techniques for debugging test failures:

```bash
# Run with verbose output
npm test -- --verbose

# Run with debugging
NODE_OPTIONS=--inspect-brk npm test -- --runInBand

# Add debug logging (outputs to stderr)
console.error('Debug:', value);
```

## Test Coverage

The project aims for high test coverage:

```bash
# Generate coverage report
npm run test:coverage
```

Coverage targets:
- Lines: >85%
- Functions: >90%
- Branches: >75%
- Statements: >85%