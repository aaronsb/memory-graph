# Memory Graph Documentation Plan

This document outlines the plan for restructuring and improving the Memory Graph MCP documentation.

## Documentation Structure

We will reorganize the documentation into the following main sections:

1. **Getting Started**
   - Installation
   - Configuration
   - Quick Start Guide

2. **Core Concepts**
   - Domain-Based Memory Architecture
   - Memory Graph Structure
   - Cross-Domain References

3. **User Guides**
   - Memory Tools Reference
   - Use Cases and Examples
   - Configuration Options

4. **Advanced Topics**
   - Storage Backends
   - Transport Types
   - Full-Text Search
   - Visualization

5. **Developer Documentation**
   - Architecture
   - API Reference
   - Contributing Guidelines

## Files to Update

1. **README.md**
   - Update introduction and feature list
   - Modernize the installation and configuration sections
   - Update example usage with current API
   - Add links to the new documentation structure

2. **memoryArchitecture.md**
   - Keep as is (current content is good and up-to-date)
   - Add links to related documentation

3. **storage-switching.md**
   - Update to include all three storage backends (JSON, SQLite, MariaDB)
   - Improve conversion examples
   - Add section on when to use each storage type

## Files to Create

1. **getting-started.md**
   - Simple step-by-step guide for new users
   - Basic examples for common operations
   - Quick configuration reference

2. **memory-tools-reference.md**
   - Comprehensive reference for all memory tools
   - Parameters and examples for each tool
   - Best practices for tool usage

3. **configuration-reference.md**
   - All configuration options documented in one place
   - Environment variables
   - Default values and acceptable ranges

4. **transport-types.md**
   - Documentation on STDIO and HTTP transport options
   - Configuration examples for each

## Files to Merge

1. **aiPerspectiveUseCases.md** and **humanPerspectiveUseCases.md**
   - Merge into a single **use-cases.md** file
   - Organize by use case category rather than perspective
   - Keep the valuable examples from both files

2. **sqlite-schema.md**, **mariadb-schema.md**, and **sqlite-storage-design.md**
   - Merge into a single **database-schemas.md** file
   - Common database concepts section
   - Separate sections for SQLite and MariaDB specifics

## Files to Remove (after merging content)

1. **productContext.md** (outdated, content to be incorporated into README)
2. **memory-improvements-todo.md** (most items are completed, move remaining to GitHub issues)
3. **systemPatterns.md** (too brief, content to be expanded in architecture documentation)
4. **techContext.md** (redundant with other documentation)
5. **progress.md** (historical document, no longer needed)

## Timeline

1. **Phase 1: Core Structure**
   - Update README.md
   - Create getting-started.md
   - Merge use case files

2. **Phase 2: Technical Documentation**
   - Create memory-tools-reference.md
   - Update storage-switching.md
   - Merge database schema files

3. **Phase 3: Finalization**
   - Create transport-types.md and configuration-reference.md
   - Remove redundant files
   - Ensure consistent formatting and linking

## Style Guide

All documentation should follow these guidelines:

1. **Formatting**
   - Use Markdown for all documentation
   - Use headings (# for title, ## for sections, ### for subsections)
   - Code blocks should specify the language (```typescript, ```sql, etc.)
   - Use tables for structured information

2. **Content**
   - Focus on clarity and conciseness
   - Include practical examples
   - Use active voice
   - Define technical terms
   - Link to related documentation

3. **Examples**
   - All examples should be tested and working
   - TypeScript examples should use current syntax
   - Configuration examples should use current options
   - Command-line examples should use consistent formatting