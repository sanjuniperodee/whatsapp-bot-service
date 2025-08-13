# Настройка Push Уведомлений в Такси Сервисе

## Обзор изменений

Система push уведомлений была полностью переработана для правильной работы с Firebase Cloud Messaging (FCM). Теперь `deviceToken` автоматически устанавливается при авторизации и регистрации пользователей.

## Ключевые изменения

### 1. Автоматическая установка deviceToken

#### При входе в систему (`/v1/user/sing-in-by-phone-confirm-code`)
```json
{
  "phone": "77051479003",
  "smscode": "1234",
  "device_token": "firebase_device_token_here"
}
```

#### При регистрации (`/v1/user/sing-up-by-phone`)
```json
{
  "firstName": "Иван",
  "lastName": "Иванов", 
  "phone": "77051479003",
  "device_token": "firebase_device_token_here"
}
```

### 2. Ручная установка deviceToken

#### Endpoint: `POST /v1/user/device`
```json
{
  "device": "firebase_device_token_here"
}
```

**Ответ:**
```json
{
  "success": true,
  "deviceToken": "firebase_device_token_here",
  "userId": 123,
  "message": "Device token успешно обновлен"
}
```

### 3. Тестирование уведомлений

#### Endpoint: `POST /v1/user/test-notification`
Отправляет тестовое уведомление текущему пользователю.

**Ответ:**
```json
{
  "success": true,
  "message": "Тестовое уведомление отправлено",
  "deviceToken": "firebase_device_token...",
  "userId": 123
}
```

## Firebase Configuration

### Файл конфигурации
`src/modules/firebase/firebase-admin.config.ts` использует service account файл:
```
src/modules/firebase/aktau-go-firebase-adminsdk-yairb-1b4b0b54cc.json
```

### Структура уведомления
```typescript
{
  notification: {
    title: "Заголовок",
    body: "Текст уведомления"
  },
  android: {
    notification: {
      sound: 'default',
      channelId: 'default',
      priority: 'high',
      icon: 'ic_notification'
    }
  },
  apns: {
    payload: {
      aps: {
        sound: 'default',
        badge: 1,
        alert: { title, body },
        'content-available': 1
      }
    }
  },
  data: {
    title,
    body,
    timestamp: Date.now().toString()
  },
  token: deviceToken
}
```

## Логирование и диагностика

### Успешная отправка
```
📱 Firebase: Отправка уведомления на токен abcd1234...
📱 Firebase: Заголовок: "Новый заказ", Текст: "У вас новый заказ"
✅ Firebase: Уведомление успешно отправлено, ID: projects/...
```

### Ошибки Firebase
- `messaging/registration-token-not-registered` - токен устарел
- `messaging/invalid-registration-token` - неверный формат токена
- `messaging/mismatched-credential` - неверные учетные данные
- `messaging/authentication-error` - ошибка аутентификации

## Интеграция с заказами

Push уведомления автоматически отправляются при:

1. **Создании заказа** - водителям
2. **Принятии заказа** - клиенту
3. **Прибытии водителя** - клиенту
4. **Начале поездки** - клиенту
5. **Завершении поездки** - клиенту
6. **Отмене заказа** - соответствующей стороне

## Использование в коде

### Отправка уведомления
```typescript
await this.notificationService.sendNotificationByUserId(
  'Заголовок',
  'Текст уведомления',
  user.deviceToken
);
```

### Проверка наличия токена
```typescript
if (user.deviceToken) {
  // Отправляем уведомление
} else {
  console.log('DeviceToken не установлен для пользователя', user.id);
}
```

## Troubleshooting

### Уведомления не приходят

1. **Проверьте deviceToken**
   ```bash
   curl -X POST http://localhost:3000/v1/user/test-notification \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

2. **Проверьте логи сервера**
   - Ищите сообщения с префиксом `📱 Firebase:`
   - Проверьте ошибки с префиксом `❌ Firebase:`

3. **Проверьте Firebase конфигурацию**
   - Убедитесь что service account файл существует
   - Проверьте права доступа к Firebase проекту

4. **Проверьте формат токена**
   - DeviceToken должен быть валидным FCM токеном
   - Токен не должен быть пустым или содержать только пробелы

### Автоматическая установка не работает

1. **При входе** - убедитесь что передаете `device_token` в запросе
2. **При регистрации** - убедитесь что передаете `device_token` в запросе
3. **Проверьте логи** - ищите сообщения `🔑 DeviceToken автоматически установлен`

## Мобильное приложение

### Flutter интеграция
Убедитесь что мобильное приложение:

1. **Получает FCM токен**
   ```dart
   String? token = await FirebaseMessaging.instance.getToken();
   ```

2. **Отправляет токен при авторизации**
   ```dart
   final response = await api.signIn({
     'phone': phone,
     'smscode': code,
     'device_token': token,
   });
   ```

3. **Обновляет токен при изменении**
   ```dart
   FirebaseMessaging.instance.onTokenRefresh.listen((newToken) {
     api.updateDeviceToken(newToken);
   });
   ```

## Безопасность

- DeviceToken логируется только частично (первые 20 символов)
- Ошибки Firebase не прерывают основной поток выполнения
- Неудачная установка deviceToken не блокирует авторизацию

## Мониторинг

Рекомендуется настроить мониторинг для:
- Количества успешных отправок уведомлений
- Количества ошибок Firebase
- Процента пользователей с установленным deviceToken 