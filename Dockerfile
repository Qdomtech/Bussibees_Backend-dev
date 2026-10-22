# -------- Stage 1: Builder --------
FROM node:20-alpine AS builder

# Install build dependencies (required for node-canvas etc.)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev

WORKDIR /app

# Copy package files first (better caching)
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy rest of source code
COPY . .


# -------- Stage 2: Runtime --------
FROM node:20-alpine AS runner

# Install runtime dependencies
RUN apk add --no-cache \
    cairo \
    pango \
    jpeg \
    giflib

# Create secure non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy app from builder stage
COPY --from=builder /app .

# Create uploads directory
RUN mkdir -p /app/uploads && \
    chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Environment
ENV NODE_ENV=production

# Expose backend port
EXPOSE 5000

# Start backend
CMD ["node", "server.js"]
