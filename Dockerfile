# Stage 1: Build frontend & install backend dependencies
FROM node:20-slim AS builder

WORKDIR /app

# Copy package manifests
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install frontend dependencies (including devDependencies like vite)
RUN cd frontend && npm install

# Install backend dependencies
RUN cd backend && npm install --legacy-peer-deps

# Copy full application source code
COPY frontend ./frontend
COPY backend ./backend

# Build React assets into frontend/public/dist
RUN cd frontend && npm run build

# Stage 2: Production runner
FROM node:20-slim

WORKDIR /app

# Copy application artifacts and node_modules from builder
COPY --from=builder /app /app

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

WORKDIR /app/backend

CMD ["node", "app.js"]

