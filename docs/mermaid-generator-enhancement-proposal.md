# Mermaid Generator Enhancement Proposal

## Overview

This document proposes enhancements to the MermaidGenerator class to support visualization of cross-domain memory references in the generated Mermaid diagrams.

## Current Limitations

The current MermaidGenerator implementation has the following limitations:

1. It only traverses the graph using the edges in the current domain and doesn't follow domain references
2. It doesn't visually distinguish between nodes from different domains
3. It doesn't represent cross-domain connections in the Mermaid syntax

## Proposed Enhancements

### 1. Cross-Domain Traversal

Enhance the `traverseGraph` method to also check for domain references in each node:

```typescript
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
  visitedNodes.add(`${currentDomain}:${startId}`);

  // Get relevant edges for this node
  const nodeEdges = this.edges.filter(edge => 
    (edge.source === startId || edge.target === startId) &&
    (!relationshipTypes || relationshipTypes.includes(edge.type)) &&
    (!minStrength || edge.strength >= minStrength)
  );

  // Add edges and traverse connected nodes
  for (const edge of nodeEdges) {
    const targetId = edge.source === startId ? edge.target : edge.source;
    
    if (!visitedNodes.has(`${currentDomain}:${targetId}`)) {
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
    } else if (!graphEdges.some(e => 
      (e.source === edge.source && e.target === edge.target) || 
      (e.source === edge.target && e.target === edge.source)
    )) {
      graphEdges.push(edge);
    }
  }

  // Follow domain references if enabled
  if (followDomainPointers) {
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
        
        // Traverse in target domain
        if (!visitedNodes.has(`${domainRef.domain}:${domainRef.nodeId}`)) {
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
```

### 2. Visual Distinction for Cross-Domain Nodes

Modify the `generateMermaidSyntax` method to visually distinguish nodes from different domains:

```typescript
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
  lines.push('    %% Cross-domain connections');
  for (const conn of crossDomainConnections) {
    const label = conn.description ? this.escapeQuotes(conn.description) : 'domain-ref';
    lines.push(`    ${conn.fromNodeId} -.->|${label}| ${conn.toNodeId}`);
  }
  
  // Apply domain classes to nodes
  lines.push('    %% Apply domain styles');
  domains.forEach(domain => {
    const nodeIds = Array.from(domainNodes.get(domain) || []);
    if (nodeIds.length > 0) {
      lines.push(`    class ${nodeIds.join(',')} ${this.sanitizeDomainName(domain)}`);
    }
  });

  return lines.join('\n');
}

private sanitizeDomainName(domain: string): string {
  return domain.replace(/[^a-zA-Z0-9]/g, '_');
}
```

### 3. Update the `generateGraph` Method

Update the `generateGraph` method to support cross-domain traversal:

```typescript
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

    // Generate Mermaid syntax
    return this.generateMermaidSyntax(
      Array.from(visitedNodes).map(id => {
        const [domain, nodeId] = id.split(':');
        return this.getNodeFromDomain(domain, nodeId);
      }).filter(Boolean) as MemoryNode[],
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
```

### 4. Add Helper Methods

Add helper methods to get the current domain, select a domain, and get a node from a specific domain:

```typescript
private getCurrentDomain(): string {
  // This would need to be implemented to get the current domain
  // Could be passed in from the MemoryGraph instance
  return 'current-domain';
}

private async selectDomain(domain: string): Promise<void> {
  // This would need to be implemented to switch domains
  // Could be passed in from the MemoryGraph instance
}

private getNodeFromDomain(domain: string, nodeId: string): MemoryNode | null {
  // This would need to be implemented to get a node from a specific domain
  // Could be passed in from the MemoryGraph instance
  return null;
}
```

## Implementation Considerations

1. The MermaidGenerator would need access to the MemoryGraph instance or its methods to:
   - Get the current domain
   - Switch between domains
   - Access nodes from different domains

2. The GenerateMermaidGraphInput interface would need to be updated to include a followDomainPointers option:

```typescript
export interface GenerateMermaidGraphInput {
  startNodeId: string;
  maxDepth?: number;
  direction?: 'TB' | 'BT' | 'LR' | 'RL';
  relationshipTypes?: string[];
  minStrength?: number;
  contentFormat?: MermaidContentFormat;
  followDomainPointers?: boolean; // New option
}
```

## Visual Representation

The enhanced Mermaid diagrams would:

1. Use different background colors for nodes from different domains
2. Use dashed lines with a different arrow style for cross-domain connections
3. Include domain information in the node labels

## Example Output

```
graph LR
    %% Domain styles
    classDef general fill:#f9f9f9,stroke:#666,stroke-width:1px
    classDef github_workflow fill:#e6f7ff,stroke:#666,stroke-width:1px
    
    m7l6uvnr36pc3uq7pc4["[m7l6uvnr36pc3uq7pc4] This is a test memory..."]
    m7kp66qxbyiyztgd55i["[m7kp66qxbyiyztgd55i] The GitHub development workflow..."]
    
    %% Cross-domain connections
    m7l6uvnr36pc3uq7pc4 -.->|Points to the GitHub workflow summary memory| m7kp66qxbyiyztgd55i
    
    %% Apply domain styles
    class m7l6uvnr36pc3uq7pc4 general
    class m7kp66qxbyiyztgd55i github_workflow
```

This would render a diagram with:
- The test memory node with a light gray background
- The GitHub workflow node with a light blue background
- A dashed line connecting them with the description as the label
