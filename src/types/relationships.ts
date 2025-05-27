/**
 * Standardized relationship types for the Memory Graph system
 * Provides formal semantics and validation for memory connections
 */

export enum RelationshipType {
  // Basic semantic relationships
  RELATES_TO = 'relates_to',
  SUPPORTS = 'supports',
  CONFLICTS_WITH = 'conflicts_with',
  REFINES = 'refines',
  SYNTHESIZES = 'synthesizes',
  
  // Temporal relationships
  FOLLOWS = 'follows',
  PRECEDES = 'precedes',
  TRIGGERED_BY = 'triggered_by',
  
  // Hierarchical relationships
  CONTAINS = 'contains',
  PART_OF = 'part_of',
  GENERALIZES = 'generalizes',
  SPECIALIZES = 'specializes',
  
  // Causal relationships
  CAUSES = 'causes',
  CAUSED_BY = 'caused_by',
  ENABLES = 'enables',
  PREVENTS = 'prevents',
  
  // Reference relationships
  REFERENCES = 'references',
  REFERENCED_BY = 'referenced_by',
  EXPLAINS = 'explains',
  EXAMPLE_OF = 'example_of',
  
  // Context relationships
  CONTEXT_FOR = 'context_for',
  APPLIES_TO = 'applies_to',
  SIMILAR_TO = 'similar_to',
  ALTERNATIVE_TO = 'alternative_to'
}

/**
 * Metadata about relationship types including their semantic properties
 */
export interface RelationshipTypeInfo {
  type: RelationshipType;
  description: string;
  isBidirectional: boolean;
  isTransitive: boolean;
  inverseType?: RelationshipType;
  semanticWeight: number; // 0-1, how semantically strong this relationship type is
}

/**
 * Comprehensive relationship type definitions with semantic properties
 */
export const RELATIONSHIP_TYPES: Record<RelationshipType, RelationshipTypeInfo> = {
  [RelationshipType.RELATES_TO]: {
    type: RelationshipType.RELATES_TO,
    description: 'General semantic connection between memories',
    isBidirectional: true,
    isTransitive: false,
    semanticWeight: 0.5
  },
  
  [RelationshipType.SUPPORTS]: {
    type: RelationshipType.SUPPORTS,
    description: 'One memory reinforces or validates another',
    isBidirectional: false,
    isTransitive: true,
    semanticWeight: 0.8
  },
  
  [RelationshipType.CONFLICTS_WITH]: {
    type: RelationshipType.CONFLICTS_WITH,
    description: 'Memories contain contradictory information',
    isBidirectional: true,
    isTransitive: false,
    semanticWeight: 0.9
  },
  
  [RelationshipType.REFINES]: {
    type: RelationshipType.REFINES,
    description: 'One memory clarifies or improves upon another',
    isBidirectional: false,
    isTransitive: true,
    semanticWeight: 0.7
  },
  
  [RelationshipType.SYNTHESIZES]: {
    type: RelationshipType.SYNTHESIZES,
    description: 'Memory combines insights from multiple sources',
    isBidirectional: false,
    isTransitive: false,
    semanticWeight: 0.9
  },
  
  [RelationshipType.FOLLOWS]: {
    type: RelationshipType.FOLLOWS,
    description: 'Temporal sequence - this memory comes after another',
    isBidirectional: false,
    isTransitive: true,
    inverseType: RelationshipType.PRECEDES,
    semanticWeight: 0.6
  },
  
  [RelationshipType.PRECEDES]: {
    type: RelationshipType.PRECEDES,
    description: 'Temporal sequence - this memory comes before another',
    isBidirectional: false,
    isTransitive: true,
    inverseType: RelationshipType.FOLLOWS,
    semanticWeight: 0.6
  },
  
  [RelationshipType.TRIGGERED_BY]: {
    type: RelationshipType.TRIGGERED_BY,
    description: 'This memory was created in response to another',
    isBidirectional: false,
    isTransitive: false,
    semanticWeight: 0.8
  },
  
  [RelationshipType.CONTAINS]: {
    type: RelationshipType.CONTAINS,
    description: 'Hierarchical containment - includes another memory as part',
    isBidirectional: false,
    isTransitive: true,
    inverseType: RelationshipType.PART_OF,
    semanticWeight: 0.8
  },
  
  [RelationshipType.PART_OF]: {
    type: RelationshipType.PART_OF,
    description: 'Hierarchical membership - this memory is part of another',
    isBidirectional: false,
    isTransitive: true,
    inverseType: RelationshipType.CONTAINS,
    semanticWeight: 0.8
  },
  
  [RelationshipType.GENERALIZES]: {
    type: RelationshipType.GENERALIZES,
    description: 'This memory represents a broader concept than another',
    isBidirectional: false,
    isTransitive: true,
    inverseType: RelationshipType.SPECIALIZES,
    semanticWeight: 0.7
  },
  
  [RelationshipType.SPECIALIZES]: {
    type: RelationshipType.SPECIALIZES,
    description: 'This memory represents a more specific case of another',
    isBidirectional: false,
    isTransitive: true,
    inverseType: RelationshipType.GENERALIZES,
    semanticWeight: 0.7
  },
  
  [RelationshipType.CAUSES]: {
    type: RelationshipType.CAUSES,
    description: 'Causal relationship - this memory describes a cause',
    isBidirectional: false,
    isTransitive: true,
    inverseType: RelationshipType.CAUSED_BY,
    semanticWeight: 0.9
  },
  
  [RelationshipType.CAUSED_BY]: {
    type: RelationshipType.CAUSED_BY,
    description: 'Causal relationship - this memory describes an effect',
    isBidirectional: false,
    isTransitive: true,
    inverseType: RelationshipType.CAUSES,
    semanticWeight: 0.9
  },
  
  [RelationshipType.ENABLES]: {
    type: RelationshipType.ENABLES,
    description: 'This memory makes another possible or easier',
    isBidirectional: false,
    isTransitive: true,
    semanticWeight: 0.7
  },
  
  [RelationshipType.PREVENTS]: {
    type: RelationshipType.PREVENTS,
    description: 'This memory blocks or inhibits another',
    isBidirectional: false,
    isTransitive: false,
    semanticWeight: 0.8
  },
  
  [RelationshipType.REFERENCES]: {
    type: RelationshipType.REFERENCES,
    description: 'This memory cites or mentions another',
    isBidirectional: false,
    isTransitive: false,
    inverseType: RelationshipType.REFERENCED_BY,
    semanticWeight: 0.4
  },
  
  [RelationshipType.REFERENCED_BY]: {
    type: RelationshipType.REFERENCED_BY,
    description: 'This memory is cited or mentioned by another',
    isBidirectional: false,
    isTransitive: false,
    inverseType: RelationshipType.REFERENCES,
    semanticWeight: 0.4
  },
  
  [RelationshipType.EXPLAINS]: {
    type: RelationshipType.EXPLAINS,
    description: 'This memory provides explanation for another',
    isBidirectional: false,
    isTransitive: false,
    semanticWeight: 0.8
  },
  
  [RelationshipType.EXAMPLE_OF]: {
    type: RelationshipType.EXAMPLE_OF,
    description: 'This memory illustrates a concept from another',
    isBidirectional: false,
    isTransitive: false,
    semanticWeight: 0.6
  },
  
  [RelationshipType.CONTEXT_FOR]: {
    type: RelationshipType.CONTEXT_FOR,
    description: 'This memory provides context for understanding another',
    isBidirectional: false,
    isTransitive: false,
    semanticWeight: 0.6
  },
  
  [RelationshipType.APPLIES_TO]: {
    type: RelationshipType.APPLIES_TO,
    description: 'This memory is relevant to a specific situation in another',
    isBidirectional: false,
    isTransitive: false,
    semanticWeight: 0.7
  },
  
  [RelationshipType.SIMILAR_TO]: {
    type: RelationshipType.SIMILAR_TO,
    description: 'Memories share common characteristics',
    isBidirectional: true,
    isTransitive: false,
    semanticWeight: 0.6
  },
  
  [RelationshipType.ALTERNATIVE_TO]: {
    type: RelationshipType.ALTERNATIVE_TO,
    description: 'Memories represent different approaches to the same problem',
    isBidirectional: true,
    isTransitive: false,
    semanticWeight: 0.7
  }
};

/**
 * Multi-dimensional strength metrics for relationships
 */
export interface RelationshipStrength {
  // Overall relationship strength (0-1)
  overall: number;
  
  // Semantic similarity strength (0-1)
  semantic: number;
  
  // Temporal relevance strength (0-1)
  temporal: number;
  
  // User-defined confidence in this relationship (0-1)
  confidence: number;
  
  // Frequency of access/use (0-1, normalized)
  usage: number;
}

/**
 * Relationship structure with multi-dimensional properties
 */
export interface Relationship {
  targetId: string;
  type: RelationshipType;
  strength: RelationshipStrength;
  
  // Relationship properties
  isBidirectional: boolean;
  isTransitive: boolean;
  isInferred: boolean; // True if relationship was automatically inferred
  
  // Metadata
  created: string; // ISO timestamp
  lastUpdated: string; // ISO timestamp
  evidence?: string[]; // Supporting evidence for this relationship
  tags?: string[];
}


/**
 * Utility functions for relationship management
 */
export class RelationshipUtils {
  /**
   * Get relationship type information
   */
  static getTypeInfo(type: RelationshipType): RelationshipTypeInfo {
    return RELATIONSHIP_TYPES[type];
  }
  
  /**
   * Check if a relationship type is valid
   */
  static isValidType(type: string): type is RelationshipType {
    return Object.values(RelationshipType).includes(type as RelationshipType);
  }
  
  /**
   * Get the inverse relationship type if it exists
   */
  static getInverseType(type: RelationshipType): RelationshipType | null {
    return RELATIONSHIP_TYPES[type].inverseType || null;
  }
  
  /**
   * Calculate composite strength score
   */
  static calculateCompositeStrength(strength: RelationshipStrength): number {
    const weights = {
      overall: 0.3,
      semantic: 0.25,
      temporal: 0.15,
      confidence: 0.2,
      usage: 0.1
    };
    
    return (
      strength.overall * weights.overall +
      strength.semantic * weights.semantic +
      strength.temporal * weights.temporal +
      strength.confidence * weights.confidence +
      strength.usage * weights.usage
    );
  }
  
  /**
   * Create a basic relationship strength with reasonable defaults
   */
  static createBasicStrength(overall: number): RelationshipStrength {
    return {
      overall,
      semantic: overall,
      temporal: 0.5,
      confidence: 0.8,
      usage: 0.5
    };
  }
  
  /**
   * Create a relationship from basic parameters
   */
  static createRelationship(
    targetId: string,
    type: RelationshipType,
    strength: number | RelationshipStrength,
    options: {
      isInferred?: boolean;
      evidence?: string[];
      tags?: string[];
    } = {}
  ): Relationship {
    const typeInfo = this.getTypeInfo(type);
    const relationshipStrength = typeof strength === 'number' 
      ? this.createBasicStrength(strength)
      : strength;
    
    const now = new Date().toISOString();
    
    return {
      targetId,
      type,
      strength: relationshipStrength,
      isBidirectional: typeInfo.isBidirectional,
      isTransitive: typeInfo.isTransitive,
      isInferred: options.isInferred || false,
      created: now,
      lastUpdated: now,
      evidence: options.evidence,
      tags: options.tags
    };
  }
  
  /**
   * Get all relationship types that can be automatically inferred
   */
  static getInferableTypes(): RelationshipType[] {
    return Object.values(RelationshipType).filter(type => {
      const info = RELATIONSHIP_TYPES[type];
      return info.isTransitive || info.inverseType !== undefined;
    });
  }
  
  /**
   * Get relationship types by semantic weight (higher weight = stronger semantic meaning)
   */
  static getTypesBySemanticWeight(): RelationshipType[] {
    return Object.values(RelationshipType).sort((a, b) => 
      RELATIONSHIP_TYPES[b].semanticWeight - RELATIONSHIP_TYPES[a].semanticWeight
    );
  }
}