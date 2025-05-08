# Revised Memory Graph Documentation Plan

This document outlines the revised plan for restructuring and improving the Memory Graph MCP documentation with a focus on clear organization, elimination of duplicative content, and proper terminology.

## Documentation Structure

We will reorganize the documentation into the following directory structure:

```
docs/
├── README.md                          # Documentation index
├── guides/                            # User-focused guides
│   ├── getting-started.md             # Quick start guide
│   ├── use-cases.md                   # Real-world usage examples
│   ├── storage-switching.md           # How to switch storage backends
│   └── configuration.md               # Configuration options reference
├── concepts/                          # Core concepts and architecture
│   ├── memory-architecture.md         # Domain-based memory architecture
│   ├── graph-model.md                 # Graph data model explanation
│   └── transport-types.md             # STDIO and HTTP transport options
├── reference/                         # Technical reference documentation
│   ├── memory-tools-reference.md      # Tool API reference
│   ├── database-schemas.md            # SQLite and MariaDB schemas
│   └── api-reference.md               # API endpoints (for HTTP transport)
└── development/                       # Developer documentation
    ├── contributing.md                # How to contribute
    ├── architecture.md                # System architecture
    └── testing.md                     # Testing guidelines
```

## Content Organization Principles

1. **Clear Separation of Concerns**
   - User guides separate from technical reference
   - Concepts separate from implementation details
   - Development documentation separate from usage documentation

2. **Progressive Disclosure**
   - Start with simple getting-started content
   - Move to more complex concepts
   - End with detailed technical reference

3. **Consistent Terminology**
   - Use "graph traversal" instead of "memory traversal"
   - Consistently refer to "memory nodes" and "graph edges"
   - Use "graph-based storage" rather than "memory storage"

## Documentation Files to Create/Update

1. **Main Documentation Files**
   - Update README.md
   - Update docs/README.md as a documentation index

2. **Guides**
   - Move getting-started.md to guides/
   - Move use-cases.md to guides/
   - Move storage-switching.md to guides/
   - Create guides/configuration.md

3. **Concepts**
   - Move memoryArchitecture.md to concepts/memory-architecture.md 
   - Create concepts/graph-model.md based on relevant parts of existing docs
   - Move transport-related content to concepts/transport-types.md

4. **Reference**
   - Move memory-tools-reference.md to reference/
   - Move database-schemas.md to reference/
   - Create reference/api-reference.md for HTTP transport API

5. **Development**
   - Create development/contributing.md
   - Create development/architecture.md using content from systemPatterns.md
   - Create development/testing.md

## Files to Remove (after extracting relevant content)

1. productContext.md (outdated, content to be incorporated into README)
2. memory-improvements-todo.md (most items are completed, move remaining to GitHub issues)
3. systemPatterns.md (merge into development/architecture.md)
4. progress.md (historical document, no longer needed)
5. techContext.md (redundant with other documentation)
6. strict-mode.md (merge into guides/configuration.md)

## MIT License Update

Update the license information in:
1. Main README.md
2. Package.json
3. Any code file headers as appropriate

## Implementation Steps

1. **Phase 1: Directory Structure**
   - Create the directory structure
   - Move existing files to their appropriate locations

2. **Phase 2: Content Migration and Consolidation**
   - Update content with consistent terminology
   - Extract relevant information from files to be removed
   - Create new files with consolidated content

3. **Phase 3: Linking and Navigation**
   - Ensure all documentation files link to related content
   - Update main README.md with links to key documentation
   - Create/update documentation index

4. **Phase 4: Cleanup**
   - Remove redundant files after ensuring content is preserved
   - Update license information
   - Final review for terminology consistency

## Style Guide

All documentation should follow these guidelines:

1. **Formatting**
   - Use Markdown for all documentation
   - Use headings consistently (# for title, ## for sections, ### for subsections)
   - Code blocks should specify the language (```typescript, ```sql, etc.)
   - Use tables for structured information

2. **Content**
   - Focus on clarity and conciseness
   - Include practical examples
   - Use active voice
   - Define technical terms
   - Maintain consistent terminology throughout

3. **Examples**
   - All examples should be tested and working
   - TypeScript examples should use current syntax
   - Configuration examples should use current options
   - Command-line examples should use consistent formatting