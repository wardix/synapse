# Stage 1: Build Client
FROM oven/bun:latest AS client-builder
WORKDIR /app
COPY package.json bunfig.toml ./
COPY client/package.json ./client/
RUN bun install --cwd client
COPY client/ ./client/
RUN bun run --cwd client build

# Stage 2: Build & Serve Backend
FROM oven/bun:latest
WORKDIR /app

# Copy essential files
COPY package.json bunfig.toml ./
COPY shared/ ./shared/

# Install root dependencies
RUN bun install

# Copy server code
COPY server/ ./server/

# Copy built client
COPY --from=client-builder /app/client/dist ./client/dist

# Set environment
ENV NODE_ENV=production
ENV BUN_ENV=production
ENV PORT=3000

# Start script
EXPOSE 3000
CMD bun run server/db/migrate.ts && bun run server/index.ts
