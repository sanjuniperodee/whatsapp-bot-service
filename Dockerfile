# Базовый образ Node (можно выбрать нужную версию, например node:18)
FROM node:18

# Создаем рабочую директорию внутри контейнера
WORKDIR /app

# Копируем package.json и yarn.lock
COPY package.json yarn.lock ./

# Устанавливаем зависимости с помощью Yarn
RUN yarn install

# Копируем оставшиеся файлы
COPY . .

# Собираем проект (по умолчанию команда "build" в вашем package.json вызывает "nest build")
RUN yarn build

# Пробрасываем порт 3000 (по умолчанию Nest слушает 3000)
EXPOSE 3000

# Запуск в продакшн-режиме (использует скрипт "start:prod": "node dist/main")
CMD ["yarn", "start:prod"]
