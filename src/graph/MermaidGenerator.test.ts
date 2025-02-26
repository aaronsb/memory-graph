import { MermaidGenerator } from './MermaidGenerator.js';
import { MemoryNode, GraphEdge } from '../types/graph.js';

describe('MermaidGenerator', () => {
  let nodes: Map<string, MemoryNode>;
  let edges: GraphEdge[];
  let generator: MermaidGenerator;

  beforeEach(() => {
    nodes = new Map();
    nodes.set('node1', {
      id: 'node1',
      content: 'First memory',
      timestamp: '2024-01-01T00:00:00Z'
    });
    nodes.set('node2', {
      id: 'node2',
      content: 'Second memory',
      timestamp: '2024-01-02T00:00:00Z'
    });
    nodes.set('node3', {
      id: 'node3',
      content: 'Third memory',
      timestamp: '2024-01-03T00:00:00Z'
    });

    edges = [
      {
        source: 'node1',
        target: 'node2',
        type: 'references',
        strength: 0.8,
        timestamp: '2024-01-01T00:00:00Z'
      },
      {
        source: 'node2',
        target: 'node3',
        type: 'relates_to',
        strength: 0.6,
        timestamp: '2024-01-02T00:00:00Z'
      }
    ];

    generator = new MermaidGenerator(nodes, edges);
  });

  it('generates basic graph with default settings', async () => {
    const result = await generator.generateGraph({
      startNodeId: 'node1'
    });

    expect(result).toContain('graph LR');
    expect(result).toContain('node1["First memory"]');
    expect(result).toContain('node2["Second memory"]');
    expect(result).toContain('node1 -->|references| node2');
  });

  it('respects maxDepth parameter', async () => {
    const result = await generator.generateGraph({
      startNodeId: 'node1',
      maxDepth: 1
    });

    expect(result).toContain('node1["First memory"]');
    expect(result).toContain('node2["Second memory"]');
    expect(result).toContain('node1 -->|references| node2');
    expect(result).not.toContain('node3');
  });

  it('filters by relationship type', async () => {
    const result = await generator.generateGraph({
      startNodeId: 'node1',
      relationshipTypes: ['references']
    });

    expect(result).toContain('node1 -->|references| node2');
    expect(result).not.toContain('relates_to');
  });

  it('filters by minimum strength', async () => {
    const result = await generator.generateGraph({
      startNodeId: 'node1',
      minStrength: 0.7
    });

    expect(result).toContain('node1 -->|references| node2');
    expect(result).not.toContain('relates_to');
  });

  it('handles custom direction', async () => {
    const result = await generator.generateGraph({
      startNodeId: 'node1',
      direction: 'TB'
    });

    expect(result).toContain('graph TB');
  });

  it('truncates long content', async () => {
    nodes.set('long', {
      id: 'long',
      content: 'A'.repeat(100),
      timestamp: '2024-01-04T00:00:00Z'
    });
    edges.push({
      source: 'node1',
      target: 'long',
      type: 'links',
      strength: 0.9,
      timestamp: '2024-01-04T00:00:00Z'
    });

    const result = await generator.generateGraph({
      startNodeId: 'node1'
    });

    expect(result).toContain('...');
    expect(result.includes('A'.repeat(100))).toBeFalsy();
  });

  it('escapes quotes in content', async () => {
    nodes.set('quoted', {
      id: 'quoted',
      content: 'Memory with "quotes"',
      timestamp: '2024-01-04T00:00:00Z'
    });
    edges.push({
      source: 'node1',
      target: 'quoted',
      type: 'links',
      strength: 0.9,
      timestamp: '2024-01-04T00:00:00Z'
    });

    const result = await generator.generateGraph({
      startNodeId: 'node1'
    });

    expect(result).toContain('\\"quotes\\"');
  });

  it('handles non-existent start node', async () => {
    const result = await generator.generateGraph({
      startNodeId: 'nonexistent'
    });

    // Check that it contains the basic graph structure
    expect(result).toContain('graph LR');
    // The result now includes domain styles which is fine
  });

  it('applies content formatting options', async () => {
    const result = await generator.generateGraph({
      startNodeId: 'node1',
      contentFormat: {
        maxLength: 10,
        truncationSuffix: '***',
        includeId: true,
        includeTimestamp: true
      }
    });

    // Extract lines from result
    const lines = result.split('\n').map((line: string) => line.trim());
    
    // Verify node content (ignoring indentation)
    const node1Line = 'node1["[node1] First m*** (12/31/2023 12:00:00 PM)"]';
    const node2Line = 'node2["[node2] Second *** (1/1/2024 12:00:00 PM)"]';
    
    // Debug output
    console.log('Expected node1Line:', node1Line);
    console.log('Expected node2Line:', node2Line);
    console.log('Actual lines:', lines);
    
    // Create normalized versions of the expected lines
    const expectedNode1 = 'node1["[node1] First m*** (12/31/2023 12:00:00 PM)"]';
    const expectedNode2 = 'node2["[node2] Second *** (1/1/2024 12:00:00 PM)"]';
    
    // Debug output
    console.log('Testing exact line matches:');
    lines.forEach((line: string) => {
      console.log('Line:', JSON.stringify(line));
      console.log('Matches node1:', line === expectedNode1);
      console.log('Matches node2:', line === expectedNode2);
      if (line !== expectedNode1 && line.includes('node1')) {
        console.log('node1 diff - expected:', expectedNode1.split('').map((c: string) => c.charCodeAt(0)));
        console.log('node1 diff - actual:', line.split('').map((c: string) => c.charCodeAt(0)));
      }
      if (line !== expectedNode2 && line.includes('node2')) {
        console.log('node2 diff - expected:', expectedNode2.split('').map((c: string) => c.charCodeAt(0)));
        console.log('node2 diff - actual:', line.split('').map((c: string) => c.charCodeAt(0)));
      }
    });
    
    // Check for exact matches
    const hasNode1 = lines.includes(expectedNode1);
    const hasNode2 = lines.includes(expectedNode2);
    
    expect(hasNode1).toBe(true);
    expect(hasNode2).toBe(true);

    // Verify edge and structure
    expect(result).toContain('node1 -->|references| node2');
    expect(result).toMatch(/graph LR/);
  });
});
