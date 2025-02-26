#!/bin/bash
set -e

# Run local development image with provided environment variables
docker run --rm -i \
  -v /tmp/memory-graph-data:/app/data \
  -e MEMORY_DIR=/app/data \
  -e DEFAULT_PATH=/memories \
  -e LOAD_ALL_FILES=true \
  memory-graph:local
