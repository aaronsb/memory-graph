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

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --production

# Copy built files from builder stage
COPY --from=builder /app/build ./build

# Make the built index.js executable
RUN chmod +x build/index.js

# Set the entrypoint
ENTRYPOINT ["node", "build/index.js"]
