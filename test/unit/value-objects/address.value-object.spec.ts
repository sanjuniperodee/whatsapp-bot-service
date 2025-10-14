import { Address } from '@domain/shared/value-objects/address.value-object';

describe('Address Value Object', () => {
  describe('Creation', () => {
    it('should create address with valid data', () => {
      const address = new Address({ 
        from: 'Test From Address', 
        to: 'Test To Address' 
      });
      
      expect(address.from).toBe('Test From Address');
      expect(address.to).toBe('Test To Address');
    });

    it('should create address with empty strings', () => {
      const address = new Address({ from: '', to: '' });
      
      expect(address.from).toBe('');
      expect(address.to).toBe('');
    });

    it('should create address with long addresses', () => {
      const longFrom = 'A'.repeat(500);
      const longTo = 'B'.repeat(500);
      const address = new Address({ from: longFrom, to: longTo });
      
      expect(address.from).toBe(longFrom);
      expect(address.to).toBe(longTo);
    });
  });

  describe('Validation', () => {
    it('should throw error for undefined from address', () => {
      expect(() => new Address({ 
        from: undefined as any, 
        to: 'Test To Address' 
      })).toThrow('From address is required');
    });

    it('should throw error for null from address', () => {
      expect(() => new Address({ 
        from: null as any, 
        to: 'Test To Address' 
      })).toThrow('From address is required');
    });

    it('should throw error for undefined to address', () => {
      expect(() => new Address({ 
        from: 'Test From Address', 
        to: undefined as any 
      })).toThrow('To address is required');
    });

    it('should throw error for null to address', () => {
      expect(() => new Address({ 
        from: 'Test From Address', 
        to: null as any 
      })).toThrow('To address is required');
    });
  });

  describe('Equality', () => {
    it('should be equal to same address', () => {
      const address1 = new Address({ 
        from: 'Test From', 
        to: 'Test To' 
      });
      const address2 = new Address({ 
        from: 'Test From', 
        to: 'Test To' 
      });
      
      expect(address1.equals(address2)).toBe(true);
    });

    it('should not be equal to different from address', () => {
      const address1 = new Address({ 
        from: 'Test From 1', 
        to: 'Test To' 
      });
      const address2 = new Address({ 
        from: 'Test From 2', 
        to: 'Test To' 
      });
      
      expect(address1.equals(address2)).toBe(false);
    });

    it('should not be equal to different to address', () => {
      const address1 = new Address({ 
        from: 'Test From', 
        to: 'Test To 1' 
      });
      const address2 = new Address({ 
        from: 'Test From', 
        to: 'Test To 2' 
      });
      
      expect(address1.equals(address2)).toBe(false);
    });

    it('should not be equal to null', () => {
      const address = new Address({ from: 'Test From', to: 'Test To' });
      
      expect(address.equals(null)).toBe(false);
    });

    it('should not be equal to undefined', () => {
      const address = new Address({ from: 'Test From', to: 'Test To' });
      
      expect(address.equals(undefined)).toBe(false);
    });
  });

  describe('String Representation', () => {
    it('should return string representation', () => {
      const address = new Address({ 
        from: 'Test From', 
        to: 'Test To' 
      });
      
      expect(address.toString()).toBe('Test From -> Test To');
    });

    it('should handle empty addresses', () => {
      const address = new Address({ from: '', to: '' });
      
      expect(address.toString()).toBe(' -> ');
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters', () => {
      const address = new Address({ 
        from: 'ул. Ленина, 123, кв. 45', 
        to: 'пр. Мира, 67, дом 89' 
      });
      
      expect(address.from).toBe('ул. Ленина, 123, кв. 45');
      expect(address.to).toBe('пр. Мира, 67, дом 89');
    });

    it('should handle unicode characters', () => {
      const address = new Address({ 
        from: 'улица Тестовая 123', 
        to: 'проспект Тестовый 456' 
      });
      
      expect(address.from).toBe('улица Тестовая 123');
      expect(address.to).toBe('проспект Тестовый 456');
    });

    it('should handle very long addresses', () => {
      const longAddress = 'A'.repeat(1000);
      const address = new Address({ 
        from: longAddress, 
        to: longAddress 
      });
      
      expect(address.from).toBe(longAddress);
      expect(address.to).toBe(longAddress);
    });
  });
});
