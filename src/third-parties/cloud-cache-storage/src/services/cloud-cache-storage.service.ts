import { Injectable } from '@nestjs/common';
import moment from 'moment';

import { RedisService } from './redis.service';

@Injectable()
export class CloudCacheStorageService {
  constructor(private readonly redisService: RedisService) {}

  setValue(key: string, value: Record<string, any>) {
    this.redisService.client.set(key, JSON.stringify(value));
  }

  setSocketId(key: string, value: string) {
    this.redisService.client.set(key, value);
  }

  setValueWithExp(key: string, value: Record<string, any>, expireInSec = 60) {
    const expDate = moment().add(expireInSec, 'seconds');

    const expDateISO = expDate.toISOString();

    this.redisService.client.set(key, JSON.stringify({ ...value, expDate: expDateISO }), 'EX', expireInSec);

    return {
      key,
      value,
      expDate: expDateISO,
    };
  }

  async getValue<T>(key: string): Promise<null | T> {
    const value = await this.redisService.client.get(key);
    if (value) {
      return JSON.parse(value);
    } else {
      return null;
    }
  }

  async getSocketClientId(key: string){
    const value = await this.redisService.client.get(key);
    if (value) {
      return value;
    } else {
      return null;
    }
  }

  async deleteValue(key: string): Promise<boolean> {
    const res = await this.redisService.client.del(key);
    return Boolean(res);
  }

  async updateDriverLocation(driverId: string, latitude: number, longitude: number): Promise<void> {
    await this.redisService.geoAdd('drivers', longitude, latitude, driverId);
  }

  async findNearestDrivers(latitude: number, longitude: number, radius = 5000): Promise<string[]> {
    return await this.redisService.geoRadius('drivers', longitude, latitude, radius, 'm', 10, 'ASC');
  }
}
