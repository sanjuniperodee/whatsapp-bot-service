import { Controller, Get, Post, Query, Param } from '@nestjs/common';
import { PerformanceService } from './performance.service';

@Controller('performance')
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  @Get('simple')
  async simpleTest() {
    return {
      message: 'Simple performance test',
      timestamp: new Date().toISOString(),
      pid: process.pid,
    };
  }

  @Get('db-simple')
  async dbSimpleTest() {
    return await this.performanceService.simpleDbQuery();
  }

  @Get('db-complex')
  async dbComplexTest() {
    return await this.performanceService.complexDbQuery();
  }

  @Get('cache-test')
  async cacheTest() {
    return await this.performanceService.cacheTest();
  }

  @Get('heavy-computation')
  async heavyComputation(@Query('iterations') iterations: string = '1000') {
    return await this.performanceService.heavyComputation(parseInt(iterations));
  }

  @Get('memory-test')
  async memoryTest() {
    return await this.performanceService.memoryTest();
  }

  @Post('create-test-data')
  async createTestData(@Query('count') count: string = '100') {
    return await this.performanceService.createTestData(parseInt(count));
  }

  @Get('users/:id')
  async getUserById(@Param('id') id: string) {
    return await this.performanceService.getUserById(id);
  }

  @Get('users')
  async getUsers(@Query('limit') limit: string = '10', @Query('offset') offset: string = '0') {
    return await this.performanceService.getUsers(parseInt(limit), parseInt(offset));
  }

  @Get('orders')
  async getOrders(@Query('limit') limit: string = '10', @Query('offset') offset: string = '0') {
    return await this.performanceService.getOrders(parseInt(limit), parseInt(offset));
  }

  @Get('stats')
  async getStats() {
    return await this.performanceService.getStats();
  }
} 