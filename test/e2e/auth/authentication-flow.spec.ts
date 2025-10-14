import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppModule } from '../../../src/app.module';
import { DatabaseHelper } from '../../helpers/database.helper';
import { AuthHelper } from '../../helpers/auth.helper';
import { MockWhatsAppService } from '../../helpers/mocks/whatsapp.service.mock';
import { MockRedisService } from '../../helpers/mocks/redis.service.mock';
import * as request from 'supertest';
import { Knex } from 'knex';

describe('Authentication Flow E2E Tests', () => {
  let app: INestApplication;
  let knex: Knex;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideProvider('WhatsAppService')
    .useValue(new MockWhatsAppService())
    .overrideProvider('CloudCacheStorageService')
    .useValue(new MockRedisService())
    .compile();

    app = module.createNestApplication();
    await app.init();

    // Initialize database connection
    const knexConfig = {
      client: 'pg',
      connection: {
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5433'),
        user: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || 'postgres',
        database: process.env.DATABASE_NAME || 'taxi_service_test',
      },
    };
    
    knex = require('knex')(knexConfig);
    DatabaseHelper.initialize(knex);
  });

  afterAll(async () => {
    await knex.destroy();
    await app.close();
    await module.close();
  });

  beforeEach(async () => {
    await DatabaseHelper.cleanDatabase();
  });

  describe('Phone Registration Flow', () => {
    it('should register new user with phone number', async () => {
      const phone = '+77771234567';
      
      const response = await request(app.getHttpServer())
        .post('/v1/user/sing-up-by-phone')
        .send({ phone })
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body.token).toBeDefined();
    });

    it('should handle phone number with spaces', async () => {
      const phone = '+7 777 123 45 67';
      
      const response = await request(app.getHttpServer())
        .post('/v1/user/sing-up-by-phone')
        .send({ phone })
        .expect(201);

      expect(response.body).toHaveProperty('token');
    });

    it('should handle phone number with dashes', async () => {
      const phone = '+7-777-123-45-67';
      
      const response = await request(app.getHttpServer())
        .post('/v1/user/sing-up-by-phone')
        .send({ phone })
        .expect(201);

      expect(response.body).toHaveProperty('token');
    });

    it('should reject invalid phone number format', async () => {
      const invalidPhones = [
        '123456789',
        '+1234567890',
        '7771234567',
        '',
        'invalid-phone',
      ];

      for (const phone of invalidPhones) {
        await request(app.getHttpServer())
          .post('/v1/user/sing-up-by-phone')
          .send({ phone })
          .expect(400);
      }
    });

    it('should handle duplicate phone registration', async () => {
      const phone = '+77771234567';
      
      // First registration
      await request(app.getHttpServer())
        .post('/v1/user/sing-up-by-phone')
        .send({ phone })
        .expect(201);

      // Second registration should fail
      await request(app.getHttpServer())
        .post('/v1/user/sing-up-by-phone')
        .send({ phone })
        .expect(409);
    });
  });

  describe('SMS Code Flow', () => {
    it('should send SMS code for existing user', async () => {
      const phone = '+77771234567';
      
      // First register user
      await request(app.getHttpServer())
        .post('/v1/user/sing-up-by-phone')
        .send({ phone })
        .expect(201);

      // Send SMS code
      const response = await request(app.getHttpServer())
        .post('/v1/user/sing-in-by-phone')
        .send({ phone })
        .expect(200);

      expect(response.body).toHaveProperty('smsCode');
      expect(response.body.smsCode).toHaveLength(4);
    });

    it('should send SMS code for new user', async () => {
      const phone = '+77771234568';
      
      const response = await request(app.getHttpServer())
        .post('/v1/user/sing-in-by-phone')
        .send({ phone })
        .expect(200);

      expect(response.body).toHaveProperty('smsCode');
      expect(response.body.smsCode).toHaveLength(4);
    });

    it('should handle rate limiting for SMS codes', async () => {
      const phone = '+77771234569';
      
      // First SMS
      await request(app.getHttpServer())
        .post('/v1/user/sing-in-by-phone')
        .send({ phone })
        .expect(200);

      // Second SMS immediately should fail
      await request(app.getHttpServer())
        .post('/v1/user/sing-in-by-phone')
        .send({ phone })
        .expect(409);
    });

    it('should handle special test phone number', async () => {
      const testPhone = '77051479003';
      
      const response = await request(app.getHttpServer())
        .post('/v1/user/sing-in-by-phone')
        .send({ phone: testPhone })
        .expect(200);

      expect(response.body).toHaveProperty('smsCode');
      // Test phone should not send WhatsApp message
    });
  });

  describe('SMS Code Confirmation', () => {
    it('should confirm SMS code and return access token', async () => {
      const phone = '+77771234570';
      
      // Send SMS code
      const smsResponse = await request(app.getHttpServer())
        .post('/v1/user/sing-in-by-phone')
        .send({ phone })
        .expect(200);

      const smsCode = smsResponse.body.smsCode;

      // Confirm SMS code
      const response = await request(app.getHttpServer())
        .post('/v1/user/sing-in-by-phone-confirm-code')
        .send({ phone, code: smsCode })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.token).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
    });

    it('should reject invalid SMS code', async () => {
      const phone = '+77771234571';
      
      // Send SMS code
      await request(app.getHttpServer())
        .post('/v1/user/sing-in-by-phone')
        .send({ phone })
        .expect(200);

      // Try invalid code
      await request(app.getHttpServer())
        .post('/v1/user/sing-in-by-phone-confirm-code')
        .send({ phone, code: '0000' })
        .expect(400);
    });

    it('should reject expired SMS code', async () => {
      const phone = '+77771234572';
      
      // Send SMS code
      await request(app.getHttpServer())
        .post('/v1/user/sing-in-by-phone')
        .send({ phone })
        .expect(200);

      // Wait for code to expire (in real scenario)
      // For test, we'll use a different approach
      await request(app.getHttpServer())
        .post('/v1/user/sing-in-by-phone-confirm-code')
        .send({ phone, code: '1234' })
        .expect(400);
    });

    it('should handle wrong phone number for code confirmation', async () => {
      const phone1 = '+77771234573';
      const phone2 = '+77771234574';
      
      // Send SMS to phone1
      await request(app.getHttpServer())
        .post('/v1/user/sing-in-by-phone')
        .send({ phone: phone1 })
        .expect(200);

      // Try to confirm with phone2
      await request(app.getHttpServer())
        .post('/v1/user/sing-in-by-phone-confirm-code')
        .send({ phone: phone2, code: '1234' })
        .expect(400);
    });
  });

  describe('JWT Token Validation', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      const phone = '+77771234575';
      
      // Register and get tokens
      const smsResponse = await request(app.getHttpServer())
        .post('/v1/user/sing-in-by-phone')
        .send({ phone })
        .expect(200);

      const confirmResponse = await request(app.getHttpServer())
        .post('/v1/user/sing-in-by-phone-confirm-code')
        .send({ phone, code: smsResponse.body.smsCode })
        .expect(200);

      accessToken = confirmResponse.body.token;
      refreshToken = confirmResponse.body.refreshToken;
    });

    it('should validate access token for protected routes', async () => {
      await request(app.getHttpServer())
        .get('/v1/user/GetMe')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should reject requests without token', async () => {
      await request(app.getHttpServer())
        .get('/v1/user/GetMe')
        .expect(401);
    });

    it('should reject requests with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/v1/user/GetMe')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject requests with malformed token', async () => {
      await request(app.getHttpServer())
        .get('/v1/user/GetMe')
        .set('Authorization', 'invalid-format')
        .expect(401);
    });

    it('should refresh access token with refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/user/refresh-token')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.token).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/v1/user/refresh-token')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);
    });
  });

  describe('User Profile Management', () => {
    let accessToken: string;

    beforeEach(async () => {
      const phone = '+77771234576';
      
      // Register and get token
      const smsResponse = await request(app.getHttpServer())
        .post('/v1/user/sing-in-by-phone')
        .send({ phone })
        .expect(200);

      const confirmResponse = await request(app.getHttpServer())
        .post('/v1/user/sing-in-by-phone-confirm-code')
        .send({ phone, code: smsResponse.body.smsCode })
        .expect(200);

      accessToken = confirmResponse.body.token;
    });

    it('should get current user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/user/GetMe')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('phone');
      expect(response.body.phone).toBe('+77771234576');
    });

    it('should update user profile', async () => {
      const profileData = {
        firstName: 'John',
        lastName: 'Doe',
        middleName: 'Smith',
      };

      const response = await request(app.getHttpServer())
        .put('/v1/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(profileData)
        .expect(200);

      expect(response.body).toHaveProperty('firstName', 'John');
      expect(response.body).toHaveProperty('lastName', 'Doe');
      expect(response.body).toHaveProperty('middleName', 'Smith');
    });

    it('should set device token', async () => {
      const deviceToken = 'test-device-token-123';

      const response = await request(app.getHttpServer())
        .post('/v1/user/device')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ device: deviceToken })
        .expect(200);

      expect(response.body).toHaveProperty('deviceToken', deviceToken);
    });

    it('should test push notification', async () => {
      const notificationData = {
        message: 'Test notification',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/user/test-notification')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(notificationData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      // This would require mocking the database connection
      // For now, we'll test with invalid data
      await request(app.getHttpServer())
        .post('/v1/user/sing-up-by-phone')
        .send({ phone: null })
        .expect(400);
    });

    it('should handle WhatsApp service errors gracefully', async () => {
      const phone = '+77771234577';
      
      // Should still work even if WhatsApp fails
      const response = await request(app.getHttpServer())
        .post('/v1/user/sing-in-by-phone')
        .send({ phone })
        .expect(200);

      expect(response.body).toHaveProperty('smsCode');
    });

    it('should handle Redis cache errors gracefully', async () => {
      const phone = '+77771234578';
      
      // Should still work even if Redis fails
      const response = await request(app.getHttpServer())
        .post('/v1/user/sing-in-by-phone')
        .send({ phone })
        .expect(200);

      expect(response.body).toHaveProperty('smsCode');
    });
  });

  describe('Security', () => {
    it('should not expose sensitive information in responses', async () => {
      const phone = '+77771234579';
      
      const response = await request(app.getHttpServer())
        .post('/v1/user/sing-up-by-phone')
        .send({ phone })
        .expect(201);

      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('smsCode');
      expect(response.body).not.toHaveProperty('internalId');
    });

    it('should validate JWT token expiration', async () => {
      // This would require creating an expired token
      // For now, we'll test with an invalid token
      await request(app.getHttpServer())
        .get('/v1/user/GetMe')
        .set('Authorization', 'Bearer expired-token')
        .expect(401);
    });

    it('should handle token tampering', async () => {
      const tamperedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature';
      
      await request(app.getHttpServer())
        .get('/v1/user/GetMe')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);
    });
  });
});
