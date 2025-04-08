# Этап 1: Сборка приложения
FROM node:18 AS builder

WORKDIR /app

# Копируем файлы конфигурации и package.json с yarn.lock
COPY package.json yarn.lock tsconfig.json nest-cli.json ./

# Устанавливаем зависимости (при сборке нужны devDependencies)
RUN yarn install

# Копируем весь исходный код проекта
COPY . .

# Сборка NestJS (команда "nest build" берет настройки из nest-cli.json)
RUN yarn build

# Этап 2: Создаем минимальный образ для продакшена
FROM node:18 AS runner

WORKDIR /app

# Копируем из предыдущего этапа собранный код и зависимости
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

EXPOSE 3000

# Запускаем приложение; если для корректного резолвинга алиасов требуется tsconfig-paths
CMD ["node", "-r", "tsconfig-paths/register", "dist/main"]
