import { Test, TestingModule } from '@nestjs/testing';

describe('Test Setup Verification', () => {
  it('should have NestJS testing module available', () => {
    expect(Test).toBeDefined();
    expect(TestingModule).toBeDefined();
  });

  it('should be able to create a testing module', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [],
    }).compile();

    expect(module).toBeDefined();
    expect(module.createNestApplication).toBeDefined();
  });

  it('should test basic Jest functionality', () => {
    expect(1 + 1).toBe(2);
    expect('hello').toContain('hello');
    expect([1, 2, 3]).toHaveLength(3);
  });

  it('should test async operations', async () => {
    const promise = Promise.resolve('test');
    const result = await promise;
    expect(result).toBe('test');
  });
});
