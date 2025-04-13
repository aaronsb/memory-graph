import {
  MemoryNode,
  GraphEdge,
  GenerateMermaidGraphInput,
  MermaidContentFormat
} from '../types/graph.js';

export class MermaidGenerator {
  private nodes: Map<string, MemoryNode>;
  private edges: GraphEdge[];
  private memoryGraph: any; // Reference to the MemoryGraph instance

  constructor(nodes: Map<string, MemoryNode>, edges: GraphEdge[], memoryGraph?: any) {
    this.nodes = nodes;
    this.edges = edges;
    this.memoryGraph = memoryGraph;
  }

  // Helper method to get the current domain
  private getCurrentDomain(): string {
    if (this.memoryGraph && typeof this.memoryGraph.getCurrentDomain === 'function') {
      return this.memoryGraph.getCurrentDomain();
    }
    return 'general'; // Default domain
  }

  // Helper method to select a domain
  private async selectDomain(domain: string): Promise<void> {
    if (this.memoryGraph && typeof this.memoryGraph.selectDomain === 'function') {
      await this.memoryGraph.selectDomain(domain);
      // Update nodes and edges after domain switch
      this.nodes = this.memoryGraph['nodes'];
      this.edges = this.memoryGraph['edges'];
    }
  }

  // Helper method to get a node from a specific domain
  private async getNodeFromDomain(domain: string, nodeId: string): Promise<MemoryNode | null> {
    if (!this.memoryGraph) {
      return null;
    }

    const originalDomain = this.getCurrentDomain();
    try {
      await this.selectDomain(domain);
      const node = this.nodes.get(nodeId);
      return node || null;
    } finally {
      // Switch back to original domain
      if (originalDomain !== domain) {
        await this.selectDomain(originalDomain);
      }
    }
  }

  // Helper method to sanitize domain names for CSS class names
  private sanitizeDomainName(domain: string): string {
    return domain.replace(/[^a-zA-Z0-9]/g, '_');
  }

  async generateGraph(input: GenerateMermaidGraphInput): Promise<string> {
    const visitedNodes = new Set<string>();
    const graphEdges: GraphEdge[] = [];
    const maxDepth = input.maxDepth || 2;
    const followDomainPointers = input.followDomainPointers !== false; // Default to true
    const domainNodes = new Map<string, Set<string>>();
    const crossDomainConnections: Array<{
      fromDomain: string,
      fromNodeId: string,
      toDomain: string,
      toNodeId: string,
      description?: string
    }> = [];
    
    // Initialize domain nodes tracking
    const currentDomain = this.getCurrentDomain();
    domainNodes.set(currentDomain, new Set<string>());
    
    // Remember original domain
    const originalDomain = this.getCurrentDomain();
    
    try {
      // Traverse graph using BFS
      await this.traverseGraph(
        input.startNodeId,
        maxDepth,
        visitedNodes,
        graphEdges,
        input.relationshipTypes,
        input.minStrength,
        0,
        followDomainPointers,
        domainNodes,
        crossDomainConnections
      );

      // Collect nodes from all domains
      const allNodes: MemoryNode[] = [];
      // Use Array.from to avoid issues with Map iteration
      const domainEntries = Array.from(domainNodes.entries());
      for (let i = 0; i < domainEntries.length; i++) {
        const [domain, nodeIds] = domainEntries[i];
        const nodeIdsArray = Array.from(nodeIds);
        for (let j = 0; j < nodeIdsArray.length; j++) {
          const nodeId = nodeIdsArray[j];
          const node = await this.getNodeFromDomain(domain, nodeId);
          if (node) {
            allNodes.push(node);
          }
        }
      }

      // Generate Mermaid syntax
      return this.generateMermaidSyntax(
        allNodes,
        graphEdges,
        input.direction || 'LR',
        input.contentFormat,
        domainNodes,
        crossDomainConnections
      );
    } finally {
      // Switch back to original domain
      if (this.getCurrentDomain() !== originalDomain) {
        await this.selectDomain(originalDomain);
      }
    }
  }

  private async traverseGraph(
    startId: string,
    maxDepth: number,
    visitedNodes: Set<string>,
    graphEdges: GraphEdge[],
    relationshipTypes?: string[],
    minStrength?: number,
    currentDepth = 0,
    followDomainPointers = true,
    domainNodes = new Map<string, Set<string>>(),
    crossDomainConnections: Array<{
      fromDomain: string,
      fromNodeId: string,
      toDomain: string,
      toNodeId: string,
      description?: string
    }> = []
  ): Promise<void> {
    if (currentDepth >= maxDepth || !this.nodes.has(startId)) {
      return;
    }

    // Track nodes by domain
    const currentDomain = this.getCurrentDomain();
    if (!domainNodes.has(currentDomain)) {
      domainNodes.set(currentDomain, new Set<string>());
    }
    domainNodes.get(currentDomain)!.add(startId);
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
        await this.traverseGraph(
          targetId,
          maxDepth,
          visitedNodes,
          graphEdges,
          relationshipTypes,
          minStrength,
          currentDepth + 1,
          followDomainPointers,
          domainNodes,
          crossDomainConnections
        );
      } else if (!graphEdges.includes(edge)) {
        graphEdges.push(edge);
      }
    }

    // Follow domain references if enabled
    if (followDomainPointers && this.memoryGraph) {
      const node = this.nodes.get(startId);
      if (node?.domainRefs && node.domainRefs.length > 0) {
        // Remember original domain
        const originalDomain = this.getCurrentDomain();
        
        for (const domainRef of node.domainRefs) {
          // Add cross-domain connection
          crossDomainConnections.push({
            fromDomain: originalDomain,
            fromNodeId: startId,
            toDomain: domainRef.domain,
            toNodeId: domainRef.nodeId,
            description: domainRef.description
          });
          
          // Switch to target domain
          await this.selectDomain(domainRef.domain);
          
          // Traverse in target domain if node exists
          if (this.nodes.has(domainRef.nodeId) && !visitedNodes.has(domainRef.nodeId)) {
            await this.traverseGraph(
              domainRef.nodeId,
              maxDepth,
              visitedNodes,
              graphEdges,
              relationshipTypes,
              minStrength,
              currentDepth + 1,
              followDomainPointers,
              domainNodes,
              crossDomainConnections
            );
          }
          
          // Switch back to original domain
          await this.selectDomain(originalDomain);
        }
      }
    }
  }

  private generateMermaidSyntax(
    nodes: MemoryNode[], 
    edges: GraphEdge[], 
    direction: string, 
    contentFormat?: MermaidContentFormat,
    domainNodes = new Map<string, Set<string>>(),
    crossDomainConnections: Array<{
      fromDomain: string,
      fromNodeId: string,
      toDomain: string,
      toNodeId: string,
      description?: string
    }> = []
  ): string {
    const lines: string[] = [`graph ${direction}`];
    const addedNodes = new Set<string>();

    // Define styles for different domains
    lines.push('    %% Domain styles');
    const domains = Array.from(domainNodes.keys());
    const colors = ['#f9f9f9', '#e6f7ff', '#f0f9e8', '#fff7e6', '#f9e6f4'];
    
    domains.forEach((domain, index) => {
      const color = colors[index % colors.length];
      lines.push(`    classDef ${this.sanitizeDomainName(domain)} fill:${color},stroke:#666,stroke-width:1px`);
    });
    
    // Add nodes from the visited set
    for (const node of nodes) {
      const content = this.formatNodeContent(node, contentFormat);
      lines.push(`    ${node.id}["${this.escapeQuotes(content)}"]`);
      addedNodes.add(node.id);
    }

    // Add nodes from edges that might not be in the visited set
    for (const edge of edges) {
      for (const id of [edge.source, edge.target]) {
        if (!addedNodes.has(id) && this.nodes.has(id)) {
          const node = this.nodes.get(id)!;
          const content = this.formatNodeContent(node, contentFormat);
          lines.push(`    ${id}["${this.escapeQuotes(content)}"]`);
          addedNodes.add(id);
        }
      }
    }

    // Add regular edges
    for (const edge of edges) {
      lines.push(
        `    ${edge.source} -->|${this.escapeQuotes(edge.type)}| ${edge.target}`
      );
    }
    
    // Add cross-domain connections with dashed lines and different arrow style
    if (crossDomainConnections.length > 0) {
      lines.push('    %% Cross-domain connections');
      for (const conn of crossDomainConnections) {
        const label = conn.description ? this.escapeQuotes(conn.description) : 'domain-ref';
        lines.push(`    ${conn.fromNodeId} -.->|${label}| ${conn.toNodeId}`);
      }
    }
    
    // Apply domain classes to nodes
    if (domains.length > 0) {
      lines.push('    %% Apply domain styles');
      domains.forEach(domain => {
        const nodeIds = Array.from(domainNodes.get(domain) || []);
        if (nodeIds.length > 0) {
          lines.push(`    class ${nodeIds.join(',')} ${this.sanitizeDomainName(domain)}`);
        }
      });
    }

    return lines.join('\n');
  }

  private formatNodeContent(node: MemoryNode, format?: MermaidContentFormat): string {
    // Use title if available, otherwise use content
    let content = node.title || node.content;

    // Add optional metadata
    const parts: string[] = [];
    
    if (format?.includeId) {
      parts.push(`[${node.id}]`);
    }
    
    parts.push(this.truncateContent(content, format?.maxLength, format?.truncationSuffix));
    
    if (format?.includeTimestamp) {
      // Parse the UTC timestamp
      const utcDate = new Date(node.timestamp);
      
      // Create a new date object for CST (UTC-6)
      const cstDate = new Date(utcDate);
      cstDate.setUTCHours(utcDate.getUTCHours() - 6);
      
      // Set to noon CST
      cstDate.setHours(12, 0, 0);
      
      // Format date parts individually to avoid the comma
      const dateFormatter = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      });
      const timeFormatter = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      
      const dateStr = dateFormatter.format(cstDate);
      const timeStr = timeFormatter.format(cstDate);
      parts.push(`(${dateStr} ${timeStr})`);
    }

    return parts.join(' ');
  }

  private truncateContent(content: string, maxLength = 50, truncationSuffix = '...'): string {
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength - truncationSuffix.length) + truncationSuffix;
  }

  private escapeQuotes(text: string): string {
    return text.replace(/"/g, '\\"');
  }
}
