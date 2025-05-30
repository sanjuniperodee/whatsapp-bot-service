# Development mode - run TypeScript directly
FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY package-lock.json ./
RUN npm ci
COPY . .
RUN apk add bash
EXPOSE 3000
CMD ["npx", "ts-node", "-r", "tsconfig-paths/register", "src/main.ts"]
