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
RUN npm ci

# Copy built files from builder stage
COPY --from=builder /app/build ./build

# Make the built index.js executable
RUN chmod +x build/index.js

# Create a non-root user with the same UID/GID as the host user
# We use 1000:1000 as it's the default for the first user on most Linux systems
RUN groupadd -g 1000 appuser && \
    useradd -u 1000 -g appuser -s /bin/bash -m appuser

# Create data directory and set permissions
RUN mkdir -p /app/data && chown -R appuser:appuser /app/data

# Switch to non-root user
USER appuser

# Set the entrypoint
ENTRYPOINT ["node", "build/index.js"]
