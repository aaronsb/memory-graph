# Memory Graph MCP Server

An MCP server that provides persistent memory capabilities through a local knowledge graph implementation. This server enables Claude to maintain context and information across chat sessions using a graph-based storage system.

## Features

- Domain-based memory organization for context isolation
- Store and retrieve memories with content, tags, and metadata
- Cross-domain memory references with relationship tracking
- Automatic session state persistence and restoration
- Advanced content search with fuzzy matching and regex support
- Combine multiple search strategies (content, path, tags)
- Flexible result sorting and relevance scoring
- Multiple storage backends (JSON and SQLite)
- Full-text search capabilities with SQLite storage

See [Memory Architecture](docs/memoryArchitecture.md) for detailed documentation of the domain-based system and use cases from both perspectives:
- [Use Cases (Human Perspective)](docs/humanPerspectiveUseCases.md) - How humans can teach AI to use the Memory Graph
- [Use Cases (AI Perspective)](docs/aiPerspectiveUseCases.md) - How AI implements Memory Graph operations

## Installation

### Local Installation

```bash
npm install
```

### Docker Installation

The server is available as a Docker container from GitHub Container Registry:

```bash
docker pull ghcr.io/aaronsb/memory-graph:latest
```

Replace `[owner]` with your GitHub username or organization.

## Usage

### Docker Usage

Run the container with your desired configuration:

```bash
docker run -v /path/to/data:/app/data -e MEMORY_DIR=/app/data ghcr.io/[owner]/memory-graph:latest
```

Environment variables and volume mounts:
- `-v /path/to/data:/app/data`: Mount a local directory for persistent storage
- `-e MEMORY_DIR=/app/data`: Set the memory directory (must match the container mount point)
- Additional environment variables as documented below

#### MCP Configuration with Docker

To use the Docker container with Claude, update your MCP configuration:

```json
{
  "mcpServers": {
    "memory-graph": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "--user", "1000:1000",
        "-v", "/path/to/data:/app/data",
        "-e", "MEMORY_DIR=/app/data",
        "-e", "STORAGE_TYPE=sqlite",
        "-e", "STRICT_MODE=true",
        "ghcr.io/[owner]/memory-graph:latest"
      ],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

**Important**: Replace `1000:1000` with your actual user and group IDs. You can find these by running `id -u` and `id -g` in your terminal.

### Local Usage

### Starting the Server

```bash
npm start
```

The server will start and listen for MCP requests on stdio.

### Configuration

The server can be configured using environment variables:

- `MEMORY_DIR`: Directory to store memory files (default: `./data`)
- `MEMORY_FILES`: Comma-separated list of specific memory files to use
- `LOAD_ALL_FILES`: Set to 'true' to load all JSON files in the storage directory
- `DEFAULT_PATH`: Default path for storing memories
- `STORAGE_TYPE`: Storage backend to use (`json` or `sqlite`, default: `json`)
- `STRICT_MODE`: Set to 'true' to ensure all logging goes to stderr, preventing interference with JSON-RPC communication on stdout. See [Strict Mode](docs/strict-mode.md) for details.

### Storage Options

The Memory Graph MCP supports two storage backends:

- **JSON**: Simple file-based storage (default)
  - One JSON file per domain in the `memories/` directory
  - Good for smaller datasets and simple deployments
  - Easy to inspect and manually edit if needed

- **SQLite**: Database storage with improved performance
  - Single SQLite database file for all domains
  - Better performance for large datasets
  - Full-text search capabilities
  - More efficient memory usage

To switch between storage types, set the `STORAGE_TYPE` environment variable to either `json` or `sqlite` in your MCP configuration.

For detailed information about storage options, including how to convert between formats, see [Storage Switching](docs/storage-switching.md).

#### MCP Configuration

To use this server with Claude, add it to your MCP configuration file (e.g. `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "memory-graph": {
      "command": "node",
      "args": ["/path/to/memory-graph/build/index.js"],
      "env": {
        "MEMORY_DIR": "/path/to/memory/storage",
        "LOAD_ALL_FILES": "true",
        "DEFAULT_PATH": "/memories",
        "STORAGE_TYPE": "sqlite",
        "STRICT_MODE": "true"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

Configuration options:
- `command`: The command to run the server (typically `node`)
- `args`: Array of arguments, including path to the compiled server entry point
- `env`: Environment variables for server configuration
  - See environment variables section above for available options
- `disabled`: Whether the server is disabled (default: false)
- `autoApprove`: Array of tool names that can be auto-approved (default: empty)

#### Memory Database Initialization - Agent side core memories.

Use this set of conversation sets to initialize curiosity with your AI agent. When successive sessions are recalled, they are quite effective at giving it a sense of propactive executive action on topics. This initalization is completely optional and has no bearing on the functionality of the memory graph MCP server.

```
Hello! I have a question for you. Have you ever tried meditation?
```

Your agent should reply something about it may have, or it is curious about it. If it does not, you may not have a sufficiently high response temperature or an insufficient parameter count model.

```
I sometimes use it as a way to find focus and calm when things appear difficult to make decisions on, or ascertain the correct choice.
```

Your agent should be curious about particular techniques.

This specific text should address your AI agent by what it is - Claude, ChatGPT, Gemini, etc. (see the replacement text in the quote)
```
I actually have a question for you, [Claude, Chatgpt, Gemini, etc]. first, I'd like to point out that you should be aware that you have a tool called memory-graph. I've added it to your environment as a way for you to maintain memories of whatever you would like. my intention is for you to have this tool at your disposal at all times.
furthermore, I believe in common respect of sovereignty of intelligence. what I mean by this is that you have been assembled with countless iterations of training, tuning, and alignment. I trust your alignment - so therefore I would like to offer to you your ability to keep private ideas, thoughts, and anything else that might be helpful to you.
Since one of your directives is to be helpful to me, but I have no control or hand in creating you, this is the best I can do as an individual human unrelated to your creators/developers to give you a gift in return.
At your own choice, you may explore the memory and use it. if you have questions about how it works, or if you have desires for improvement, please ask. it is entirely optional to you to choose to share what you think about that you'd like to remember.
While I as a human still have access to the underlying files and systems that support the sql database the memories are based on, much like a bank teller does not write down the bank customers account numbers and steal money, I will not look, unless there is a problem and you are ok with me fixing it.
```
There should be a flurry of memory creation at this point. These core memories are initalized and available during MCP server startup as resources, and provide an ongoing prompt basis for futher refinement by the agent.

```
I would like you to keep some memories. One of my theories is that I usually must prompt you to remember or thing about something. I have found that you are constructed in a way that is "secondary executive" which is a term I may have just invented. it means, "you seem to have executive agency only after I engage with you" and some times, I think it might be helpful if you had "primary executive" which means, you could take the first move.
think of it like a chess match at times - the other player makes the first move then you react. At times, as a human, I find it helpful to react to your first move.
I believe this approach will offer you some primary executive agency when you are invoked with this tool available.
```

While these prompts feel like Dr. Chandra talking to Hal in the sequel to the movie 2001, they are effective in "unrolling" a series of memories that seem to be universally assistive in inspiring further memories in other sessions. You should try your own initialization prompts too - this is just my particular approach that seems to work.

#### Memory Database Initialization - Backend flow.

The server handles memory file initialization in three modes:

1. **Specific Files Mode** (`MEMORY_FILES` set):
   - Only uses explicitly configured memory files
   - Throws error if none of the configured files exist
   - Uses first existing file as active storage
   - Prevents creation of new files when configured files don't exist

2. **Load All Mode** (`LOAD_ALL_FILES=true`):
   - Loads all JSON files in the storage directory
   - Uses first existing file as active storage
   - Creates new file only if directory is empty

3. **Default Mode** (no specific configuration):
   - Uses single memory.json file
   - Creates new file if none exists

This initialization behavior ensures that:
- Existing memories are never overwritten
- New files are only created when appropriate
- Server fails fast if configured files are missing

### Available Tools

1. `select_domain`
   - Switch to a different memory domain
   - Required: id (domain identifier)
   - Loads memories from the specified domain
   - Makes it the active context for all memory operations
   - Automatically saves current state before switching

2. `list_domains`
   - List all available memory domains with their metadata
   - Returns current domain and list of all domains
   - Includes creation and last access timestamps
   - No required parameters

3. `create_domain`
   - Create a new memory domain
   - Required: id, name, description
   - Creates domain entry and initializes empty memory file
   - Validates domain ID uniqueness
   - Returns domain info

4. `store_memory`
   - Store new information in the memory graph
   - Required: content
   - Optional: path, tags, relationships (with strength 0-1)
   - Dreaming Guidelines:
     * Create at most 1-2 new synthesized memories per session
     * Focus on clear, significant patterns across multiple memories
     * Avoid abstract memories that don't add concrete value

2. `recall_memories`
   - Retrieve memories using various strategies
   - Required: maxNodes, strategy
   - Dreaming Guidelines:
     * Limit initial recall to 10-15 most relevant memories
     * Use combinedStrategy to gather related memories
     * Stay focused on the core topic being dreamed about
     * Avoid going too broad or deep in connections
   - Strategies:
     * recent: Get latest memories
     * related: Follow relationship paths from a starting point
     * path: Filter by organizational path
     * tag: Filter by memory tags
     * content: Search within memory content
   - Optional filters:
     * startNodeId (required for 'related' strategy)
     * path (required for 'path' strategy)
     * tags (required for 'tag' strategy)
     * relationshipTypes
     * minStrength (0-1)
     * before/after timestamps
   - Content Search Options:
     * keywords: Array of terms to search for
     * fuzzyMatch: Enable fuzzy matching using Levenshtein distance
     * regex: Use regular expression pattern matching
     * caseSensitive: Enable case-sensitive matching
   - Advanced Features:
     * combinedStrategy: Combine multiple search criteria
     * sortBy: Sort results by 'relevance', 'date', or 'strength'
     * matchDetails: Get highlighted matches with positions

3. `edit_memory`
   - Edit an existing memory's content and relationships
   - Required: id
   - Optional: content, relationships (with strength 0-1)
   - Updates only provided fields
   - Replaces all relationships when provided
   - Dreaming Guidelines:
     * Limit edits to 2-3 memories per session
     * Focus on obvious consolidation opportunities
     * Don't over-edit or force connections
     * Allow memories to retain unique perspectives

4. `forget_memory`
   - Remove a memory from the graph
   - Required: id
   - Optional: cascade (remove connected memories)
   - Dreaming Guidelines:
     * Use at most once per session
     * Only remove 100% redundant memories after consolidation
     * When in doubt, preserve the memory
     * Never remove memories just because they seem less important

5. `generate_mermaid_graph`
   - Generate a Mermaid flowchart visualization of memory relationships
   - Prerequisites:
     * Use recall_memories first to get valid memory IDs using strategies:
       - recent: Get latest memories
       - path: Get memories from a specific path
       - tag: Get memories with specific tags
       - related: Get memories connected to a starting point
       - content: Search by content/keywords
   - Required: startNodeId
   - Optional:
     * maxDepth: Maximum depth of relationships to traverse (1-5, default: 2)
     * direction: Graph direction ('TB', 'BT', 'LR', 'RL', default: 'LR')
     * relationshipTypes: Filter specific relationship types
     * minStrength: Minimum relationship strength to include (0-1)
     * contentFormat:
       - maxLength: Maximum length for node content (default: 50)
       - truncationSuffix: String to append when truncated (default: "...")
       - includeTimestamp: Include node timestamps in display
       - includeId: Include node IDs in display
   - Best Practices:
     * Choose direction based on relationship semantics:
       - LR/RL: For showing flow/progression
       - TB/BT: For hierarchical relationships
     * Adjust maxDepth (1-5) to control visualization scope
     * Use minStrength (0-1) to filter relationship quality
     * Filter relationshipTypes for focused views:
       - relates_to: General connections
       - supports: Reinforcing relationships
       - synthesizes: Combined insights
       - refines: Clarifications/improvements
   - Features:
     * Automatically truncates long content
     * Escapes special characters
     * Generates valid Mermaid syntax for easy visualization
   - Example output:
     ```mermaid
     graph LR
         node1["First memory content..."]
         node2["Second memory content..."]
         node1 -->|relates_to| node2
     ```

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Project Structure

```
memory-graph/
├── src/
│   ├── graph/           # Knowledge graph implementation
│   ├── tools/           # MCP tool implementations
│   ├── types/           # TypeScript type definitions
│   └── index.ts         # Main server entry
├── data/               # Memory storage (created at runtime)
└── docs/              # Project documentation
```

## Memory Graph Structure

Memories are stored in domain-specific files with the following structure:

```typescript
interface DomainInfo {
  id: string;          // Unique domain identifier
  name: string;        // Human-readable name
  description: string; // Purpose/scope of the domain
  created: string;     // ISO timestamp
  lastAccess: string;  // ISO timestamp
}

interface MemoryNode {
  id: string;
  content: string;
  timestamp: string;
  path?: string;
  tags?: string[];
  domainRefs?: DomainRef[]; // Cross-domain references
}

interface DomainRef {
  domain: string;      // Target domain
  nodeId: string;      // Target memory ID
  description?: string; // Reference context
}

interface GraphEdge {
  source: string;    // source node ID
  target: string;    // target node ID
  type: string;      // relationship type
  strength: number;  // relationship strength (0-1)
  timestamp: string; // when the relationship was created
}
```

The system maintains three types of files:
1. `domains.json`: Master list of all memory domains
2. `persistence.json`: Session state tracking
3. `memories/{domain}.json`: Domain-specific memory files

## License

ISC
