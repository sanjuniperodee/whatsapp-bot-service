# Flutter Integration Guide for Taxi Service Backend

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Environment Configuration](#environment-configuration)
3. [Authentication Flow](#authentication-flow)
4. [Client Integration](#client-integration)
5. [Driver Integration](#driver-integration)
6. [WebSocket Events Reference](#websocket-events-reference)
7. [API Endpoints Reference](#api-endpoints-reference)
8. [Data Models & Types](#data-models--types)
9. [Real-time Features](#real-time-features)
10. [Error Handling Guide](#error-handling-guide)
11. [Best Practices & Recommendations](#best-practices--recommendations)
12. [Sequence Diagrams](#sequence-diagrams)
13. [Troubleshooting](#troubleshooting)
14. [FAQ](#faq)

---

## Architecture Overview

### System Architecture

The taxi service backend is built with:
- **NestJS** - Node.js framework
- **PostgreSQL** - Primary database
- **Redis** - Caching and real-time features
- **Socket.IO** - WebSocket communication
- **JWT** - Authentication
- **Firebase** - Push notifications
- **2GIS API** - Geolocation services

### Database Schema

#### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(16) UNIQUE NOT NULL,
  firstName VARCHAR(320),
  lastName VARCHAR(320),
  middleName VARCHAR(320),
  birthDate VARCHAR(16),
  lastSms VARCHAR(4),
  deviceToken VARCHAR(255),
  isBlocked BOOLEAN DEFAULT FALSE,
  blockedUntil TIMESTAMP,
  blockReason TEXT,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  deletedAt TIMESTAMP
);
```

#### Order Requests Table
```sql
CREATE TABLE order_request (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driverId UUID REFERENCES users(id),
  clientId UUID NOT NULL REFERENCES users(id),
  orderType VARCHAR(20) NOT NULL DEFAULT 'TAXI',
  orderStatus VARCHAR(20) NOT NULL DEFAULT 'CREATED',
  from VARCHAR(255) NOT NULL,
  to VARCHAR(255) NOT NULL,
  fromMapboxId VARCHAR(255),
  toMapboxId VARCHAR(255),
  lat FLOAT,
  lng FLOAT,
  price INTEGER,
  comment TEXT,
  rejectReason TEXT,
  rating INTEGER,
  startTime TIMESTAMP,
  arrivalTime TIMESTAMP,
  endedAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  deletedAt TIMESTAMP
);
```

#### Category License Table
```sql
CREATE TABLE category_license (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driverId UUID NOT NULL REFERENCES users(id),
  categoryType VARCHAR(20) NOT NULL,
  brand TEXT,
  model TEXT,
  number TEXT,
  color TEXT,
  SSN TEXT,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  deletedAt TIMESTAMP
);
```

### Redis Caching Strategy

Redis is used for:
- **SMS Code Storage**: Temporary storage with TTL
- **Driver Locations**: Geospatial data using Redis GEO
- **Online Drivers**: Set of currently online driver IDs
- **Socket Management**: Mapping user IDs to socket IDs
- **Order Locations**: Geospatial data for order matching

---

## Environment Configuration

### Base URLs
```dart
class ApiConfig {
  static const String baseUrl = 'http://localhost:3000';
  static const String wsUrl = 'ws://localhost:3000';
  static const String apiVersion = 'v1';
}
```

### WebSocket Configuration
```dart
class WebSocketConfig {
  static const String path = '/socket.io/';
  static const List<String> transports = ['websocket', 'polling'];
  static const Duration pingTimeout = Duration(seconds: 60);
  static const Duration pingInterval = Duration(seconds: 25);
  static const Duration connectTimeout = Duration(seconds: 20);
}
```

### Required Headers
```dart
Map<String, String> getHeaders(String? token) {
  return {
    'Content-Type': 'application/json',
    if (token != null) 'Authorization': 'Bearer $token',
  };
}
```

---

## Authentication Flow

### 1. Phone Number Verification

#### Send SMS Code
```dart
// Request
POST /v1/user/sign-in-by-phone
{
  "phone": "77051479003"
}

// Response
{
  "smscode": "1031"
}
```

#### Confirm SMS Code
```dart
// Request
POST /v1/user/sign-in-by-phone-confirm-code
{
  "phone": "77051479003",
  "smscode": "1031",
  "device_token": "your-fcm-token"
}

// Response (New User - Sign Up Required)
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": null,
  "refreshToken": null
}

// Response (Existing User)
{
  "user": {
    "_id": {"props": {"value": "4f90fd78-e209-4b3d-94b7-4d03908d8c21"}},
    "props": {
      "phone": {"props": {"value": "77051479003"}},
      "firstName": "Test",
      "lastName": "User",
      "deviceToken": "your-fcm-token",
      "isBlocked": false
    }
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### User Registration (If New User)
```dart
// Request
POST /v1/user/sign-up-by-phone
Headers: Authorization: Bearer <signup-token>
{
  "firstName": "Test",
  "lastName": "User",
  "phone": "77051479003",
  "device_token": "your-fcm-token"
}

// Response
{
  "user": { /* user object */ },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. JWT Token Structure

```dart
class JwtPayload {
  final String id;
  final String? phone;
  final String tokenType; // 'USER', 'REFRESH', 'SIGN_UP'
  final DateTime expiration;
  final DateTime iat;
}
```

### 3. Phone Number Validation

Phone numbers must be valid Kazakhstan numbers (KZ format). The backend uses `libphonenumber-js` for validation.

---

## Client Integration

### 1. User Profile Management

#### Get Current User
```dart
// Request
GET /v1/user/GetMe
Headers: Authorization: Bearer <user-token>

// Response
{
  "_id": {"props": {"value": "4f90fd78-e209-4b3d-94b7-4d03908d8c21"}},
  "props": {
    "phone": {"props": {"value": "77051479003"}},
    "firstName": "Test",
    "lastName": "User",
    "deviceToken": "your-fcm-token",
    "isBlocked": false
  },
  "rating": 0,
  "ratedOrders": [],
  "earnings": {
    "today": 0,
    "thisWeek": 0,
    "thisMonth": 0
  },
  "orders": {
    "today": 0,
    "thisWeek": 0,
    "thisMonth": 0
  }
}
```

#### Update Profile
```dart
// Request
PUT /v1/user/profile
Headers: Authorization: Bearer <user-token>
{
  "firstName": "Updated Name",
  "lastName": "Updated Last",
  "middleName": "Middle"
}

// Response
{
  "success": true,
  "user": { /* updated user object */ },
  "message": "Профиль успешно обновлен"
}
```

### 2. Order Management

#### Create Order
```dart
// Request
POST /v1/order-requests/create-order
Headers: Authorization: Bearer <user-token>
{
  "from": "Актау, ул. Театральная 1",
  "to": "Актау, мкр. 5",
  "lat": 43.6532,
  "lng": 51.1694,
  "price": 1500,
  "orderType": "TAXI",
  "comment": "Тестовый заказ",
  "fromMapboxId": "mapbox-id-1",
  "toMapboxId": "mapbox-id-2"
}

// Response
{
  "id": {"props": {"value": "f56a47f7-5c54-40d9-8345-ea11b4462974"}},
  "createdAt": "2025-10-14T10:28:52.059Z",
  "updatedAt": "2025-10-14T10:28:52.059Z",
  "clientId": {"props": {"value": "4f90fd78-e209-4b3d-94b7-4d03908d8c21"}},
  "orderType": "TAXI",
  "orderStatus": "CREATED",
  "from": "Актау, ул. Театральная 1",
  "to": "Актау, мкр. 5",
  "fromMapboxId": "mapbox-id-1",
  "toMapboxId": "mapbox-id-2",
  "lat": 43.6532,
  "lng": 51.1694,
  "price": {"props": {"value": 1500}},
  "comment": "Тестовый заказ"
}
```

#### Get Active Order
```dart
// Request
GET /v1/order-requests/client-active-order
Headers: Authorization: Bearer <user-token>

// Response
{
  "order": {
    "id": "f56a47f7-5c54-40d9-8345-ea11b4462974",
    "clientId": "4f90fd78-e209-4b3d-94b7-4d03908d8c21",
    "orderType": "TAXI",
    "orderStatus": "CREATED",
    "from": "Актау, ул. Театральная 1",
    "to": "Актау, мкр. 5",
    "lat": 43.6532,
    "lng": 51.1694,
    "price": {"props": {"value": 1500}},
    "comment": "Тестовый заказ"
  },
  "driver": null, // Will be populated when driver accepts
  "car": null     // Will be populated when driver accepts
}
```

#### Get Order Status
```dart
// Request
GET /v1/order-requests/order-status
Headers: Authorization: Bearer <user-token>

// Response
{
  "orderId": "f56a47f7-5c54-40d9-8345-ea11b4462974",
  "orderStatus": "CREATED",
  "driver": null,
  "car": null,
  "driverLocation": null,
  "estimatedArrival": null
}
```

#### Cancel Order
```dart
// Request
POST /v1/order-requests/cancel/{orderId}
Headers: Authorization: Bearer <user-token>

// Response
{
  "success": true,
  "message": "Order cancelled successfully"
}
```

### 3. Geolocation Services

#### Get Address by Coordinates
```dart
// Request
GET /v1/order-requests/address?lat=43.6532&lon=51.1694

// Response
"Актау, 24-й микрорайон, 5"
```

#### Search Places by Name
```dart
// Request
GET /v1/order-requests/find-by-name?lat=43.6532&lon=51.1694&search=аэропорт

// Response
[
  {
    "name": "Актау, Аэропорт",
    "lat": "43.8601",
    "lon": "51.0920"
  }
]
```

### 4. Order History

#### Get Client Order History
```dart
// Request
GET /v1/order-requests/client-history/TAXI
Headers: Authorization: Bearer <user-token>

// Response
[
  {
    "whatsappUser": null,
    "driver": {
      "_id": {"props": {"value": "driver-id"}},
      "props": {
        "phone": {"props": {"value": "77051479004"}},
        "firstName": "Driver",
        "lastName": "Name"
      }
    },
    "orderRequest": {
      "id": "order-id",
      "driverId": "driver-id",
      "clientId": "client-id",
      "orderType": "TAXI",
      "orderStatus": "COMPLETED",
      "from": "Address 1",
      "to": "Address 2",
      "price": 1500,
      "rating": 5,
      "createdAt": "2025-10-14T10:28:52.059Z"
    }
  }
]
```

### 5. Review System

#### Submit Review
```dart
// Request
POST /v1/order-requests/make-review
{
  "orderRequestId": "f56a47f7-5c54-40d9-8345-ea11b4462974",
  "comment": "Отличная поездка!",
  "rating": 5
}

// Response
{
  "success": true,
  "message": "Review submitted successfully"
}
```

### 6. Saved Places

#### Get Saved Places
```dart
// Request
GET /v1/order-requests/client/saved-places
Headers: Authorization: Bearer <user-token>

// Response
[
  {
    "id": "home",
    "icon": "home",
    "title": "Дом",
    "address": "Актау, мкр. 5, дом 20",
    "lat": 43.6532,
    "lng": 51.1694
  }
]
```

#### Get Recent Addresses
```dart
// Request
GET /v1/order-requests/client/recent-addresses
Headers: Authorization: Bearer <user-token>

// Response
[
  {
    "address": "Актау, мкр. 5",
    "lat": 43.6532,
    "lng": 51.1694
  }
]
```

---

## Driver Integration

### 1. Category Registration

#### Register for Category
```dart
// Request
POST /v1/order-requests/category/register
Headers: Authorization: Bearer <driver-token>
{
  "governmentNumber": "123ABC01",
  "type": "TAXI",
  "model": "Camry",
  "brand": "Toyota",
  "color": "Белый",
  "SSN": "123456789012"
}

// Response
{
  "success": true,
  "message": "Category registered successfully"
}
```

#### Get Category Info
```dart
// Request
GET /v1/order-requests/category/info
Headers: Authorization: Bearer <driver-token>

// Response
[
  {
    "id": "category-id",
    "props": {
      "SSN": "123456789012",
      "brand": "Toyota",
      "model": "Camry",
      "color": "Белый",
      "number": "123ABC01"
    },
    "categoryType": "TAXI"
  }
]
```

#### Edit Category
```dart
// Request
PUT /v1/order-requests/category/{categoryId}
Headers: Authorization: Bearer <driver-token>
{
  "governmentNumber": "123ABC02",
  "type": "TAXI",
  "model": "Prius",
  "brand": "Toyota",
  "color": "Черный",
  "SSN": "123456789012"
}

// Response
{
  "success": true,
  "message": "Category updated successfully"
}
```

### 2. Order Management

#### Get Available Orders
```dart
// Request
GET /v1/order-requests/active/TAXI
Headers: Authorization: Bearer <driver-token>

// Response
[
  {
    "user": {
      "_id": {"props": {"value": "client-id"}},
      "props": {
        "phone": {"props": {"value": "77051479003"}},
        "firstName": "Client",
        "lastName": "Name"
      }
    },
    "orderRequest": {
      "id": "order-id",
      "clientId": "client-id",
      "orderType": "TAXI",
      "orderStatus": "CREATED",
      "from": "Address 1",
      "to": "Address 2",
      "lat": 43.6532,
      "lng": 51.1694,
      "price": 1500,
      "createdAt": "2025-10-14T10:28:52.059Z"
    }
  }
]
```

#### Accept Order
```dart
// Request
POST /v1/order-requests/accept
Headers: Authorization: Bearer <driver-token>
{
  "orderId": "f56a47f7-5c54-40d9-8345-ea11b4462974"
}

// Response
{
  "success": true,
  "message": "Order accepted successfully"
}
```

#### Driver Arrived
```dart
// Request
POST /v1/order-requests/driver-arrived
Headers: Authorization: Bearer <driver-token>
{
  "orderId": "f56a47f7-5c54-40d9-8345-ea11b4462974"
}

// Response
{
  "success": true,
  "message": "Driver arrived status updated successfully"
}
```

#### Start Ride
```dart
// Request
POST /v1/order-requests/start
Headers: Authorization: Bearer <driver-token>
{
  "orderId": "f56a47f7-5c54-40d9-8345-ea11b4462974"
}

// Response
{
  "success": true,
  "message": "Order started successfully"
}
```

#### Complete Ride
```dart
// Request
POST /v1/order-requests/end
Headers: Authorization: Bearer <driver-token>
{
  "orderId": "f56a47f7-5c54-40d9-8345-ea11b4462974"
}

// Response
{
  "success": true,
  "message": "Ride ended successfully"
}
```

#### Get Driver Active Order
```dart
// Request
GET /v1/order-requests/my-active-order
Headers: Authorization: Bearer <driver-token>

// Response
{
  "whatsappUser": {
    "_id": {"props": {"value": "client-id"}},
    "props": {
      "phone": {"props": {"value": "77051479003"}},
      "firstName": "Client",
      "lastName": "Name"
    }
  },
  "driver": null,
  "orderRequest": {
    "id": "order-id",
    "clientId": "client-id",
    "orderType": "TAXI",
    "orderStatus": "STARTED",
    "from": "Address 1",
    "to": "Address 2",
    "price": 1500
  }
}
```

### 3. Driver Statistics

#### Get Driver Stats
```dart
// Request
GET /v1/order-requests/driver/stats
Headers: Authorization: Bearer <driver-token>

// Response
{
  "todayEarnings": 5000,
  "todayTrips": 3,
  "rating": 4.8,
  "acceptance": 95,
  "totalTrips": 150
}
```

### 4. Driver Order History

#### Get Driver Order History
```dart
// Request
GET /v1/order-requests/history/TAXI
Headers: Authorization: Bearer <driver-token>

// Response
[
  {
    "whatsappUser": {
      "_id": {"props": {"value": "client-id"}},
      "props": {
        "phone": {"props": {"value": "77051479003"}},
        "firstName": "Client",
        "lastName": "Name"
      }
    },
    "driver": null,
    "orderRequest": {
      "id": "order-id",
      "clientId": "client-id",
      "orderType": "TAXI",
      "orderStatus": "COMPLETED",
      "from": "Address 1",
      "to": "Address 2",
      "price": 1500,
      "rating": 5,
      "createdAt": "2025-10-14T10:28:52.059Z"
    }
  }
]
```

### 5. Location Updates

#### Update Driver Location
```dart
// Request
POST /v1/order-requests/location/update
Headers: Authorization: Bearer <driver-token>
{
  "lng": 51.1694,
  "lat": 43.6532,
  "orderId": "f56a47f7-5c54-40d9-8345-ea11b4462974"
}

// Response
{
  "success": true,
  "message": "Location updated successfully"
}
```

---

## WebSocket Events Reference

### Connection Setup

```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

class WebSocketService {
  late IO.Socket socket;
  
  void connectAsClient(String userId, String sessionId) {
    socket = IO.io('http://localhost:3000', IO.OptionBuilder()
      .setPath('/socket.io/')
      .setQuery({
        'userType': 'client',
        'userId': userId,
        'sessionId': sessionId,
      })
      .setTransports(['websocket', 'polling'])
      .enableAutoConnect()
      .build());
  }
  
  void connectAsDriver(String driverId, String sessionId, double lat, double lng) {
    socket = IO.io('http://localhost:3000', IO.OptionBuilder()
      .setPath('/socket.io/')
      .setQuery({
        'userType': 'driver',
        'driverId': driverId,
        'sessionId': sessionId,
        'lat': lat.toString(),
        'lng': lng.toString(),
      })
      .setTransports(['websocket', 'polling'])
      .enableAutoConnect()
      .build());
  }
}
```

### Client Events (Listen For)

#### Order Sync
```dart
socket.on('orderSync', (data) {
  // Received when client connects and has an active order
  print('Order sync: $data');
  /*
  {
    "orderId": "order-id",
    "orderStatus": "STARTED",
    "driverId": "driver-id",
    "order": { /* order object */ },
    "timestamp": 1697364000000,
    "message": "Активный заказ синхронизирован"
  }
  */
});
```

#### Order Accepted
```dart
socket.on('orderAccepted', (data) {
  // Received when driver accepts the order
  print('Order accepted: $data');
  /*
  {
    "orderId": "order-id",
    "driverId": "driver-id",
    "driver": { /* driver object */ },
    "order": { /* order object */ },
    "timestamp": 1697364000000
  }
  */
});
```

#### Driver Arrived
```dart
socket.on('driverArrived', (data) {
  // Received when driver arrives at pickup location
  print('Driver arrived: $data');
  /*
  {
    "orderId": "order-id",
    "driverId": "driver-id",
    "driver": { /* driver object */ },
    "order": { /* order object */ },
    "message": "Водитель прибыл и ждет вас",
    "timestamp": 1697364000000
  }
  */
});
```

#### Ride Started
```dart
socket.on('rideStarted', (data) {
  // Received when ride begins
  print('Ride started: $data');
  /*
  {
    "orderId": "order-id",
    "driverId": "driver-id",
    "driver": { /* driver object */ },
    "order": { /* order object */ },
    "message": "Поездка началась",
    "timestamp": 1697364000000
  }
  */
});
```

#### Ride Ended
```dart
socket.on('rideEnded', (data) => {
  // Received when ride completes
  print('Ride ended: $data');
  /*
  {
    "orderId": "order-id",
    "driverId": "driver-id",
    "driver": { /* driver object */ },
    "order": { /* order object */ },
    "message": "Поездка завершена",
    "timestamp": 1697364000000
  }
  */
});
```

#### Driver Location
```dart
socket.on('driverLocation', (data) {
  // Received when driver location updates
  print('Driver location: $data');
  /*
  {
    "lat": 43.6532,
    "lng": 51.1694,
    "driverId": "driver-id",
    "orderId": "order-id",
    "orderStatus": "ONGOING",
    "timestamp": 1697364000000
  }
  */
});
```

### Driver Events (Listen For)

#### New Order
```dart
socket.on('newOrder', (data) {
  // Received when new order is available
  print('New order: $data');
  /*
  {
    "id": "order-id",
    "from": "Address 1",
    "to": "Address 2",
    "price": 1500,
    "orderType": "TAXI",
    "clientId": "client-id",
    "lat": 43.6532,
    "lng": 51.1694,
    "timestamp": 1697364000000
  }
  */
});
```

#### Order Taken
```dart
socket.on('orderTaken', (data) {
  // Received when another driver takes an order
  print('Order taken: $data');
  /*
  {
    "orderId": "order-id",
    "takenBy": "other-driver-id",
    "timestamp": 1697364000000
  }
  */
});
```

#### Order Cancelled by Client
```dart
socket.on('orderCancelledByClient', (data) {
  // Received when client cancels order
  print('Order cancelled by client: $data');
  /*
  {
    "orderId": "order-id",
    "clientId": "client-id",
    "reason": "cancelled_by_client",
    "message": "Клиент отменил заказ",
    "timestamp": 1697364000000
  }
  */
});
```

### Events to Emit

#### Driver Online/Offline
```dart
// Go online
socket.emit('driverOnline', {});

// Go offline
socket.emit('driverOffline', {});
```

#### Driver Location Update
```dart
socket.emit('driverLocationUpdate', {
  'lat': 43.6532,
  'lng': 51.1694,
  'timestamp': DateTime.now().millisecondsSinceEpoch,
});
```

### Connection Management

```dart
class WebSocketService {
  void setupEventListeners() {
    socket.onConnect((_) {
      print('Connected to server');
    });
    
    socket.onDisconnect((_) {
      print('Disconnected from server');
      // Implement reconnection logic
    });
    
    socket.onConnectError((error) {
      print('Connection error: $error');
      // Handle connection errors
    });
  }
  
  void disconnect() {
    socket.disconnect();
  }
}
```

---

## API Endpoints Reference

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/v1/user/sign-in-by-phone` | Send SMS code | No |
| POST | `/v1/user/sign-in-by-phone-confirm-code` | Confirm SMS code | No |
| POST | `/v1/user/sign-up-by-phone` | Create new user | Sign-up token |
| GET | `/v1/user/GetMe` | Get current user | User token |
| PUT | `/v1/user/profile` | Update profile | User token |
| POST | `/v1/user/device` | Set device token | User token |
| POST | `/v1/user/test-notification` | Test push notification | User token |

### Order Management Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/v1/order-requests/create-order` | Create new order | User token |
| GET | `/v1/order-requests/client-active-order` | Get client active order | User token |
| GET | `/v1/order-requests/order-status` | Get order status | User token |
| POST | `/v1/order-requests/cancel/{orderId}` | Cancel order | User token |
| POST | `/v1/order-requests/make-review` | Submit review | No |
| GET | `/v1/order-requests/client-history/{type}` | Get client history | User token |

### Driver Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/v1/order-requests/category/register` | Register category | Driver token |
| GET | `/v1/order-requests/category/info` | Get category info | Driver token |
| PUT | `/v1/order-requests/category/{id}` | Edit category | Driver token |
| GET | `/v1/order-requests/active/{type}` | Get available orders | Driver token |
| POST | `/v1/order-requests/accept` | Accept order | Driver token |
| POST | `/v1/order-requests/driver-arrived` | Driver arrived | Driver token |
| POST | `/v1/order-requests/start` | Start ride | Driver token |
| POST | `/v1/order-requests/end` | End ride | Driver token |
| GET | `/v1/order-requests/my-active-order` | Get driver active order | Driver token |
| GET | `/v1/order-requests/history/{type}` | Get driver history | Driver token |
| GET | `/v1/order-requests/driver/stats` | Get driver stats | Driver token |
| POST | `/v1/order-requests/location/update` | Update location | Driver token |

### Geolocation Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/v1/order-requests/address` | Get address by coordinates | No |
| GET | `/v1/order-requests/find-by-name` | Search places by name | No |

---

## Data Models & Types

### Order Types
```dart
enum OrderType {
  TAXI,
  DELIVERY,
  INTERCITY_TAXI,
  CARGO,
}
```

### Order Status
```dart
enum OrderStatus {
  CREATED,
  STARTED,
  WAITING,
  ONGOING,
  COMPLETED,
  REJECTED,
  REJECTED_BY_CLIENT,
  REJECTED_BY_DRIVER,
}
```

### User Model
```dart
class User {
  final String id;
  final String phone;
  final String? firstName;
  final String? lastName;
  final String? middleName;
  final String? deviceToken;
  final bool isBlocked;
  final DateTime? blockedUntil;
  final String? blockReason;
  final DateTime createdAt;
  final DateTime updatedAt;
  
  // For drivers
  final double rating;
  final Map<String, int> earnings;
  final Map<String, int> orders;
  final List<dynamic> ratedOrders;
}
```

### Order Model
```dart
class OrderRequest {
  final String id;
  final String? driverId;
  final String clientId;
  final OrderType orderType;
  final OrderStatus orderStatus;
  final String from;
  final String to;
  final String? fromMapboxId;
  final String? toMapboxId;
  final double? lat;
  final double? lng;
  final int price;
  final String? comment;
  final String? rejectReason;
  final int? rating;
  final DateTime? startTime;
  final DateTime? arrivalTime;
  final DateTime? endedAt;
  final DateTime createdAt;
  final DateTime updatedAt;
}
```

### Category License Model
```dart
class CategoryLicense {
  final String id;
  final String driverId;
  final OrderType categoryType;
  final String? brand;
  final String? model;
  final String? number;
  final String? color;
  final String? SSN;
  final DateTime createdAt;
  final DateTime updatedAt;
}
```

---

## Real-time Features

### Order Status Synchronization

The system automatically synchronizes order status across client and driver apps using WebSocket events:

1. **CREATED** → Driver receives `newOrder` event
2. **STARTED** → Client receives `orderAccepted` event
3. **WAITING** → Client receives `driverArrived` event
4. **ONGOING** → Client receives `rideStarted` event
5. **COMPLETED** → Client receives `rideEnded` event

### Driver Location Tracking

- **Update Frequency**: Recommended every 3-5 seconds during active rides
- **Redis Storage**: Locations stored using Redis GEO for efficient spatial queries
- **Real-time Updates**: Client receives `driverLocation` events during active rides
- **Battery Optimization**: Reduce frequency when no active orders

### Push Notification Integration

The system integrates with Firebase for push notifications:

- **New Orders**: Drivers receive notifications for new orders
- **Order Updates**: Clients receive notifications for order status changes
- **Device Token**: Automatically set during authentication or via `/device` endpoint

### Offline/Online Transitions

- **Driver Online**: Automatically set when WebSocket connects with `userType: driver`
- **Driver Offline**: Automatically set when WebSocket disconnects
- **Connection Recovery**: Implement reconnection logic with exponential backoff

---

## Error Handling Guide

### Authentication Errors

#### Invalid Phone Number
```dart
// Error Response
{
  "statusCode": 400,
  "message": ["77051479003 must be valid phone number"],
  "error": "Bad Request"
}
```

#### Invalid SMS Code
```dart
// Error Response
{
  "statusCode": 400,
  "message": "Invalid code 1234"
}
```

#### User Blocked
```dart
// Error Response
{
  "statusCode": 403,
  "message": "Нарушение правил использования сервиса",
  "blockedUntil": "2025-11-14T10:28:52.059Z"
}
```

### Order Validation Errors

#### Active Order Exists
```dart
// Error Response
{
  "statusCode": 409,
  "message": "You already have an active order!"
}
```

#### Category Not Registered
```dart
// Error Response
{
  "statusCode": 400,
  "message": "You can not accept orders before registering into category"
}
```

#### Order Not Found
```dart
// Error Response
{
  "statusCode": 404,
  "message": "Order not found"
}
```

### Network Errors

#### Connection Timeout
```dart
// Handle in Flutter
try {
  final response = await http.get(url);
} on SocketException catch (e) {
  // Handle network error
  print('Network error: $e');
} on TimeoutException catch (e) {
  // Handle timeout
  print('Timeout error: $e');
}
```

#### WebSocket Disconnection
```dart
socket.onDisconnect((_) {
  // Implement reconnection logic
  Timer(Duration(seconds: 5), () {
    socket.connect();
  });
});
```

### Retry Strategies

```dart
class ApiService {
  Future<Response> makeRequest(Future<Response> Function() request) async {
    int retries = 3;
    Duration delay = Duration(seconds: 1);
    
    for (int i = 0; i < retries; i++) {
      try {
        return await request();
      } catch (e) {
        if (i == retries - 1) rethrow;
        await Future.delayed(delay);
        delay *= 2; // Exponential backoff
      }
    }
    throw Exception('Max retries exceeded');
  }
}
```

---

## Best Practices & Recommendations

### WebSocket Connection Lifecycle

1. **Connect on App Launch**: Establish WebSocket connection when app starts
2. **Reconnect on Background**: Reconnect when app returns from background
3. **Handle Network Changes**: Listen for network connectivity changes
4. **Clean Disconnect**: Properly disconnect on app termination

```dart
class AppLifecycleService extends WidgetsBindingObserver {
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.resumed:
        // Reconnect WebSocket
        webSocketService.reconnect();
        break;
      case AppLifecycleState.paused:
        // Keep connection alive
        break;
      case AppLifecycleState.detached:
        // Disconnect WebSocket
        webSocketService.disconnect();
        break;
    }
  }
}
```

### Location Update Optimization

```dart
class LocationService {
  Timer? _locationTimer;
  bool _isActiveOrder = false;
  
  void startLocationUpdates() {
    _locationTimer = Timer.periodic(Duration(seconds: 5), (timer) {
      if (_isActiveOrder) {
        _sendLocationUpdate();
      }
    });
  }
  
  void setActiveOrder(bool hasActiveOrder) {
    _isActiveOrder = hasActiveOrder;
    if (_isActiveOrder) {
      startLocationUpdates();
    } else {
      _locationTimer?.cancel();
    }
  }
}
```

### State Management

Use a state management solution like Provider, Bloc, or Riverpod:

```dart
class OrderBloc extends Bloc<OrderEvent, OrderState> {
  final ApiService _apiService;
  final WebSocketService _webSocketService;
  
  OrderBloc(this._apiService, this._webSocketService) : super(OrderInitial()) {
    on<CreateOrder>(_onCreateOrder);
    on<OrderAccepted>(_onOrderAccepted);
    on<DriverArrived>(_onDriverArrived);
  }
  
  void _onCreateOrder(CreateOrder event, Emitter<OrderState> emit) async {
    emit(OrderLoading());
    try {
      final order = await _apiService.createOrder(event.request);
      emit(OrderCreated(order));
    } catch (e) {
      emit(OrderError(e.toString()));
    }
  }
}
```

### Caching Strategies

```dart
class CacheService {
  static const String _userKey = 'current_user';
  static const String _tokenKey = 'auth_token';
  
  Future<void> cacheUser(User user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userKey, jsonEncode(user.toJson()));
  }
  
  Future<User?> getCachedUser() async {
    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString(_userKey);
    if (userJson != null) {
      return User.fromJson(jsonDecode(userJson));
    }
    return null;
  }
}
```

### Background Task Handling

```dart
class BackgroundTaskService {
  static void initialize() {
    Workmanager().initialize(callbackDispatcher);
    Workmanager().registerPeriodicTask(
      "location-update",
      "locationUpdate",
      frequency: Duration(minutes: 1),
      constraints: Constraints(
        networkType: NetworkType.connected,
      ),
    );
  }
  
  static void callbackDispatcher() {
    Workmanager().executeTask((task, inputData) {
      switch (task) {
        case "locationUpdate":
          _updateDriverLocation();
          break;
      }
      return Future.value(true);
    });
  }
}
```

### Push Notification Setup

```dart
class NotificationService {
  static Future<void> initialize() async {
    await Firebase.initializeApp();
    
    // Request permission
    NotificationSettings settings = await FirebaseMessaging.instance.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    
    // Get FCM token
    String? token = await FirebaseMessaging.instance.getToken();
    if (token != null) {
      await _sendTokenToServer(token);
    }
    
    // Listen for token refresh
    FirebaseMessaging.instance.onTokenRefresh.listen(_sendTokenToServer);
  }
  
  static Future<void> _sendTokenToServer(String token) async {
    await ApiService.setDeviceToken(token);
  }
}
```

---

## Sequence Diagrams

### Client Journey: Complete Order Flow

```
Client App          Backend API        WebSocket        Driver App
    |                    |                 |                |
    |-- POST /sign-in-by-phone -->         |                |
    |<-- SMS Code --------|                |                |
    |                    |                 |                |
    |-- POST /confirm-code -->             |                |
    |<-- JWT Token ------|                 |                |
    |                    |                 |                |
    |-- POST /create-order -->             |                |
    |<-- Order Created --|                 |                |
    |                    |                 |                |
    |-- WebSocket Connect -->              |                |
    |<-- orderSync ------|                 |                |
    |                    |                 |                |
    |                    |-- newOrder -->  |                |
    |                    |                 |-- WebSocket -->|
    |                    |                 |<-- Accept -----|
    |                    |                 |                |
    |<-- orderAccepted --|                 |                |
    |                    |                 |                |
    |<-- driverArrived --|                 |                |
    |                    |                 |                |
    |<-- rideStarted ----|                 |                |
    |                    |                 |                |
    |<-- driverLocation -|                 |                |
    |                    |                 |                |
    |<-- rideEnded ------|                 |                |
    |                    |                 |                |
    |-- POST /make-review -->              |                |
    |<-- Review Saved ---|                 |                |
```

### Driver Journey: Order Acceptance Flow

```
Driver App          Backend API        WebSocket        Client App
    |                    |                 |                |
    |-- POST /sign-in-by-phone -->         |                |
    |<-- SMS Code --------|                 |                |
    |                    |                 |                |
    |-- POST /confirm-code -->             |                |
    |<-- JWT Token ------|                 |                |
    |                    |                 |                |
    |-- POST /category/register -->        |                |
    |<-- Category Saved -|                 |                |
    |                    |                 |                |
    |-- WebSocket Connect -->              |                |
    |                    |                 |                |
    |<-- newOrder -------|                 |                |
    |                    |                 |                |
    |-- POST /accept --> |                 |                |
    |<-- Order Accepted -|                 |                |
    |                    |                 |                |
    |                    |-- orderAccepted -->              |
    |                    |                 |                |
    |-- POST /driver-arrived -->           |                |
    |<-- Status Updated -|                 |                |
    |                    |-- driverArrived -->              |
    |                    |                 |                |
    |-- POST /start -->  |                 |                |
    |<-- Ride Started --|                 |                |
    |                    |-- rideStarted -->                |
    |                    |                 |                |
    |-- POST /location/update -->          |                |
    |                    |-- driverLocation -->             |
    |                    |                 |                |
    |-- POST /end -->    |                 |                |
    |<-- Ride Ended ----|                 |                |
    |                    |-- rideEnded --> |                |
```

### Order State Machine

```
CREATED
    |
    | (Driver Accepts)
    v
STARTED
    |
    | (Driver Arrives)
    v
WAITING
    |
    | (Ride Starts)
    v
ONGOING
    |
    | (Ride Ends)
    v
COMPLETED

Alternative paths:
CREATED -> REJECTED (by system)
STARTED -> REJECTED_BY_CLIENT
STARTED -> REJECTED_BY_DRIVER
WAITING -> REJECTED_BY_CLIENT
ONGOING -> REJECTED_BY_CLIENT
```

### WebSocket Lifecycle

```
App Launch
    |
    | (Initialize)
    v
Connect to WebSocket
    |
    | (Connection Established)
    v
Listen for Events
    |
    | (Network Issues)
    v
Connection Lost
    |
    | (Retry Logic)
    v
Reconnect
    |
    | (App Background)
    v
Keep Connection Alive
    |
    | (App Foreground)
    v
Resume Normal Operation
```

### Geolocation Flow

```
Client Location
    |
    | (GPS Update)
    v
Send to Backend
    |
    | (Redis GEO)
    v
Find Nearby Drivers
    |
    | (Spatial Query)
    v
Match with Category
    |
    | (Filter Results)
    v
Send to Drivers
    |
    | (WebSocket)
    v
Driver Receives Order
    |
    | (Accept)
    v
Real-time Location Updates
    |
    | (Every 3-5 seconds)
    v
Client Sees Driver Movement
```

---

## Troubleshooting

### Common Issues

#### 1. WebSocket Connection Fails
**Symptoms**: Connection errors, timeout issues
**Solutions**:
- Check if Redis is running
- Verify network connectivity
- Ensure correct WebSocket URL and path
- Check firewall settings

#### 2. SMS Code Not Received
**Symptoms**: Code not arriving, validation errors
**Solutions**:
- Verify phone number format (KZ format required)
- Check if phone number is blocked
- Ensure WhatsApp service is running
- Try test phone number: 77051479003

#### 3. Order Not Appearing for Drivers
**Symptoms**: No orders in driver app
**Solutions**:
- Check if driver is registered for correct category
- Verify driver location is being updated
- Ensure driver is online (WebSocket connected)
- Check Redis geolocation data

#### 4. Location Updates Not Working
**Symptoms**: Driver location not updating
**Solutions**:
- Verify GPS permissions
- Check location accuracy settings
- Ensure location updates are sent every 3-5 seconds
- Verify Redis connection

#### 5. Push Notifications Not Received
**Symptoms**: No push notifications
**Solutions**:
- Check Firebase configuration
- Verify device token is set
- Ensure notification permissions are granted
- Test with `/test-notification` endpoint

### Debug Commands

#### Check Server Status
```bash
curl http://localhost:3000/api
```

#### Test Authentication
```bash
curl -X POST http://localhost:3000/v1/user/sign-in-by-phone \
  -H "Content-Type: application/json" \
  -d '{"phone": "77051479003"}'
```

#### Test WebSocket Connection
```bash
# Install wscat
npm install -g wscat

# Connect to WebSocket
wscat -c "ws://localhost:3000/socket.io/?userType=client&userId=test&sessionId=test"
```

#### Check Redis Data
```bash
redis-cli
> KEYS *
> GEORADIUS drivers 51.1694 43.6532 100000 m WITHDIST
```

### Log Analysis

#### Server Logs
```bash
# View application logs
docker-compose logs -f backend

# View specific service logs
docker-compose logs -f redis
docker-compose logs -f postgres
```

#### Client Debug
```dart
// Enable debug logging
Logger.root.level = Level.ALL;
Logger.root.onRecord.listen((record) {
  print('${record.level.name}: ${record.time}: ${record.message}');
});
```

---

## FAQ

### Q: How do I handle multiple device connections?
A: The system supports multiple WebSocket connections per user. Each connection is tracked in Redis and events are sent to all active connections.

### Q: What's the recommended location update frequency?
A: For active orders, update every 3-5 seconds. For idle drivers, update every 30-60 seconds to save battery.

### Q: How do I handle offline scenarios?
A: Implement local caching and queue operations for offline scenarios. Sync when connection is restored.

### Q: Can I customize the order types?
A: Order types are defined in the backend enum. Contact backend team to add new types.

### Q: How do I handle payment integration?
A: The system includes webhook support for payment callbacks. Implement payment logic in your Flutter app and use the webhook endpoints.

### Q: What's the maximum distance for driver matching?
A: Default radius is 2km for regular orders, 3000km for intercity orders. This is configurable in Redis.

### Q: How do I implement driver earnings tracking?
A: Use the `/driver/stats` endpoint which provides daily, weekly, and monthly earnings data.

### Q: Can I add custom order fields?
A: Yes, extend the order model and update the database schema. Ensure backward compatibility.

### Q: How do I handle app background/foreground transitions?
A: Use `WidgetsBindingObserver` to detect lifecycle changes and manage WebSocket connections accordingly.

### Q: What's the best way to test the integration?
A: Use the provided test phone numbers and endpoints. Set up a local development environment with Redis and PostgreSQL.

---

## Conclusion

This guide provides comprehensive documentation for integrating a Flutter app with the taxi service backend. The system is designed for scalability and real-time performance, with robust error handling and offline capabilities.

For additional support or questions, refer to the backend team or check the API documentation at `http://localhost:3000/api` when the server is running.

**Key Integration Points:**
1. **Authentication**: Phone-based SMS verification with JWT tokens
2. **Real-time Communication**: WebSocket for order tracking and location updates
3. **Geolocation**: Redis-based spatial queries for driver matching
4. **Push Notifications**: Firebase integration for order updates
5. **State Management**: Robust error handling and offline support

**Next Steps:**
1. Set up development environment
2. Implement authentication flow
3. Add WebSocket integration
4. Implement order management
5. Add real-time location tracking
6. Test with provided endpoints
7. Deploy to production environment

