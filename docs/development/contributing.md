# Contributing to Memory Graph MCP

Thank you for your interest in contributing to the Memory Graph MCP! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Environment](#development-environment)
3. [Code Structure](#code-structure)
4. [Making Changes](#making-changes)
5. [Testing](#testing)
6. [Pull Requests](#pull-requests)
7. [Coding Standards](#coding-standards)
8. [Documentation](#documentation)

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm 7 or higher
- Git
- SQLite (for development and testing)
- MariaDB (optional, for MariaDB storage testing)

### Repository Setup

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/memory-graph.git
   cd memory-graph
   ```
3. Add the original repository as an upstream remote:
   ```bash
   git remote add upstream https://github.com/aaronsb/memory-graph.git
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Build the project:
   ```bash
   npm run build
   ```

## Development Environment

### Running Locally

```bash
# Start in development mode (with watch)
npm run dev

# Start with specific storage type
STORAGE_TYPE=sqlite npm run dev

# Start with HTTP transport
TRANSPORT_TYPE=HTTP PORT=3000 npm run dev
```

### Docker Development

For Docker-based development:

```bash
# Build local image
./scripts/build-local.sh

# Run with Docker
./scripts/run-local.sh
```

## Code Structure

The codebase is structured as follows:

```
memory-graph/
├── src/
│   ├── graph/           # Knowledge graph implementation
│   │   ├── MemoryGraph.ts
│   │   ├── MemoryGraph.test.ts
│   │   ├── MermaidGenerator.ts
│   │   └── MermaidGenerator.test.ts
│   ├── storage/         # Storage backends
│   │   ├── MemoryStorage.ts
│   │   ├── JsonMemoryStorage.ts
│   │   ├── SqliteMemoryStorage.ts
│   │   ├── MariaDbMemoryStorage.ts
│   │   ├── DatabaseStorage.ts
│   │   └── StorageFactory.ts
│   ├── tools/           # MCP tool implementations
│   │   ├── memoryTools.ts
│   │   └── memoryTools.test.ts
│   ├── types/           # TypeScript type definitions
│   │   ├── graph.ts
│   │   └── mcp.ts
│   └── index.ts         # Main server entry
├── scripts/             # Utility scripts
├── docs/                # Documentation
└── tests/               # Additional tests
```

For more details on the architecture, see the [Architecture Documentation](architecture.md).

## Making Changes

### Branch Strategy

- `main`: Stable release branch
- `feature/*`: Feature development branches
- `bugfix/*`: Bug fix branches

### Workflow

1. Sync your fork with the upstream repository:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   git push origin main
   ```

2. Create a new branch for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. Make your changes and commit them:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

4. Push your changes to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

5. Create a pull request from your branch to the main repository.

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring without functionality changes
- `perf`: Performance improvements
- `test`: Adding or modifying tests
- `build`: Build system or dependency changes
- `ci`: CI configuration changes

Examples:
```
feat(storage): add MariaDB storage backend
fix(tools): correct error handling in recall_memories tool
docs: update README with new features
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

- Place test files alongside the code they test, with `.test.ts` suffix
- Use descriptive test names that explain what's being tested
- Write both unit tests and integration tests
- Test edge cases and error conditions

Example test:

```typescript
import { MemoryGraph } from './MemoryGraph';

describe('MemoryGraph', () => {
  let graph: MemoryGraph;
  
  beforeEach(async () => {
    // Setup test graph
    graph = new MemoryGraph({ 
      storageDir: './.test_data',
      storageType: 'json'
    });
    await graph.initialize();
  });
  
  afterEach(async () => {
    // Cleanup
    // ...
  });
  
  test('should store and retrieve memory', async () => {
    // Test implementation
    const memory = await graph.storeMemory({
      content: 'Test memory'
    });
    
    expect(memory).toBeDefined();
    expect(memory.content).toBe('Test memory');
    
    // More assertions...
  });
});
```

## Pull Requests

### PR Checklist

Before submitting a pull request, ensure:

1. All tests pass
2. Code follows project's coding standards
3. New features are properly tested
4. Documentation is updated
5. Changes are backward compatible (or clearly documented if not)
6. The PR has a clear title and description following the commit format

### Review Process

1. All PRs require at least one review
2. Address all review comments
3. Ensure CI checks pass
4. Squash fixup commits before merging

## Coding Standards

### TypeScript Guidelines

- Use TypeScript's strict mode
- Prefer interfaces over types for object shapes
- Use async/await for asynchronous code
- Document public APIs with JSDoc comments
- Use meaningful variable and function names

### Code Style

The project uses ESLint and Prettier for code style:

```bash
# Check code style
npm run lint

# Fix code style issues
npm run lint:fix
```

Key style guidelines:
- Use 2 spaces for indentation
- Use single quotes for strings
- Use semicolons
- Maximum line length of 100 characters
- Trailing commas in multiline objects and arrays

## Documentation

### Documentation Guidelines

- Keep documentation up-to-date with code changes
- Write clear, concise documentation
- Use examples to illustrate usage
- Document both API usage and implementation details
- Use Markdown for all documentation

### Documentation Structure

- `README.md`: Project overview and quick start
- `docs/guides/`: User guides and tutorials
- `docs/concepts/`: Core concepts explanation
- `docs/reference/`: API and tool reference
- `docs/development/`: Developer documentation

When adding a new feature, consider:

1. Updating relevant guides
2. Adding/updating API documentation
3. Providing examples of how to use the feature
4. Explaining design decisions and trade-offs

Thank you for contributing to the Memory Graph MCP project!