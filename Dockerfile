# Этап 1: сборка приложения
FROM node:18-alpine3.14 AS builder
WORKDIR /app
COPY package.json ./
COPY yarn.lock ./
RUN yarn install
COPY . .
RUN yarn build

# Этап 2: запуск приложения в продакшн
FROM node:18-alpine3.14 AS runner
WORKDIR /app
COPY --from=builder /app ./
COPY --from=builder /app/src/modules/firebase/aktau-go-firebase-adminsdk-yairb-1b4b0b54cc.json /app/dist/modules/firebase/aktau-go-firebase-adminsdk-yairb-1b4b0b54cc.json
RUN apk add bash
EXPOSE 3000
ENTRYPOINT ["sh", "-c"]
CMD ["node -r ./tsconfig-paths-bootstrap.js dist/main.js"]
