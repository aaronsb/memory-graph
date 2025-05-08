import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { Request, Response } from 'express';

interface StreamableHTTPServerTransportOptions {
  sessionIdGenerator: () => string;
  eventStore: Map<string, JSONRPCMessage[]>;
}

export class StreamableHTTPServerTransport implements Transport {
  private sessions: Map<string, Response>;
  private eventStore: Map<string, JSONRPCMessage[]>;
  private sessionIdGenerator: () => string;
  private currentSessionId: string | null;
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  constructor(options: StreamableHTTPServerTransportOptions) {
    this.sessionIdGenerator = options.sessionIdGenerator;
    this.eventStore = options.eventStore;
    this.sessions = new Map();
    this.currentSessionId = null;
  }

  get sessionId(): string | undefined {
    return this.currentSessionId || undefined;
  }

  async start(): Promise<void> {
    // No-op for HTTP transport
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (!this.currentSessionId) {
      throw new Error('No active session');
    }

    const res = this.sessions.get(this.currentSessionId);
    if (!res) {
      // Store message for later retrieval if session not active
      const events = this.eventStore.get(this.currentSessionId) || [];
      events.push(message);
      this.eventStore.set(this.currentSessionId, events);
      return;
    }

    // Send message immediately if session is active
    const event = `data: ${JSON.stringify(message)}\n\n`;
    res.write(event);
  }

  async handleRequest(req: Request, res: Response, body: JSONRPCMessage): Promise<void> {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-MCP-Session-ID');
    res.setHeader('Access-Control-Expose-Headers', 'X-MCP-Session-ID');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    // Generate or use existing session ID
    const sessionId = (req.headers['x-mcp-session-id'] as string) || this.sessionIdGenerator();
    this.currentSessionId = sessionId;

    // Ensure session ID is set in response headers
    res.setHeader('X-MCP-Session-ID', sessionId);

    // Handle session establishment
    if (req.method === 'GET') {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Send any stored events
      const storedEvents = this.eventStore.get(sessionId) || [];
      for (const event of storedEvents) {
        const eventData = `data: ${JSON.stringify(event)}\n\n`;
        res.write(eventData);
      }
      this.eventStore.delete(sessionId);

      // Store response object for sending future events
      this.sessions.set(sessionId, res);

      // Clean up when client disconnects
      req.on('close', () => {
        if (this.currentSessionId === sessionId) {
          this.currentSessionId = null;
        }
        this.sessions.delete(sessionId);
        if (this.onclose) {
          this.onclose();
        }
      });

      return;
    }

    // Handle incoming messages
    if (req.method === 'POST') {
      // Handle received message
      if (this.onmessage) {
        this.onmessage(body);
      }

      res.json({ ok: true });
      return;
    }

    const error = new Error(`Method ${req.method} not allowed. Supported methods: GET, POST, OPTIONS`);
    if (this.onerror) {
      this.onerror(error);
    }
    res.status(405).json({
      jsonrpc: '2.0',
      error: {
        code: -32601,
        message: error.message
      },
      id: null
    });
  }

  async close(): Promise<void> {
    // Close all active sessions
    for (const [sessionId, res] of this.sessions) {
      res.end();
      this.sessions.delete(sessionId);
    }
    this.eventStore.clear();
    this.currentSessionId = null;
    if (this.onclose) {
      this.onclose();
    }
  }
}
