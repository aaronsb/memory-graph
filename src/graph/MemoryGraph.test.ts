import { MemoryGraph } from './MemoryGraph.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { StoreMemoryInput, EditMemoryInput, DomainInfo } from '../types/graph.js';

describe('MemoryGraph', () => {
  describe('Domain Management', () => {
    let graph: MemoryGraph;
    const testDir = path.join(process.cwd(), 'test-data');
    
    beforeEach(async () => {
      graph = new MemoryGraph({ storageDir: testDir });
      await graph.initialize();
    });

    afterEach(async () => {
      try {
        await fs.rm(testDir, { recursive: true });
      } catch (error) {
        // Ignore errors if directory doesn't exist
      }
    });

    it('should initialize with a default general domain', async () => {
      const domains = await graph.listDomains();
      expect(domains).toHaveLength(1);
      expect(domains[0]).toMatchObject({
        id: 'general',
        name: 'General',
        description: 'Default domain for general memories'
      });
      expect(graph.getCurrentDomain()).toBe('general');
    });

    it('should create a new domain', async () => {
      const domain = await graph.createDomain(
        'work',
        'Work Domain',
        'Work-related memories'
      );

      expect(domain).toMatchObject({
        id: 'work',
        name: 'Work Domain',
        description: 'Work-related memories'
      });

      const domains = await graph.listDomains();
      expect(domains).toHaveLength(2);
      expect(domains.find(d => d.id === 'work')).toBeTruthy();

      // Verify domain file was created
      const domainFile = path.join(testDir, 'memories', 'work.json');
      const exists = await fs.access(domainFile).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should prevent creating duplicate domains', async () => {
      await graph.createDomain('test', 'Test', 'Test domain');
      await expect(
        graph.createDomain('test', 'Test 2', 'Another test')
      ).rejects.toThrow('Domain already exists: test');
    });

    it('should switch between domains', async () => {
      // Create test domains
      await graph.createDomain('work', 'Work', 'Work memories');
      await graph.createDomain('personal', 'Personal', 'Personal memories');

      // Store a memory in general domain
      const generalMemory = await graph.storeMemory({
        content: 'General memory'
      });

      // Switch to work domain
      await graph.selectDomain('work');
      expect(graph.getCurrentDomain()).toBe('work');

      // Store a memory in work domain
      const workMemory = await graph.storeMemory({
        content: 'Work memory'
      });

      // Switch to personal domain
      await graph.selectDomain('personal');
      expect(graph.getCurrentDomain()).toBe('personal');

      // Store a memory in personal domain
      const personalMemory = await graph.storeMemory({
        content: 'Personal memory'
      });

      // Verify domain isolation
      await graph.selectDomain('general');
      let memories = await graph.recallMemories({ maxNodes: 10, strategy: 'recent' });
      expect(memories).toHaveLength(1);
      expect(memories[0].node.content).toBe('General memory');

      await graph.selectDomain('work');
      memories = await graph.recallMemories({ maxNodes: 10, strategy: 'recent' });
      expect(memories).toHaveLength(1);
      expect(memories[0].node.content).toBe('Work memory');

      await graph.selectDomain('personal');
      memories = await graph.recallMemories({ maxNodes: 10, strategy: 'recent' });
      expect(memories).toHaveLength(1);
      expect(memories[0].node.content).toBe('Personal memory');
    });

    it('should persist domain state between sessions', async () => {
      // Create a domain and switch to it
      await graph.createDomain('test', 'Test', 'Test domain');
      await graph.selectDomain('test');
      await graph.storeMemory({ content: 'Test memory' });

      // Create a new graph instance (simulating new session)
      const newGraph = new MemoryGraph({ storageDir: testDir });
      await newGraph.initialize();

      // Verify the domain state was restored
      expect(newGraph.getCurrentDomain()).toBe('test');
      const memories = await newGraph.recallMemories({ maxNodes: 10, strategy: 'recent' });
      expect(memories).toHaveLength(1);
      expect(memories[0].node.content).toBe('Test memory');
    });

    it('should handle cross-domain memory references', async () => {
      // Create domains
      await graph.createDomain('work', 'Work', 'Work memories');
      await graph.createDomain('personal', 'Personal', 'Personal memories');

      // Store a memory in work domain
      await graph.selectDomain('work');
      const workMemory = await graph.storeMemory({
        content: 'Important work project'
      });

      // Store a memory in personal domain that references work memory
      await graph.selectDomain('personal');
      const personalMemory = await graph.storeMemory({
        content: 'Need to balance this with personal time',
        domainRefs: [{
          domain: 'work',
          nodeId: workMemory.id,
          description: 'Related work project'
        }]
      });

      // Verify the reference exists
      const memories = await graph.recallMemories({ maxNodes: 10, strategy: 'recent' });
      expect(memories[0].node.domainRefs).toHaveLength(1);
      expect(memories[0].node.domainRefs![0]).toMatchObject({
        domain: 'work',
        nodeId: workMemory.id
      });
    });

    it('should handle invalid domain selection', async () => {
      await expect(
        graph.selectDomain('nonexistent')
      ).rejects.toThrow('Domain not found: nonexistent');
    });
  });

  let testStoragePath: string;

  beforeEach(async () => {
    testStoragePath = path.join(os.tmpdir(), `memory-graph-test-${Date.now()}`);
    await fs.mkdir(testStoragePath, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testStoragePath, { recursive: true, force: true });
  });

  describe('JSON Storage Initialization', () => {
    it('should initialize with empty JSON storage', async () => {
      const graph = new MemoryGraph({
        storageDir: testStoragePath,
        defaultPath: '/',
        storageType: 'json' // Explicitly use JSON storage for this test
      });

      await graph.initialize();
      
      // Verify domain exists
      const domains = await graph.listDomains();
      expect(domains).toHaveLength(1);
      expect(domains[0].id).toBe('general');
      
      // Verify no memories exist yet
      const results = await graph.recallMemories({ maxNodes: 10, strategy: 'recent' });
      expect(results).toHaveLength(0);
      
      // Check JSON-specific implementation details
      const memoriesDir = path.join(testStoragePath, 'memories');
      const dirExists = await fs.access(memoriesDir).then(() => true).catch(() => false);
      expect(dirExists).toBe(true);

      // Check general domain file was created
      const generalFile = path.join(memoriesDir, 'general.json');
      const fileExists = await fs.access(generalFile).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // Verify file content
      const content = await fs.readFile(generalFile, 'utf-8');
      const data = JSON.parse(content);
      expect(data).toEqual({ nodes: {}, edges: [] });
    });

    it('should load existing domain memory data from JSON storage', async () => {
      // First create a graph and store a memory
      const initialGraph = new MemoryGraph({
        storageDir: testStoragePath,
        defaultPath: '/',
        storageType: 'json'
      });
      
      await initialGraph.initialize();
      await initialGraph.storeMemory({
        content: "test1"
      });
      
      // Now create a new graph instance to test loading
      const graph = new MemoryGraph({
        storageDir: testStoragePath,
        defaultPath: '/',
        storageType: 'json'
      });

      await graph.initialize();
      const results = await graph.recallMemories({ maxNodes: 10, strategy: 'recent' });
      expect(results).toHaveLength(1);
      expect(results[0].node.content).toBe('test1');
    });
  });

  describe('SQLite Storage Initialization', () => {
    it('should initialize with empty SQLite storage', async () => {
      const graph = new MemoryGraph({
        storageDir: testStoragePath,
        defaultPath: '/',
        storageType: 'sqlite' // Explicitly use SQLite storage for this test
      });

      await graph.initialize();
      
      // Verify domain exists
      const domains = await graph.listDomains();
      expect(domains).toHaveLength(1);
      expect(domains[0].id).toBe('general');
      
      // Verify no memories exist yet
      const results = await graph.recallMemories({ maxNodes: 10, strategy: 'recent' });
      expect(results).toHaveLength(0);
      
      // Check SQLite-specific implementation details
      const dbFile = path.join(testStoragePath, 'memory-graph.db');
      const dbExists = await fs.access(dbFile).then(() => true).catch(() => false);
      expect(dbExists).toBe(true);
    });

    it('should load existing domain memory data from SQLite storage', async () => {
      // First create a graph and store a memory
      const initialGraph = new MemoryGraph({
        storageDir: testStoragePath,
        defaultPath: '/',
        storageType: 'sqlite'
      });
      
      await initialGraph.initialize();
      await initialGraph.storeMemory({
        content: "test1"
      });
      
      // Now create a new graph instance to test loading
      const graph = new MemoryGraph({
        storageDir: testStoragePath,
        defaultPath: '/',
        storageType: 'sqlite'
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

  describe('editMemory', () => {
    let graph: MemoryGraph;

    beforeEach(async () => {
      graph = new MemoryGraph({ 
        storageDir: testStoragePath,
        defaultPath: '/'
      });
      await graph.initialize();
    });

    it('should edit memory content', async () => {
      const memory = await graph.storeMemory({
        content: 'Original content'
      });

      const edited = await graph.editMemory({
        id: memory.id,
        content: 'Updated content'
      });

      expect(edited.content).toBe('Updated content');
      
      const results = await graph.recallMemories({
        maxNodes: 1,
        strategy: 'recent'
      });
      expect(results[0].node.content).toBe('Updated content');
    });

    it('should edit memory relationships', async () => {
      const target = await graph.storeMemory({
        content: 'Target memory'
      });

      const memory = await graph.storeMemory({
        content: 'Original memory',
        relationships: {
          references: [{
            targetId: target.id,
            strength: 0.5
          }]
        }
      });

      const edited = await graph.editMemory({
        id: memory.id,
        relationships: {
          references: [{
            targetId: target.id,
            strength: 0.9
          }]
        }
      });

      const results = await graph.recallMemories({
        maxNodes: 10,
        strategy: 'related',
        startNodeId: memory.id,
        minStrength: 0.8
      });

      expect(results).toHaveLength(2);
      const edge = results[1].edges[0];
      expect(edge.strength).toBe(0.9);
    });

    it('should throw error for non-existent memory', async () => {
      await expect(graph.editMemory({
        id: 'non-existent',
        content: 'New content'
      })).rejects.toThrow('Memory not found');
    });

    it('should allow editing both content and relationships', async () => {
      const target = await graph.storeMemory({
        content: 'Target memory'
      });

      const memory = await graph.storeMemory({
        content: 'Original content'
      });

      const edited = await graph.editMemory({
        id: memory.id,
        content: 'Updated content',
        relationships: {
          references: [{
            targetId: target.id,
            strength: 0.7
          }]
        }
      });

      expect(edited.content).toBe('Updated content');
      
      const results = await graph.recallMemories({
        maxNodes: 10,
        strategy: 'related',
        startNodeId: memory.id
      });

      expect(results).toHaveLength(2);
      expect(results[0].node.content).toBe('Updated content');
      expect(results[1].edges[0].strength).toBe(0.7);
    });
  });
});
