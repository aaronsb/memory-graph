import { MemoryGraph } from '../graph/MemoryGraph.js';
import { MemoryTools } from './memoryTools.js';
import { ToolRequest } from '../types/mcp.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('MemoryTools', () => {
  let graph: MemoryGraph;
  let tools: MemoryTools;
  let testStoragePath: string;

  beforeEach(async () => {
    testStoragePath = path.join(os.tmpdir(), `memory-tools-test-${Date.now()}`);
    await fs.mkdir(testStoragePath, { recursive: true });
    graph = new MemoryGraph({ 
      storageDir: testStoragePath,
      defaultPath: '/'
    });
    await graph.initialize();
    tools = new MemoryTools(graph);
  });

  afterEach(async () => {
    await fs.rm(testStoragePath, { recursive: true, force: true });
  });

  describe('store_memory', () => {
    it('should store a memory and return formatted response', async () => {
      const request: ToolRequest = {
        name: 'store_memory',
        arguments: {
          content: 'Test memory',
          path: '/test',
          tags: ['test'],
        },
      };

      const response = await tools.handleToolCall(request);
      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe('text');

      const memory = JSON.parse(response.content[0].text);
      expect(memory).toMatchObject({
        content: 'Test memory',
        path: '/test',
        tags: ['test']
      });
    });
  });

  describe('recall_memories', () => {
    beforeEach(async () => {
      // Set up test data with delays to ensure distinct timestamps
      await tools.handleToolCall({
        name: 'store_memory',
        arguments: {
          content: 'Memory 1',
          path: '/test',
          tags: ['tag1'],
        },
      });
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await tools.handleToolCall({
        name: 'store_memory',
        arguments: {
          content: 'Memory 2',
          path: '/test',
          tags: ['tag2'],
        },
      });
    });

    it('should recall recent memories', async () => {
      const request: ToolRequest = {
        name: 'recall_memories',
        arguments: {
          maxNodes: 10,
          strategy: 'recent'
        },
      };

      const response = await tools.handleToolCall(request);
      const results = JSON.parse(response.content[0].text);
      expect(results).toHaveLength(2);
      expect(results[0].node.content).toBe('Memory 2');
    });

    it('should recall memories by path', async () => {
      const request: ToolRequest = {
        name: 'recall_memories',
        arguments: {
          maxNodes: 10,
          strategy: 'path',
          path: '/test'
        },
      };

      const response = await tools.handleToolCall(request);
      const results = JSON.parse(response.content[0].text);
      expect(results).toHaveLength(2);
      expect(results.every((r: any) => r.node.path === '/test')).toBe(true);
    });

    it('should recall memories by tags', async () => {
      const request: ToolRequest = {
        name: 'recall_memories',
        arguments: {
          maxNodes: 10,
          strategy: 'tag',
          tags: ['tag1']
        },
      };

      const response = await tools.handleToolCall(request);
      const results = JSON.parse(response.content[0].text);
      expect(results).toHaveLength(1);
      expect(results[0].node.tags).toContain('tag1');
    });
  });

  describe('forget_memory', () => {
    it('should forget a memory', async () => {
      // First store a memory
      const storeResponse = await tools.handleToolCall({
        name: 'store_memory',
        arguments: {
          content: 'Memory to forget',
        },
      });
      const storedMemory = JSON.parse(storeResponse.content[0].text);

      // Then forget it
      const forgetRequest: ToolRequest = {
        name: 'forget_memory',
        arguments: {
          id: storedMemory.id,
        },
      };

      const response = await tools.handleToolCall(forgetRequest);
      expect(response.content[0].text).toBe('Memory forgotten successfully');

      // Verify it's forgotten
      const recallRequest: ToolRequest = {
        name: 'recall_memories',
        arguments: {
          maxNodes: 10,
          strategy: 'recent'
        },
      };

      const recallResponse = await tools.handleToolCall(recallRequest);
      const results = JSON.parse(recallResponse.content[0].text);
      expect(results.find((r: any) => r.node.id === storedMemory.id)).toBeUndefined();
    });
  });
});
