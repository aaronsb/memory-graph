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

  it('generates basic graph with default settings', () => {
    const result = generator.generateGraph({
      startNodeId: 'node1'
    });

    expect(result).toContain('graph LR');
    expect(result).toContain('node1["First memory"]');
    expect(result).toContain('node2["Second memory"]');
    expect(result).toContain('node1 -->|references| node2');
  });

  it('respects maxDepth parameter', () => {
    const result = generator.generateGraph({
      startNodeId: 'node1',
      maxDepth: 1
    });

    expect(result).toContain('node1["First memory"]');
    expect(result).toContain('node2["Second memory"]');
    expect(result).toContain('node1 -->|references| node2');
    expect(result).not.toContain('node3');
  });

  it('filters by relationship type', () => {
    const result = generator.generateGraph({
      startNodeId: 'node1',
      relationshipTypes: ['references']
    });

    expect(result).toContain('node1 -->|references| node2');
    expect(result).not.toContain('relates_to');
  });

  it('filters by minimum strength', () => {
    const result = generator.generateGraph({
      startNodeId: 'node1',
      minStrength: 0.7
    });

    expect(result).toContain('node1 -->|references| node2');
    expect(result).not.toContain('relates_to');
  });

  it('handles custom direction', () => {
    const result = generator.generateGraph({
      startNodeId: 'node1',
      direction: 'TB'
    });

    expect(result).toContain('graph TB');
  });

  it('truncates long content', () => {
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

    const result = generator.generateGraph({
      startNodeId: 'node1'
    });

    expect(result).toContain('...');
    expect(result.includes('A'.repeat(100))).toBeFalsy();
  });

  it('escapes quotes in content', () => {
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

    const result = generator.generateGraph({
      startNodeId: 'node1'
    });

    expect(result).toContain('\\"quotes\\"');
  });

  it('handles non-existent start node', () => {
    const result = generator.generateGraph({
      startNodeId: 'nonexistent'
    });

    expect(result).toBe('graph LR');
  });
});
