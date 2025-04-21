# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY tsconfig.json ./
COPY src/ ./src/

# Build the project
RUN npm run build

# Runtime stage
FROM node:20-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN apt-get update && apt-get install -y wget && \
    npm ci && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy built files from builder stage
COPY --from=builder /app/build ./build

# Make the built index.js executable
RUN chmod +x build/index.js

# Create data directory with permissions that allow any user to write to it
RUN mkdir -p /app/data && chmod 777 /app/data

# Environment variables
ENV TRANSPORT_TYPE=STDIO
ENV HOST=127.0.0.1

# Add healthcheck for HTTP transport
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD if [ "$TRANSPORT_TYPE" = "HTTP" ]; then \
        if [ -z "$PORT" ]; then exit 1; fi; \
        wget --no-verbose --tries=1 --spider http://${HOST:-127.0.0.1}:$PORT/mcp || exit 1; \
    else \
        exit 0; \
    fi

# Set the entrypoint
ENTRYPOINT ["node", "build/index.js"]
