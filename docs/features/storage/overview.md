# Storage Capabilities

The Memory Graph MCP supports multiple storage backends to accommodate different deployment scenarios, from simple development environments to production systems with high performance requirements.

## Available Storage Backends

### JSON Storage
Simple file-based storage using JSON files:
- One JSON file per domain
- Easy to inspect and manually edit
- Good for development and small deployments
- No special dependencies required

### SQLite Storage
Single-file database storage with improved performance:
- One database file for all domains
- Efficient queries and storage
- Full-text search capabilities
- Better performance for large datasets
- Good for local and single-user deployments

### MariaDB Storage
Client-server database storage for production deployments:
- Separate database server
- Connection pooling for concurrent access
- Full-text search capabilities
- Better performance for high-load scenarios
- Suitable for multi-user environments

## Storage Comparison

| Feature | JSON | SQLite | MariaDB |
|---------|------|--------|---------|
| **Setup Complexity** | Low | Low | Medium |
| **Query Performance** | Low | Medium | High |
| **Full-Text Search** | Basic | Advanced | Advanced |
| **Concurrent Access** | Limited | Medium | High |
| **Memory Efficiency** | Low | High | High |
| **Deployment Type** | Development | Local/Single-user | Production/Multi-user |
| **Dependencies** | None | SQLite | MariaDB Server |
| **Data Inspection** | Easy | Medium | Medium |
| **Backup Process** | File copy | File copy | Database backup |

## Choosing a Storage Backend

Select a storage backend based on your specific needs:

- **Development**: Use JSON storage for simplicity during development
- **Small Deployments**: Use SQLite for better performance without external dependencies
- **Large Deployments**: Use MariaDB for production environments with multiple users or high load

## Switching Between Storage Backends

You can switch between storage backends by setting the `STORAGE_TYPE` environment variable:

```bash
# JSON storage (default)
STORAGE_TYPE=json

# SQLite storage
STORAGE_TYPE=sqlite

# MariaDB storage
STORAGE_TYPE=mariadb
```

For more detailed information about each storage backend and how to convert between them, see:

- [JSON Storage](json-storage.md)
- [SQLite Storage](sqlite-storage.md)
- [MariaDB Storage](mariadb-storage.md)
- [Converting Between Storage Types](converting.md)