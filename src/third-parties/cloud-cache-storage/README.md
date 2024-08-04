# CloudCacheStorageModule


**RedisService**

```typescript
client: IoRedis.Redis
```

**CloudCacheStorageService**

```typescript
setValue(key: string, value: Record<string, any>)
```
```typescript
setValueWithExp(key: string, value: Record<string, any>, expireInSec = 60)
```
```typescript
async getValue<T>(key: string): Promise<null | T>
```
```typescript
async deleteValue(key: string): Promise<boolean>
```

### Example

With `factory` init options
```
CloudCacheStorageModule.forRootAsync(redisFactory)
```
</details>

  <details>
    <summary>redis.factory.ts</summary>

```javascript
import { ConfigService } from '@nestjs/config';
import { CloudCacheModuleOptions } from '@purrweb/cloud-cache-storage';

export const redisFactory = {
  useFactory: (configService: ConfigService): CloudCacheModuleOptions => {
    return {
      port: configService.get<number>('redis.port'),
      host: configService.get<string>('redis.host'),
    };
  },
  inject: [ConfigService],
};

```
</details>

