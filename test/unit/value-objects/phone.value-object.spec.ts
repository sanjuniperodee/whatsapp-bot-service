import { Phone } from '@domain/shared/value-objects/phone.value-object';

describe('Phone Value Object', () => {
  describe('Creation', () => {
    it('should create phone with valid Kazakhstan number', () => {
      const phone = new Phone('+77771234567');
      
      expect(phone.value).toBe('+77771234567');
    });

    it('should create phone with different Kazakhstan prefixes', () => {
      const phones = [
        '+77051234567',
        '+77771234567',
        '+77751234567',
      ];
      
      phones.forEach(phoneNumber => {
        const phone = new Phone(phoneNumber);
        expect(phone.value).toBe(phoneNumber);
      });
    });

    it('should create phone with spaces', () => {
      const phone = new Phone('+7 777 123 45 67');
      
      expect(phone.value).toBe('+7 777 123 45 67');
    });

    it('should create phone with dashes', () => {
      const phone = new Phone('+7-777-123-45-67');
      
      expect(phone.value).toBe('+7-777-123-45-67');
    });

    it('should create phone with parentheses', () => {
      const phone = new Phone('+7 (777) 123-45-67');
      
      expect(phone.value).toBe('+7 (777) 123-45-67');
    });
  });

  describe('Validation', () => {
    it('should throw error for invalid phone format', () => {
      expect(() => new Phone('123456789')).toThrow('Invalid phone number format');
    });

    it('should throw error for phone without country code', () => {
      expect(() => new Phone('7771234567')).toThrow('Invalid phone number format');
    });

    it('should throw error for phone with wrong country code', () => {
      expect(() => new Phone('+1234567890')).toThrow('Invalid phone number format');
    });

    it('should throw error for too short phone', () => {
      expect(() => new Phone('+7777123')).toThrow('Invalid phone number format');
    });

    it('should throw error for too long phone', () => {
      expect(() => new Phone('+777712345678')).toThrow('Invalid phone number format');
    });

    it('should throw error for empty phone', () => {
      expect(() => new Phone('')).toThrow('Phone number is required');
    });

    it('should throw error for undefined phone', () => {
      expect(() => new Phone(undefined as any)).toThrow('Phone number is required');
    });

    it('should throw error for null phone', () => {
      expect(() => new Phone(null as any)).toThrow('Phone number is required');
    });
  });

  describe('Normalization', () => {
    it('should normalize phone with spaces', () => {
      const phone = new Phone('+7 777 123 45 67');
      
      expect(phone.normalized).toBe('+77771234567');
    });

    it('should normalize phone with dashes', () => {
      const phone = new Phone('+7-777-123-45-67');
      
      expect(phone.normalized).toBe('+77771234567');
    });

    it('should normalize phone with parentheses', () => {
      const phone = new Phone('+7 (777) 123-45-67');
      
      expect(phone.normalized).toBe('+77771234567');
    });

    it('should normalize phone with mixed formatting', () => {
      const phone = new Phone('+7 (777) 123 45-67');
      
      expect(phone.normalized).toBe('+77771234567');
    });
  });

  describe('Equality', () => {
    it('should be equal to same phone', () => {
      const phone1 = new Phone('+77771234567');
      const phone2 = new Phone('+77771234567');
      
      expect(phone1.equals(phone2)).toBe(true);
    });

    it('should be equal to same phone with different formatting', () => {
      const phone1 = new Phone('+77771234567');
      const phone2 = new Phone('+7 777 123 45 67');
      
      expect(phone1.equals(phone2)).toBe(true);
    });

    it('should not be equal to different phone', () => {
      const phone1 = new Phone('+77771234567');
      const phone2 = new Phone('+77771234568');
      
      expect(phone1.equals(phone2)).toBe(false);
    });

    it('should not be equal to null', () => {
      const phone = new Phone('+77771234567');
      
      expect(phone.equals(null)).toBe(false);
    });

    it('should not be equal to undefined', () => {
      const phone = new Phone('+77771234567');
      
      expect(phone.equals(undefined)).toBe(false);
    });
  });

  describe('String Representation', () => {
    it('should return original phone format', () => {
      const phone = new Phone('+7 777 123 45 67');
      
      expect(phone.toString()).toBe('+7 777 123 45 67');
    });

    it('should return normalized format when requested', () => {
      const phone = new Phone('+7 777 123 45 67');
      
      expect(phone.normalized).toBe('+77771234567');
    });
  });

  describe('Edge Cases', () => {
    it('should handle phone with leading zeros', () => {
      const phone = new Phone('+77770012345');
      
      expect(phone.value).toBe('+77770012345');
      expect(phone.normalized).toBe('+77770012345');
    });

    it('should handle phone with multiple spaces', () => {
      const phone = new Phone('+7   777   123   45   67');
      
      expect(phone.normalized).toBe('+77771234567');
    });

    it('should handle phone with tabs', () => {
      const phone = new Phone('+7\t777\t123\t45\t67');
      
      expect(phone.normalized).toBe('+77771234567');
    });

    it('should handle phone with mixed separators', () => {
      const phone = new Phone('+7-777 123-45 67');
      
      expect(phone.normalized).toBe('+77771234567');
    });
  });

  describe('Kazakhstan Specific', () => {
    it('should validate Kazakhstan mobile prefixes', () => {
      const validPrefixes = ['777', '701', '702', '705', '707', '708', '747', '750', '751', '760', '761', '762', '763', '764', '771', '775', '776', '778'];
      
      validPrefixes.forEach(prefix => {
        const phone = new Phone(`+7${prefix}1234567`);
        expect(phone.value).toBe(`+7${prefix}1234567`);
      });
    });

    it('should handle Almaty city code', () => {
      const phone = new Phone('+77271234567');
      
      expect(phone.value).toBe('+77271234567');
    });

    it('should handle Astana city code', () => {
      const phone = new Phone('+77171234567');
      
      expect(phone.value).toBe('+77171234567');
    });
  });
});
