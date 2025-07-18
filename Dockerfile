# Multi-stage build for Claude Code Web UI
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS dependencies
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install Claude Code CLI globally
RUN npm install -g @anthropic-ai/claude-code

# Copy package files
COPY package.json package-lock.json ./
COPY .npmrc .npmrc* ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development
WORKDIR /app

# Install Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

# Copy package files
COPY package.json package-lock.json ./
COPY .npmrc .npmrc* ./

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY . .

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set correct permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Set environment to development
ENV NODE_ENV=development
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start development server
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS builder
WORKDIR /app

# Install Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

# Copy package files
COPY package.json package-lock.json ./
COPY .npmrc .npmrc* ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM base AS production
WORKDIR /app

# Install Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create required directories
RUN mkdir -p /app/logs /app/uploads /app/sessions
RUN chown -R nextjs:nodejs /app/logs /app/uploads /app/sessions

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start application
CMD ["node", "server.js"]

# Testing stage
FROM development AS testing
WORKDIR /app

# Copy test files
COPY tests/ ./tests/
COPY jest.config.js jest.setup.js ./
COPY jest.integration.config.js ./
COPY playwright.config.ts ./

# Install Playwright browsers
RUN npx playwright install --with-deps chromium firefox webkit

# Set environment to test
ENV NODE_ENV=test

# Run tests
CMD ["npm", "run", "test"]