# Transport Types

Memory Graph MCP supports multiple transport mechanisms for communication between clients and the server. This document provides an overview of the available transport types and their use cases.

## Available Transport Types

### STDIO Transport
Standard input/output-based transport:
- Default transport mechanism
- Simple stdin/stdout communication
- Ideal for direct integration with AI assistants
- No network exposure

### HTTP Transport
HTTP-based transport for network communication:
- RESTful API over HTTP
- Accessible over the network
- Suitable for remote access and multi-user deployments
- Configurable port and host settings

## Transport Comparison

| Feature | STDIO | HTTP |
|---------|-------|------|
| **Setup Complexity** | Low | Medium |
| **Network Exposure** | None | Yes |
| **Client Location** | Same machine | Any network location |
| **Multiple Clients** | No | Yes |
| **Security** | Process isolation | Network security required |
| **Configuration** | Minimal | Requires port/host settings |
| **Integration** | Direct process | HTTP clients |
| **Docker Usage** | `-i` flag | Port mapping |

## Choosing a Transport Type

Select a transport type based on your deployment needs:

- **STDIO Transport**: For direct integration with AI assistants, local usage
- **HTTP Transport**: For network-based access, remote clients, multi-user environments

## Configuring Transport

You can configure the transport type using environment variables:

```bash
# STDIO transport (default)
TRANSPORT_TYPE=STDIO

# HTTP transport
TRANSPORT_TYPE=HTTP
PORT=3000  # Required for HTTP
HOST=127.0.0.1  # Default, listens on localhost only
```

For more detailed information about each transport type, see:

- [STDIO Transport](stdio-transport.md)
- [HTTP Transport](http-transport.md)