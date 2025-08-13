# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY package-lock.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/tsconfig-paths-bootstrap.js ./
RUN apk add bash
EXPOSE 3000
CMD ["node", "-r", "./tsconfig-paths-bootstrap.js", "dist/main.js"]
