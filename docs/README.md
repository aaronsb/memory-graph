# Memory Graph MCP Documentation

Welcome to the Memory Graph MCP documentation. This directory contains detailed documentation for the Memory Graph MCP server, which provides persistent memory capabilities through a local knowledge graph implementation.

## Documentation Index

### Getting Started

- [Getting Started Guide](guides/getting-started.md) - Quick setup and basic usage guide
- [Use Cases](guides/use-cases.md) - Examples of how to use Memory Graph in real-world scenarios
- [Configuration](guides/configuration.md) - Comprehensive configuration options

### Features

#### Storage

- [Storage Overview](features/storage/overview.md) - Overview of storage backends
- [JSON Storage](features/storage/json-storage.md) - File-based storage details
- [SQLite Storage](features/storage/sqlite-storage.md) - SQLite storage details
- [MariaDB Storage](features/storage/mariadb-storage.md) - MariaDB storage details
- [Converting Between Storage Types](features/storage/converting.md) - How to migrate data between storage backends

#### Transport

- [Transport Overview](features/transport/overview.md) - Overview of transport types
- [STDIO Transport](features/transport/stdio-transport.md) - Standard I/O transport details
- [HTTP Transport](features/transport/http-transport.md) - HTTP transport details

### Core Concepts

- [Memory Architecture](concepts/memory-architecture.md) - Detailed documentation of the domain-based system
- [Graph Model](concepts/graph-model.md) - Explanation of the graph data model

### Reference Documentation

- [Memory Tools Reference](reference/memory-tools-reference.md) - Comprehensive reference for all memory tools
- [Database Schemas](reference/database-schemas.md) - Technical reference for SQLite and MariaDB schemas

### Developer Documentation

- [Architecture](development/architecture.md) - System architecture and design patterns
- [Contributing](development/contributing.md) - Guidelines for contributing to the project
- [Testing](development/testing.md) - Testing strategy and best practices

## Other Resources

For a quick overview of the project, installation instructions, and basic usage, see the [main README](../README.md).

## Contributing to Documentation

If you'd like to contribute to the Memory Graph MCP documentation, please follow these guidelines:

1. Use Markdown for all documentation
2. Organize documentation by capability rather than document type
3. Include practical examples when possible
4. Ensure documentation is clear, concise, and accurate
5. Update both code and documentation when making changes