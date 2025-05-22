import { 
  RelationshipType, 
  Relationship, 
  RelationshipUtils,
  RelationshipStrength 
} from '../types/relationships.js';
import { MemoryNode, GraphEdge } from '../types/graph.js';

/**
 * Manages relationships between memory nodes with automatic inverse creation
 * and transitive relationship inference
 */
export class RelationshipManager {
  private edges: Map<string, GraphEdge[]> = new Map(); // nodeId -> edges
  private inferredEdges: Set<string> = new Set(); // Track inferred edges by ID
  
  constructor(existingEdges: GraphEdge[] = []) {
    this.loadExistingEdges(existingEdges);
  }
  
  /**
   * Load existing edges into the manager
   */
  private loadExistingEdges(edges: GraphEdge[]): void {
    for (const edge of edges) {
      this.addEdgeInternal(edge, false); // Don't auto-create inverse for existing edges
    }
  }
  
  /**
   * Map legacy relationship types to new enum values
   */
  private mapLegacyType(type: string): RelationshipType {
    const mapping: Record<string, RelationshipType> = {
      'relates_to': RelationshipType.RELATES_TO,
      'supports': RelationshipType.SUPPORTS,
      'refines': RelationshipType.REFINES,
      'synthesizes': RelationshipType.SYNTHESIZES,
      'follows': RelationshipType.FOLLOWS,
      'contains': RelationshipType.CONTAINS,
      'part_of': RelationshipType.PART_OF,
      'causes': RelationshipType.CAUSES,
      'references': RelationshipType.REFERENCES,
      'explains': RelationshipType.EXPLAINS,
      'similar_to': RelationshipType.SIMILAR_TO
    };
    
    return mapping[type.toLowerCase()] || RelationshipType.RELATES_TO;
  }
  
  /**
   * Get relationship type from edge (handles both legacy and new format)
   */
  private getEdgeType(edge: GraphEdge): RelationshipType {
    if (edge.relationship?.type) {
      return RelationshipUtils.isValidType(edge.relationship.type) 
        ? edge.relationship.type as RelationshipType
        : this.mapLegacyType(edge.relationship.type);
    }
    return RelationshipUtils.isValidType(edge.type)
      ? edge.type as RelationshipType
      : this.mapLegacyType(edge.type);
  }
  
  /**
   * Generate unique edge ID for tracking
   */
  private generateEdgeId(source: string, target: string, type: RelationshipType): string {
    return `${source}->${target}:${type}`;
  }
  
  /**
   * Add edge to internal structure
   */
  private addEdgeInternal(edge: GraphEdge, createInverse: boolean = true): void {
    const sourceEdges = this.edges.get(edge.source) || [];
    sourceEdges.push(edge);
    this.edges.set(edge.source, sourceEdges);
    
    // Also index by target for efficient lookups
    const targetEdges = this.edges.get(edge.target) || [];
    targetEdges.push(edge);
    this.edges.set(edge.target, targetEdges);
    
    // Create inverse relationship if applicable and not already creating inverse
    if (createInverse) {
      this.createInverseRelationship(edge);
    }
  }
  
  /**
   * Create inverse relationship if the type supports it
   */
  private createInverseRelationship(edge: GraphEdge): void {
    const edgeType = this.getEdgeType(edge);
    const inverseType = RelationshipUtils.getInverseType(edgeType);
    
    if (inverseType) {
      const inverseEdgeId = this.generateEdgeId(edge.target, edge.source, inverseType);
      
      // Don't create if inverse already exists
      if (this.inferredEdges.has(inverseEdgeId)) {
        return;
      }
      
      const inverseEdge: GraphEdge = {
        source: edge.target,
        target: edge.source,
        type: inverseType,
        strength: edge.strength,
        timestamp: edge.timestamp,
        relationship: RelationshipUtils.createRelationship(
          edge.source,
          inverseType,
          edge.strength,
          { 
            isInferred: true,
            evidence: [`Inverse of ${edgeType} relationship`]
          }
        )
      };
      
      this.inferredEdges.add(inverseEdgeId);
      this.addEdgeInternal(inverseEdge, false); // Don't create inverse of inverse
    }
  }
  
  /**
   * Add a new relationship between nodes
   */
  addRelationship(
    sourceId: string, 
    targetId: string, 
    type: RelationshipType, 
    strength: number | RelationshipStrength,
    options: {
      evidence?: string[];
      tags?: string[];
      skipInference?: boolean;
    } = {}
  ): GraphEdge {
    const relationship = RelationshipUtils.createRelationship(
      targetId,
      type,
      strength,
      { 
        evidence: options.evidence,
        tags: options.tags
      }
    );
    
    const compositeStrength = typeof strength === 'number' 
      ? strength 
      : RelationshipUtils.calculateCompositeStrength(strength);
    
    const edge: GraphEdge = {
      source: sourceId,
      target: targetId,
      type: type,
      strength: compositeStrength,
      timestamp: new Date().toISOString(),
      relationship
    };
    
    this.addEdgeInternal(edge);
    
    return edge;
  }
  
  /**
   * Remove a relationship and its inferred counterparts
   */
  removeRelationship(sourceId: string, targetId: string, type: RelationshipType): boolean {
    // Remove the main edge
    let sourceEdges = this.edges.get(sourceId) || [];
    const originalLength = sourceEdges.length;
    sourceEdges = sourceEdges.filter(edge => 
      !(edge.target === targetId && this.getEdgeType(edge) === type)
    );
    this.edges.set(sourceId, sourceEdges);
    
    // Remove from target's edge list too
    let targetEdges = this.edges.get(targetId) || [];
    targetEdges = targetEdges.filter(edge => 
      !(edge.source === sourceId && this.getEdgeType(edge) === type)
    );
    this.edges.set(targetId, targetEdges);
    
    // Remove any inferred edges that were created from this relationship
    this.removeInferredEdges(sourceId, targetId, type);
    
    return sourceEdges.length < originalLength;
  }
  
  /**
   * Remove inferred edges that depend on a removed relationship
   */
  private removeInferredEdges(sourceId: string, targetId: string, type: RelationshipType): void {
    // Remove inverse relationship if it exists
    const inverseType = RelationshipUtils.getInverseType(type);
    if (inverseType) {
      const inverseEdgeId = this.generateEdgeId(targetId, sourceId, inverseType);
      if (this.inferredEdges.has(inverseEdgeId)) {
        this.removeRelationship(targetId, sourceId, inverseType);
        this.inferredEdges.delete(inverseEdgeId);
      }
    }
  }
  
  /**
   * Get all edges for a specific node
   */
  getNodeEdges(nodeId: string): GraphEdge[] {
    return this.edges.get(nodeId) || [];
  }
  
  /**
   * Get edges connecting two specific nodes
   */
  getEdgesBetween(sourceId: string, targetId: string): GraphEdge[] {
    const sourceEdges = this.edges.get(sourceId) || [];
    return sourceEdges.filter(edge => edge.target === targetId);
  }
  
  /**
   * Get all edges in the graph
   */
  getAllEdges(): GraphEdge[] {
    const allEdges: GraphEdge[] = [];
    const seen = new Set<string>();
    
    for (const edges of this.edges.values()) {
      for (const edge of edges) {
        const edgeType = this.getEdgeType(edge);
        const edgeId = this.generateEdgeId(edge.source, edge.target, edgeType);
        if (!seen.has(edgeId)) {
          allEdges.push(edge);
          seen.add(edgeId);
        }
      }
    }
    
    return allEdges;
  }
  
  /**
   * Get relationship statistics
   */
  getStatistics(): {
    totalRelationships: number;
    inferredRelationships: number;
    relationshipTypeDistribution: Record<string, number>;
    averageStrength: number;
  } {
    const allEdges = this.getAllEdges();
    const inferredCount = allEdges.filter(edge => 
      edge.relationship?.isInferred || false
    ).length;
    const typeDistribution: Record<string, number> = {};
    let totalStrength = 0;
    
    for (const edge of allEdges) {
      const type = this.getEdgeType(edge);
      typeDistribution[type] = (typeDistribution[type] || 0) + 1;
      totalStrength += edge.strength;
    }
    
    return {
      totalRelationships: allEdges.length,
      inferredRelationships: inferredCount,
      relationshipTypeDistribution: typeDistribution,
      averageStrength: allEdges.length > 0 ? totalStrength / allEdges.length : 0
    };
  }
}