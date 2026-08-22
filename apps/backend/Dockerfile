FROM oven/bun:1 AS base
WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json bun.lock* ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/ ./packages/

# Install dependencies
RUN bun install --frozen-lockfile || bun install

# Copy backend source
COPY apps/backend/ ./apps/backend/

WORKDIR /app/apps/backend

# Generate Prisma Client
RUN bunx prisma generate

EXPOSE 3001
ENV NODE_ENV=production
ENV PORT=3001

CMD ["bun", "run", "index.ts"]
