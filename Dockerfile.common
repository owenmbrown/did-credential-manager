# Build stage for common package
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY common/package*.json ./common/
COPY package*.json ./

# Install dependencies
RUN cd common && npm ci

# Copy source
COPY common/tsconfig.json ./common/
COPY common/src ./common/src
COPY tsconfig.json ./

# Build
RUN cd common && npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY common/package*.json ./common/

# Install production dependencies only
RUN cd common && npm ci --only=production

# Copy built files
COPY --from=builder /app/common/dist ./common/dist

# This is just a builder image, not run directly
CMD ["echo", "Common package built"]

