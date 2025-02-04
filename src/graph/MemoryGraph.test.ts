import { MemoryGraph } from './MemoryGraph.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('MemoryGraph', () => {
  let testStoragePath: string;

  beforeEach(async () => {
    testStoragePath = path.join(os.tmpdir(), `memory-graph-test-${Date.now()}`);
    await fs.mkdir(testStoragePath, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testStoragePath, { recursive: true, force: true });
  });

  describe('initialization', () => {
    it('should create memory.json if it does not exist', async () => {
      const graph = new MemoryGraph({
        storageDir: testStoragePath,
        defaultPath: '/'
      });

      await graph.initialize();
      const memoryFile = path.join(testStoragePath, 'memory.json');
      const exists = await fs.access(memoryFile).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should load existing memory file', async () => {
      const memoryFile = path.join(testStoragePath, 'memory.json');
      const testData = {
        nodes: {
          "1": { id: "1", content: "test1", timestamp: new Date().toISOString() }
        },
        edges: []
      };
      
      await fs.writeFile(memoryFile, JSON.stringify(testData));

      const graph = new MemoryGraph({
        storageDir: testStoragePath,
        defaultPath: '/'
      });

      await graph.initialize();
      const results = await graph.recallMemories({ maxNodes: 10, strategy: 'recent' });
      expect(results).toHaveLength(1);
      expect(results[0].node.content).toBe('test1');
    });
  });

  describe('storeMemory', () => {
    let graph: MemoryGraph;

    beforeEach(async () => {
      graph = new MemoryGraph({ 
        storageDir: testStoragePath,
        defaultPath: '/'
      });
      await graph.initialize();
    });

    it('should store a memory with basic content', async () => {
      const memory = await graph.storeMemory({
        content: 'Test memory content'
      });

      expect(memory).toMatchObject({
        content: 'Test memory content',
        path: '/'
      });
      expect(memory.id).toBeDefined();
      expect(memory.timestamp).toBeDefined();
    });

    it('should store a memory with tags and custom path', async () => {
      const memory = await graph.storeMemory({
        content: 'Test memory with tags',
        path: '/test/path',
        tags: ['test', 'tags']
      });

      expect(memory).toMatchObject({
        content: 'Test memory with tags',
        path: '/test/path',
        tags: ['test', 'tags']
      });
    });

    it('should store memories with weighted relationships', async () => {
      const memory1 = await graph.storeMemory({
        content: 'First memory'
      });

      const memory2 = await graph.storeMemory({
        content: 'Related memory',
        relationships: {
          references: [{
            targetId: memory1.id,
            strength: 0.8
          }]
        }
      });

      const results = await graph.recallMemories({
        maxNodes: 10,
        strategy: 'related',
        startNodeId: memory2.id,
        minStrength: 0.7
      });

      expect(results).toHaveLength(2);
      expect(results[0].node.id).toBe(memory2.id);
      expect(results[1].node.id).toBe(memory1.id);
      expect(results[1].edges[0].strength).toBe(0.8);
    });
  });

  describe('recallMemories', () => {
    let graph: MemoryGraph;

    beforeEach(async () => {
      graph = new MemoryGraph({ 
        storageDir: testStoragePath,
        defaultPath: '/'
      });
      await graph.initialize();

      // Set up test data
      // Add small delays between stores to ensure distinct timestamps
      await graph.storeMemory({
        content: 'Memory 1',
        path: '/test',
        tags: ['tag1']
      });
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await graph.storeMemory({
        content: 'Memory 2',
        path: '/test',
        tags: ['tag2']
      });
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await graph.storeMemory({
        content: 'Memory 3',
        path: '/other',
        tags: ['tag1', 'tag2']
      });
    });

    it('should recall recent memories', async () => {
      const results = await graph.recallMemories({
        maxNodes: 2,
        strategy: 'recent'
      });
      expect(results).toHaveLength(2);
      expect(results[0].node.content).toBe('Memory 3');
      expect(results[1].node.content).toBe('Memory 2');
    });

    it('should recall memories by path', async () => {
      const results = await graph.recallMemories({
        maxNodes: 10,
        strategy: 'path',
        path: '/test'
      });
      expect(results).toHaveLength(2);
      expect(results.every(r => r.node.path === '/test')).toBe(true);
    });

    it('should recall memories by tags', async () => {
      const results = await graph.recallMemories({
        maxNodes: 10,
        strategy: 'tag',
        tags: ['tag1']
      });
      expect(results).toHaveLength(2);
      expect(results.every(r => r.node.tags?.includes('tag1'))).toBe(true);
    });

    it('should recall related memories with strength filter', async () => {
      const base = await graph.storeMemory({
        content: 'Base memory'
      });

      await graph.storeMemory({
        content: 'Strong relation',
        relationships: {
          references: [{
            targetId: base.id,
            strength: 0.9
          }]
        }
      });

      await graph.storeMemory({
        content: 'Weak relation',
        relationships: {
          references: [{
            targetId: base.id,
            strength: 0.3
          }]
        }
      });

      const results = await graph.recallMemories({
        maxNodes: 10,
        strategy: 'related',
        startNodeId: base.id,
        minStrength: 0.5
      });

      expect(results).toHaveLength(2); // base + strong relation
      expect(results.some(r => r.node.content === 'Strong relation')).toBe(true);
      expect(results.some(r => r.node.content === 'Weak relation')).toBe(false);
    });
  });

  describe('forgetMemory', () => {
    let graph: MemoryGraph;

    beforeEach(async () => {
      graph = new MemoryGraph({ 
        storageDir: testStoragePath,
        defaultPath: '/'
      });
      await graph.initialize();
    });

    it('should forget a memory', async () => {
      const memory = await graph.storeMemory({
        content: 'Memory to forget'
      });

      const forgotten = await graph.forgetMemory({ id: memory.id });
      expect(forgotten).toBe(true);

      const results = await graph.recallMemories({
        maxNodes: 10,
        strategy: 'recent'
      });
      expect(results.find(r => r.node.id === memory.id)).toBeUndefined();
    });

    it('should cascade forget connected memories', async () => {
      const memory1 = await graph.storeMemory({
        content: 'Base memory'
      });

      await graph.storeMemory({
        content: 'Connected memory 1',
        relationships: {
          references: [{
            targetId: memory1.id,
            strength: 0.8
          }]
        }
      });

      await graph.storeMemory({
        content: 'Connected memory 2',
        relationships: {
          references: [{
            targetId: memory1.id,
            strength: 0.9
          }]
        }
      });

      const forgotten = await graph.forgetMemory({
        id: memory1.id,
        cascade: true
      });
      expect(forgotten).toBe(true);

      const results = await graph.recallMemories({
        maxNodes: 10,
        strategy: 'recent'
      });
      expect(results).toHaveLength(0);
    });

    it('should return false for non-existent memory', async () => {
      const result = await graph.forgetMemory({
        id: 'non-existent'
      });
      expect(result).toBe(false);
    });
  });
});
