import { MemoryGraph } from './MemoryGraph.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('MemoryGraph', () => {
  let graph: MemoryGraph;
  let testStoragePath: string;

  beforeEach(async () => {
    // Create a temporary directory for testing
    testStoragePath = path.join(os.tmpdir(), `memory-graph-test-${Date.now()}`);
    await fs.mkdir(testStoragePath, { recursive: true });
    graph = new MemoryGraph({ storagePath: testStoragePath });
    await graph.initialize();
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testStoragePath, { recursive: true, force: true });
  });

  describe('storeMemory', () => {
    it('should store a memory with basic content', async () => {
      const memory = await graph.storeMemory({
        content: 'Test memory content',
      });

      expect(memory).toMatchObject({
        content: 'Test memory content',
        metadata: {
          path: '/',
        },
      });
      expect(memory.id).toBeDefined();
      expect(memory.metadata.timestamp).toBeDefined();
    });

    it('should store a memory with tags and custom path', async () => {
      const memory = await graph.storeMemory({
        content: 'Test memory with tags',
        path: '/test/path',
        tags: ['test', 'tags'],
      });

      expect(memory).toMatchObject({
        content: 'Test memory with tags',
        metadata: {
          path: '/test/path',
          tags: ['test', 'tags'],
        },
      });
    });

    it('should store memories with relationships', async () => {
      const memory1 = await graph.storeMemory({
        content: 'First memory',
      });

      const memory2 = await graph.storeMemory({
        content: 'Related memory',
        relationships: {
          references: [memory1.id],
        },
      });

      expect(memory2.metadata.relationships).toEqual({
        references: [memory1.id],
      });
    });
  });

  describe('queryMemories', () => {
    beforeEach(async () => {
      // Set up test data
      await graph.storeMemory({
        content: 'Memory 1',
        path: '/test',
        tags: ['tag1'],
      });
      await graph.storeMemory({
        content: 'Memory 2',
        path: '/test',
        tags: ['tag2'],
      });
      await graph.storeMemory({
        content: 'Memory 3',
        path: '/other',
        tags: ['tag1', 'tag2'],
      });
    });

    it('should query memories by path', async () => {
      const results = await graph.queryMemories({ path: '/test' });
      expect(results).toHaveLength(2);
      expect(results.every(m => m.metadata.path === '/test')).toBe(true);
    });

    it('should query memories by tags', async () => {
      const results = await graph.queryMemories({ tags: ['tag1'] });
      expect(results).toHaveLength(2);
      expect(results.every(m => m.metadata.tags?.includes('tag1'))).toBe(true);
    });

    it('should query memories with multiple tags', async () => {
      const results = await graph.queryMemories({ tags: ['tag1', 'tag2'] });
      expect(results).toHaveLength(1);
      expect(results[0].metadata.tags).toContain('tag1');
      expect(results[0].metadata.tags).toContain('tag2');
    });
  });

  describe('searchMemories', () => {
    beforeEach(async () => {
      await graph.storeMemory({ content: 'Apple pie recipe' });
      await graph.storeMemory({ content: 'Banana bread recipe' });
      await graph.storeMemory({ content: 'Apple juice' });
    });

    it('should search memories by content', async () => {
      const results = await graph.searchMemories('apple');
      expect(results).toHaveLength(2);
      expect(results.every(r => r.node.content.toLowerCase().includes('apple'))).toBe(true);
    });

    it('should respect the limit parameter', async () => {
      const results = await graph.searchMemories('recipe', 1);
      expect(results).toHaveLength(1);
    });

    it('should sort results by relevance', async () => {
      const results = await graph.searchMemories('apple recipe');
      expect(results[0].node.content).toBe('Apple pie recipe');
      expect(results[0].score).toBeGreaterThan(results[1].score);
    });
  });

  describe('updateMemory', () => {
    it('should update an existing memory', async () => {
      const memory = await graph.storeMemory({
        content: 'Original content',
        tags: ['original'],
      });

      const updated = await graph.updateMemory({
        id: memory.id,
        content: 'Updated content',
        tags: ['updated'],
      });

      expect(updated).toBeDefined();
      expect(updated?.content).toBe('Updated content');
      expect(updated?.metadata.tags).toEqual(['updated']);
    });

    it('should return null for non-existent memory', async () => {
      const result = await graph.updateMemory({
        id: 'non-existent',
        content: 'Updated content',
      });

      expect(result).toBeNull();
    });
  });

  describe('deleteMemory', () => {
    it('should delete an existing memory', async () => {
      const memory = await graph.storeMemory({
        content: 'Memory to delete',
      });

      const deleted = await graph.deleteMemory(memory.id);
      expect(deleted).toBe(true);

      const results = await graph.queryMemories({});
      expect(results.find(m => m.id === memory.id)).toBeUndefined();
    });

    it('should return false for non-existent memory', async () => {
      const result = await graph.deleteMemory('non-existent');
      expect(result).toBe(false);
    });
  });
});
