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
      loadAllFiles: true,
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
        metadata: {
          path: '/test',
          tags: ['test'],
        },
      });
    });
  });

  describe('retrieve_memory', () => {
    it('should retrieve a stored memory', async () => {
      // First store a memory
      const storeRequest: ToolRequest = {
        name: 'store_memory',
        arguments: {
          content: 'Memory to retrieve',
        },
      };
      const storeResponse = await tools.handleToolCall(storeRequest);
      const storedMemory = JSON.parse(storeResponse.content[0].text);

      // Then retrieve it
      const retrieveRequest: ToolRequest = {
        name: 'retrieve_memory',
        arguments: {
          id: storedMemory.id,
        },
      };
      const response = await tools.handleToolCall(retrieveRequest);
      const retrievedMemory = JSON.parse(response.content[0].text);

      expect(retrievedMemory).toMatchObject({
        id: storedMemory.id,
        content: 'Memory to retrieve',
      });
    });

    it('should handle non-existent memory', async () => {
      const request: ToolRequest = {
        name: 'retrieve_memory',
        arguments: {
          id: 'non-existent',
        },
      };

      await expect(tools.handleToolCall(request)).rejects.toThrow('Memory not found');
    });
  });

  describe('query_memories', () => {
    beforeEach(async () => {
      // Set up test data
      await tools.handleToolCall({
        name: 'store_memory',
        arguments: {
          content: 'Memory 1',
          path: '/test',
          tags: ['tag1'],
        },
      });
      await tools.handleToolCall({
        name: 'store_memory',
        arguments: {
          content: 'Memory 2',
          path: '/test',
          tags: ['tag2'],
        },
      });
    });

    it('should query memories by path', async () => {
      const request: ToolRequest = {
        name: 'query_memories',
        arguments: {
          path: '/test',
        },
      };

      const response = await tools.handleToolCall(request);
      const results = JSON.parse(response.content[0].text);
      expect(results).toHaveLength(2);
      expect(results.every((m: any) => m.metadata.path === '/test')).toBe(true);
    });
  });

  describe('search_memories', () => {
    beforeEach(async () => {
      await tools.handleToolCall({
        name: 'store_memory',
        arguments: { content: 'Apple pie recipe' },
      });
      await tools.handleToolCall({
        name: 'store_memory',
        arguments: { content: 'Banana bread recipe' },
      });
    });

    it('should search memories and return results', async () => {
      const request: ToolRequest = {
        name: 'search_memories',
        arguments: {
          query: 'recipe',
          limit: 5,
        },
      };

      const response = await tools.handleToolCall(request);
      const results = JSON.parse(response.content[0].text);
      expect(results).toHaveLength(2);
      expect(results.every((r: any) => r.node.content.includes('recipe'))).toBe(true);
    });
  });

  describe('update_memory', () => {
    it('should update an existing memory', async () => {
      // First store a memory
      const storeResponse = await tools.handleToolCall({
        name: 'store_memory',
        arguments: {
          content: 'Original content',
          tags: ['original'],
        },
      });
      const storedMemory = JSON.parse(storeResponse.content[0].text);

      // Then update it
      const updateRequest: ToolRequest = {
        name: 'update_memory',
        arguments: {
          id: storedMemory.id,
          content: 'Updated content',
          tags: ['updated'],
        },
      };

      const response = await tools.handleToolCall(updateRequest);
      const updatedMemory = JSON.parse(response.content[0].text);
      expect(updatedMemory.content).toBe('Updated content');
      expect(updatedMemory.metadata.tags).toEqual(['updated']);
    });
  });

  describe('delete_memory', () => {
    it('should delete an existing memory', async () => {
      // First store a memory
      const storeResponse = await tools.handleToolCall({
        name: 'store_memory',
        arguments: {
          content: 'Memory to delete',
        },
      });
      const storedMemory = JSON.parse(storeResponse.content[0].text);

      // Then delete it
      const deleteRequest: ToolRequest = {
        name: 'delete_memory',
        arguments: {
          id: storedMemory.id,
        },
      };

      const response = await tools.handleToolCall(deleteRequest);
      expect(response.content[0].text).toBe('Memory deleted successfully');

      // Verify it's deleted
      const retrieveRequest: ToolRequest = {
        name: 'retrieve_memory',
        arguments: {
          id: storedMemory.id,
        },
      };

      await expect(tools.handleToolCall(retrieveRequest)).rejects.toThrow('Memory not found');
    });
  });
});
