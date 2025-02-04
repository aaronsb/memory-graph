import {
  MemoryNode,
  GraphEdge,
  GenerateMermaidGraphInput
} from '../types/graph.js';

export class MermaidGenerator {
  private nodes: Map<string, MemoryNode>;
  private edges: GraphEdge[];

  constructor(nodes: Map<string, MemoryNode>, edges: GraphEdge[]) {
    this.nodes = nodes;
    this.edges = edges;
  }

  generateGraph(input: GenerateMermaidGraphInput): string {
    const visitedNodes = new Set<string>();
    const graphEdges: GraphEdge[] = [];
    const maxDepth = input.maxDepth || 2;
    
    // Traverse graph using BFS
    this.traverseGraph(
      input.startNodeId,
      maxDepth,
      visitedNodes,
      graphEdges,
      input.relationshipTypes,
      input.minStrength
    );

    // Generate Mermaid syntax
    return this.generateMermaidSyntax(
      Array.from(visitedNodes).map(id => this.nodes.get(id)!),
      graphEdges,
      input.direction || 'LR'
    );
  }

  private traverseGraph(
    startId: string,
    maxDepth: number,
    visitedNodes: Set<string>,
    graphEdges: GraphEdge[],
    relationshipTypes?: string[],
    minStrength?: number,
    currentDepth = 0
  ): void {
    if (currentDepth >= maxDepth || !this.nodes.has(startId)) {
      return;
    }

    visitedNodes.add(startId);

    // Get relevant edges for this node
    const nodeEdges = this.edges.filter(edge => 
      (edge.source === startId || edge.target === startId) &&
      (!relationshipTypes || relationshipTypes.includes(edge.type)) &&
      (!minStrength || edge.strength >= minStrength)
    );

    // Add edges and traverse connected nodes
    for (const edge of nodeEdges) {
      const targetId = edge.source === startId ? edge.target : edge.source;
      
      if (!visitedNodes.has(targetId)) {
        graphEdges.push(edge);
        this.traverseGraph(
          targetId,
          maxDepth,
          visitedNodes,
          graphEdges,
          relationshipTypes,
          minStrength,
          currentDepth + 1
        );
      } else if (!graphEdges.includes(edge)) {
        graphEdges.push(edge);
      }
    }
  }

  private generateMermaidSyntax(nodes: MemoryNode[], edges: GraphEdge[], direction: string): string {
    const lines: string[] = [`graph ${direction}`];
    const addedNodes = new Set<string>();

    // Add nodes from the visited set
    for (const node of nodes) {
      const content = this.truncateContent(node.content);
      lines.push(`    ${node.id}["${this.escapeQuotes(content)}"]`);
      addedNodes.add(node.id);
    }

    // Add nodes from edges that might not be in the visited set
    for (const edge of edges) {
      for (const id of [edge.source, edge.target]) {
        if (!addedNodes.has(id) && this.nodes.has(id)) {
          const node = this.nodes.get(id)!;
          const content = this.truncateContent(node.content);
          lines.push(`    ${id}["${this.escapeQuotes(content)}"]`);
          addedNodes.add(id);
        }
      }
    }

    // Add edges
    for (const edge of edges) {
      lines.push(
        `    ${edge.source} -->|${this.escapeQuotes(edge.type)}| ${edge.target}`
      );
    }

    return lines.join('\n');
  }

  private truncateContent(content: string, maxLength = 50): string {
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength - 3) + '...';
  }

  private escapeQuotes(text: string): string {
    return text.replace(/"/g, '\\"');
  }
}
