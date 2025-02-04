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

  describe('edit_memory', () => {
    it('should edit memory content', async () => {
      // First store a memory
      const storeResponse = await tools.handleToolCall({
        name: 'store_memory',
        arguments: {
          content: 'Original content',
        },
      });
      const storedMemory = JSON.parse(storeResponse.content[0].text);

      // Edit the memory
      const editRequest: ToolRequest = {
        name: 'edit_memory',
        arguments: {
          id: storedMemory.id,
          content: 'Updated content',
        },
      };

      const editResponse = await tools.handleToolCall(editRequest);
      const editedMemory = JSON.parse(editResponse.content[0].text);
      expect(editedMemory.content).toBe('Updated content');

      // Verify the change
      const recallRequest: ToolRequest = {
        name: 'recall_memories',
        arguments: {
          maxNodes: 1,
          strategy: 'recent',
        },
      };

      const recallResponse = await tools.handleToolCall(recallRequest);
      const results = JSON.parse(recallResponse.content[0].text);
      expect(results[0].node.content).toBe('Updated content');
    });

    it('should edit memory relationships', async () => {
      // Store target memory
      const targetResponse = await tools.handleToolCall({
        name: 'store_memory',
        arguments: {
          content: 'Target memory',
        },
      });
      const target = JSON.parse(targetResponse.content[0].text);

      // Store source memory with relationship
      const sourceResponse = await tools.handleToolCall({
        name: 'store_memory',
        arguments: {
          content: 'Source memory',
          relationships: {
            references: [{
              targetId: target.id,
              strength: 0.5
            }]
          }
        },
      });
      const source = JSON.parse(sourceResponse.content[0].text);

      // Edit the relationship
      const editRequest: ToolRequest = {
        name: 'edit_memory',
        arguments: {
          id: source.id,
          relationships: {
            references: [{
              targetId: target.id,
              strength: 0.9
            }]
          }
        },
      };

      await tools.handleToolCall(editRequest);

      // Verify the change
      const recallRequest: ToolRequest = {
        name: 'recall_memories',
        arguments: {
          maxNodes: 10,
          strategy: 'related',
          startNodeId: source.id,
          minStrength: 0.8
        },
      };

      const recallResponse = await tools.handleToolCall(recallRequest);
      const results = JSON.parse(recallResponse.content[0].text);
      expect(results).toHaveLength(2);
      expect(results[1].edges[0].strength).toBe(0.9);
    });

    it('should handle non-existent memory error', async () => {
      const editRequest: ToolRequest = {
        name: 'edit_memory',
        arguments: {
          id: 'non-existent',
          content: 'New content',
        },
      };

      const response = await tools.handleToolCall(editRequest);
      expect(response.isError).toBe(true);
      expect(response.content[0].text).toBe('Memory not found: non-existent');
    });
  });
});
