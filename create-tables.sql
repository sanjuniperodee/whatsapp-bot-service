-- Создание таблицы users
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    phone VARCHAR(255) NOT NULL,
    "firstName" VARCHAR(255) NOT NULL,
    "lastName" VARCHAR(255) NOT NULL,
    "middleName" VARCHAR(255),
    "lastSms" VARCHAR(255),
    "deviceToken" VARCHAR(255),
    "isBlocked" BOOLEAN DEFAULT FALSE,
    "blockedUntil" TIMESTAMP,
    "blockReason" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы order_requests
CREATE TABLE IF NOT EXISTS order_requests (
    id VARCHAR(255) PRIMARY KEY,
    "clientId" VARCHAR(255),
    "driverId" VARCHAR(255),
    status VARCHAR(255),
    "fromAddress" TEXT,
    "toAddress" TEXT,
    price DECIMAL(10,2),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("clientId") REFERENCES users(id),
    FOREIGN KEY ("driverId") REFERENCES users(id)
);

-- Создание таблицы category_licenses
CREATE TABLE IF NOT EXISTS category_licenses (
    id VARCHAR(255) PRIMARY KEY,
    "driverId" VARCHAR(255),
    category VARCHAR(255),
    "licenseNumber" VARCHAR(255),
    "expiryDate" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("driverId") REFERENCES users(id)
);

-- Создание индексов для производительности
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_is_blocked ON users("isBlocked");
CREATE INDEX IF NOT EXISTS idx_orders_status ON order_requests(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON order_requests("createdAt");
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON order_requests("clientId");
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON order_requests("driverId"); 