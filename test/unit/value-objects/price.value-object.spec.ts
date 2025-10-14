import { Price } from '@domain/shared/value-objects/price.value-object';

describe('Price Value Object', () => {
  describe('Creation', () => {
    it('should create price with valid value', () => {
      const price = new Price({ value: 1000 });
      
      expect(price.value).toBe(1000);
    });

    it('should create price with zero value', () => {
      const price = new Price({ value: 0 });
      
      expect(price.value).toBe(0);
    });

    it('should create price with large value', () => {
      const price = new Price({ value: 999999 });
      
      expect(price.value).toBe(999999);
    });
  });

  describe('Validation', () => {
    it('should throw error for negative price', () => {
      expect(() => new Price({ value: -100 })).toThrow('Price cannot be negative');
    });

    it('should throw error for undefined value', () => {
      expect(() => new Price({ value: undefined as any })).toThrow('Price value is required');
    });

    it('should throw error for null value', () => {
      expect(() => new Price({ value: null as any })).toThrow('Price value is required');
    });

    it('should throw error for non-numeric value', () => {
      expect(() => new Price({ value: 'invalid' as any })).toThrow('Price must be a number');
    });
  });

  describe('Equality', () => {
    it('should be equal to same price', () => {
      const price1 = new Price({ value: 1000 });
      const price2 = new Price({ value: 1000 });
      
      expect(price1.equals(price2)).toBe(true);
    });

    it('should not be equal to different price', () => {
      const price1 = new Price({ value: 1000 });
      const price2 = new Price({ value: 2000 });
      
      expect(price1.equals(price2)).toBe(false);
    });

    it('should not be equal to null', () => {
      const price = new Price({ value: 1000 });
      
      expect(price.equals(null)).toBe(false);
    });

    it('should not be equal to undefined', () => {
      const price = new Price({ value: 1000 });
      
      expect(price.equals(undefined)).toBe(false);
    });
  });

  describe('String Representation', () => {
    it('should return string representation', () => {
      const price = new Price({ value: 1000 });
      
      expect(price.toString()).toBe('1000');
    });

    it('should return formatted string', () => {
      const price = new Price({ value: 1500 });
      
      expect(price.toString()).toBe('1500');
    });
  });

  describe('Edge Cases', () => {
    it('should handle decimal values', () => {
      const price = new Price({ value: 99.99 });
      
      expect(price.value).toBe(99.99);
    });

    it('should handle very small values', () => {
      const price = new Price({ value: 0.01 });
      
      expect(price.value).toBe(0.01);
    });

    it('should handle maximum safe integer', () => {
      const price = new Price({ value: Number.MAX_SAFE_INTEGER });
      
      expect(price.value).toBe(Number.MAX_SAFE_INTEGER);
    });
  });
});
