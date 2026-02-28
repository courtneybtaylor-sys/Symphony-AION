# Symphony-AION Production Docker Image
# Phase 6: Multi-stage build for optimized container

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY next.config.ts ./
COPY jest.config.js ./

# Install dependencies
RUN npm ci

# Copy source code
COPY app ./app
COPY lib ./lib
COPY components ./components
COPY hooks ./hooks
COPY public ./public
COPY prisma ./prisma

# Build Next.js application
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma

# Install production dependencies only
RUN npm ci --production && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Environment
EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

# Start application
CMD ["npm", "start"]
