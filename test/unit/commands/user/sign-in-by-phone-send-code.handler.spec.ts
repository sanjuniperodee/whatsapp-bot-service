import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { SignInByPhoneSendCodeService } from '@domain/user/commands/sign-in-by-phone-send-code/sign-in-by-phone-send-code.service';
import { SignInByPhoneSendCodeRequest } from '@domain/user/commands/sign-in-by-phone-send-code/sign-in-by-phone-send-code.request.dto';
// Using string tokens for providers
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service';
import { UserFactory } from '../../../helpers/factories/user.factory';
import { MockRedisService } from '../../../helpers/mocks/redis.service.mock';
import { MockWhatsAppService } from '../../../helpers/mocks/whatsapp.service.mock';

describe('SignInByPhoneSendCodeService', () => {
  let service: SignInByPhoneSendCodeService;
  let userRepository: any;
  let cacheStorageService: any;
  let whatsAppService: jest.Mocked<WhatsAppService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignInByPhoneSendCodeService,
        {
          provide: 'UserRepository',
          useValue: {
            findOneByPhone: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: 'CloudCacheStorageService',
          useValue: {
            getSMSCode: jest.fn(),
            saveSMSCode: jest.fn(),
          },
        },
        {
          provide: WhatsAppService,
          useValue: {
            sendMessage: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SignInByPhoneSendCodeService>(SignInByPhoneSendCodeService);
    userRepository = module.get('UserRepository');
    cacheStorageService = module.get('CloudCacheStorageService');
    whatsAppService = module.get(WhatsAppService);
  });

  const validRequest = { phone: '+77771234567' } as SignInByPhoneSendCodeRequest;

  describe('execute', () => {

    it('should send code successfully for existing user', async () => {
      const user = UserFactory.create({ phone: '+77771234567' });
      userRepository.findOneByPhone.mockResolvedValue(user);
      cacheStorageService.getSMSCode.mockResolvedValue(null);
      cacheStorageService.saveSMSCode.mockResolvedValue(undefined);
      whatsAppService.sendMessage.mockResolvedValue(undefined);

      const result = await service.handle(validRequest);

      expect(result).toBeDefined();
      expect(result.length).toBe(4); // SMS code length
      expect(userRepository.findOneByPhone).toHaveBeenCalledWith('+77771234567');
      expect(cacheStorageService.getSMSCode).toHaveBeenCalledWith('+77771234567');
      expect(cacheStorageService.saveSMSCode).toHaveBeenCalled();
      expect(whatsAppService.sendMessage).toHaveBeenCalledWith(
        '+77771234567@c.us',
        expect.stringContaining('Ваш код для входа:')
      );
    });

    it('should send code successfully for new user', async () => {
      userRepository.findOneByPhone.mockResolvedValue(null);
      cacheStorageService.getSMSCode.mockResolvedValue(null);
      cacheStorageService.saveSMSCode.mockResolvedValue(undefined);
      whatsAppService.sendMessage.mockResolvedValue(undefined);

      const result = await service.handle(validRequest);

      expect(result).toBeDefined();
      expect(result.length).toBe(4);
      expect(userRepository.findOneByPhone).toHaveBeenCalledWith('+77771234567');
      expect(cacheStorageService.saveSMSCode).toHaveBeenCalled();
      expect(whatsAppService.sendMessage).toHaveBeenCalled();
    });

    it('should throw ConflictException when code already sent recently', async () => {
      const existingCode = {
        code: '1234',
        expiresAt: Date.now() + 300000, // 5 minutes from now
      };
      
      cacheStorageService.getSMSCode.mockResolvedValue(existingCode);

      await expect(service.handle(validRequest)).rejects.toThrow(ConflictException);
      await expect(service.handle(validRequest)).rejects.toThrow('Код можно отправить раз в 60 секунд');
    });

    it('should handle WhatsApp service error gracefully', async () => {
      const user = UserFactory.create();
      userRepository.findOneByPhone.mockResolvedValue(user);
      cacheStorageService.getSMSCode.mockResolvedValue(null);
      cacheStorageService.saveSMSCode.mockResolvedValue(undefined);
      whatsAppService.sendMessage.mockRejectedValue(new Error('WhatsApp API Error'));

      const result = await service.handle(validRequest);

      expect(result).toBeDefined();
      expect(result.length).toBe(4);
      expect(whatsAppService.sendMessage).toHaveBeenCalled();
    });

    it('should handle special test phone number', async () => {
      const testCommand = { phone: '77051479003' } as SignInByPhoneSendCodeRequest;

      userRepository.findOneByPhone.mockResolvedValue(null);
      cacheStorageService.getSMSCode.mockResolvedValue(null);
      cacheStorageService.saveSMSCode.mockResolvedValue(undefined);

      const result = await service.handle(testCommand);

      expect(result).toBeDefined();
      expect(whatsAppService.sendMessage).not.toHaveBeenCalled();
    });

    it('should generate valid SMS code', async () => {
      userRepository.findOneByPhone.mockResolvedValue(null);
      cacheStorageService.getSMSCode.mockResolvedValue(null);
      cacheStorageService.saveSMSCode.mockResolvedValue(undefined);
      whatsAppService.sendMessage.mockResolvedValue(undefined);

      const result = await service.handle(validRequest);

      expect(result).toBeDefined();
      expect(result.length).toBe(4);
      expect(/^\d{4}$/.test(result)).toBe(true);
    });

    it('should handle cache service error', async () => {
      userRepository.findOneByPhone.mockResolvedValue(null);
      cacheStorageService.getSMSCode.mockRejectedValue(new Error('Cache error'));

      await expect(service.handle(validRequest)).rejects.toThrow('Cache error');
    });

    it('should handle cache save error', async () => {
      userRepository.findOneByPhone.mockResolvedValue(null);
      cacheStorageService.getSMSCode.mockResolvedValue(null);
      cacheStorageService.saveSMSCode.mockRejectedValue(new Error('Cache save error'));

      await expect(service.handle(validRequest)).rejects.toThrow('Cache save error');
    });

    it('should handle phone number normalization', async () => {
      const commandWithSpaces = { phone: '+7 777 123 45 67' } as SignInByPhoneSendCodeRequest;

      userRepository.findOneByPhone.mockResolvedValue(null);
      cacheStorageService.getSMSCode.mockResolvedValue(null);
      cacheStorageService.saveSMSCode.mockResolvedValue(undefined);
      whatsAppService.sendMessage.mockResolvedValue(undefined);

      const result = await service.handle(commandWithSpaces);

      expect(result).toBeDefined();
      expect(userRepository.findOneByPhone).toHaveBeenCalledWith('+77771234567');
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple concurrent requests for same phone', async () => {
      userRepository.findOneByPhone.mockResolvedValue(null);
      cacheStorageService.getSMSCode.mockResolvedValue(null);
      cacheStorageService.saveSMSCode.mockResolvedValue(undefined);
      whatsAppService.sendMessage.mockResolvedValue(undefined);

      const promises = [
        service.handle(validRequest),
        service.handle(validRequest),
      ];

      // Should handle race condition gracefully
      const results = await Promise.allSettled(promises);
      expect(results.some(result => result.status === 'fulfilled')).toBe(true);
    });

    it('should handle expired SMS code', async () => {
      const expiredCode = {
        code: '1234',
        expiresAt: Date.now() - 1000, // Expired 1 second ago
      };
      
      userRepository.findOneByPhone.mockResolvedValue(null);
      cacheStorageService.getSMSCode.mockResolvedValue(expiredCode);
      cacheStorageService.saveSMSCode.mockResolvedValue(undefined);
      whatsAppService.sendMessage.mockResolvedValue(undefined);

      const result = await service.handle(validRequest);

      expect(result).toBeDefined();
      expect(result.length).toBe(4);
    });

    it('should handle different phone number formats', async () => {
      const phoneFormats = [
        '+77771234567',
        '+7 777 123 45 67',
        '+7-777-123-45-67',
        '+7 (777) 123-45-67',
      ];

      for (const phone of phoneFormats) {
        const command = { phone } as SignInByPhoneSendCodeRequest;
        
        userRepository.findOneByPhone.mockResolvedValue(null);
        cacheStorageService.getSMSCode.mockResolvedValue(null);
        cacheStorageService.saveSMSCode.mockResolvedValue(undefined);
        whatsAppService.sendMessage.mockResolvedValue(undefined);

        const result = await service.handle(command);

        expect(result).toBeDefined();
        expect(result.length).toBe(4);
      }
    });
  });
});
