# Админ панель такси

Современная админ панель для управления системой заказа такси, построенная на React с TypeScript и Material-UI.

## Возможности

### 🔐 Аутентификация
- Безопасный вход в систему
- JWT токены для авторизации
- Автоматическое перенаправление

### 📊 Dashboard
- Общая статистика системы
- Количество пользователей, водителей, заказов
- Информация о выручке
- Статистика по статусам заказов

### 👥 Управление клиентами
- Просмотр списка всех клиентов
- Поиск и фильтрация
- Блокировка/разблокировка пользователей
- Настройка времени блокировки
- Указание причины блокировки

### 🚗 Управление водителями
- Просмотр списка водителей
- Информация о лицензиях и категориях
- Статистика выполненных заказов
- Управление статусом водителей

### 📋 Управление заказами
- Просмотр всех заказов в системе
- Фильтрация по статусу, типу, клиенту, водителю
- Детальная информация о каждом заказе
- Отслеживание статусов заказов

## Технологии

- **React 18** с TypeScript
- **Material-UI (MUI)** для UI компонентов
- **React Router** для навигации
- **Axios** для API запросов
- **Date-fns** для работы с датами
- **MUI DataGrid** для таблиц с пагинацией

## Установка и запуск

### Предварительные требования
- Node.js 16+ 
- npm или yarn

### Установка зависимостей
```bash
npm install
```

### Настройка переменных окружения
Создайте файл `.env` в корне проекта:
```env
REACT_APP_API_URL=http://localhost:3001
GENERATE_SOURCEMAP=false
```

### Запуск в режиме разработки
```bash
npm start
```

Приложение будет доступно по адресу [http://localhost:3000](http://localhost:3000)

### Сборка для продакшена
```bash
npm run build
```

## Демо доступ

Для входа в систему используйте:
- **Логин:** admin
- **Пароль:** admin123

## API Endpoints

Админ панель работает со следующими API endpoints:

### Клиенты
- `GET /admin/clients` - получение списка клиентов
- `GET /admin/clients/:id` - получение клиента по ID
- `POST /admin/users/block` - блокировка пользователя
- `PUT /admin/users/:id/unblock` - разблокировка пользователя

### Водители  
- `GET /admin/drivers` - получение списка водителей
- `GET /admin/drivers/:id` - получение водителя по ID

### Заказы
- `GET /admin/order-requests` - получение списка заказов
- `GET /admin/order-requests/:id` - получение заказа по ID

## Clustering Deployment

### 🚀 Production Clustering Setup

This application supports clustering to utilize all CPU cores for better performance in production.

#### Quick Deployment

```bash
# Deploy with clustering (recommended for production)
./deploy-cluster.sh
```

#### Manual Deployment

```bash
# Build and run with clustering
docker-compose -f docker-compose.prod.yml up -d --build
```

#### Clustering Features

- **Multi-Core Utilization**: Automatically spawns worker processes for each CPU core
- **Process Management**: Primary process manages worker lifecycle
- **Auto-Recovery**: Automatically restarts crashed workers
- **Load Balancing**: Built-in Node.js cluster load balancing
- **Production Optimized**: Uses compiled JavaScript for better performance

#### Monitoring

```bash
# View cluster logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Check cluster status
docker-compose -f docker-compose.prod.yml ps

# Scale workers (if needed)
docker-compose -f docker-compose.prod.yml up -d --scale backend=2
```

#### Performance Benefits

- **Concurrent Requests**: Handle multiple requests simultaneously across cores
- **Better Throughput**: Improved request processing capacity
- **Fault Tolerance**: Individual worker crashes don't affect the entire application
- **Resource Efficiency**: Better CPU utilization

## Структура проекта

```
src/
├── components/          # Переиспользуемые компоненты
│   ├── Layout.tsx      # Основной layout с навигацией
│   └── Login.tsx       # Страница авторизации
├── contexts/           # React контексты
│   └── AuthContext.tsx # Контекст аутентификации
├── pages/              # Страницы приложения
│   ├── Dashboard.tsx   # Главная страница
│   ├── Clients.tsx     # Управление клиентами
│   ├── Drivers.tsx     # Управление водителями
│   └── Orders.tsx      # Управление заказами
├── services/           # API сервисы
│   └── api.ts          # Основной API сервис
├── types/              # TypeScript типы
│   └── index.ts        # Интерфейсы и енумы
└── App.tsx             # Главный компонент приложения
```

## Функциональность

### Блокировка пользователей
- Временная блокировка (1 час, 1 день, 1 неделя, 1 месяц)
- Блокировка до определенной даты
- Постоянная блокировка
- Указание причины блокировки
- Автоматическая разблокировка по истечении времени

### Фильтрация и поиск
- Поиск по номеру телефона
- Фильтрация по статусам заказов
- Фильтрация по типам заказов
- Поиск по ID клиента/водителя

### Пагинация
- Серверная пагинация для больших объемов данных
- Настраиваемый размер страницы (25, 50, 100 записей)
- Сортировка по различным полям

## Безопасность

- JWT токены для аутентификации
- Автоматический logout при истечении токена
- Защищенные маршруты
- Валидация данных на клиенте

## Поддержка

Для вопросов и предложений обращайтесь к разработчикам проекта.
