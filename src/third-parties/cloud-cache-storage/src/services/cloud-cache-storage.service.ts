import { Injectable } from '@nestjs/common';
import moment from 'moment';

import { RedisService } from './redis.service';
import { OrderType } from '../../../../infrastructure/enums';

@Injectable()
export class CloudCacheStorageService {
  constructor(private readonly redisService: RedisService) {}

  async addSocketId(userId: string, socketId: string) {
    const key = `sockets:${userId}`;
    // Добавляем Socket ID в множество
    await this.redisService.client.sadd(key, socketId);
    // Отменяем TTL, чтобы ключ снова стал постоянным
    await this.redisService.client.persist(key);
  }

  // Удаляем Socket ID из множества для userId
  async removeSocketId(userId: string, socketId: string) {
    const key = `sockets:${userId}`;

    await this.redisService.client.srem(key, socketId);
  }

  // Получаем все Socket ID для userId
  async getSocketIds(userId: string): Promise<string[]> {
    return await this.redisService.client.smembers(`sockets:${userId}`);
  }

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

  async updateDriverLocation(driverId: string, latitude: string, longitude: string): Promise<void> {
    try {
      await this.redisService.geoAdd('drivers', parseFloat(longitude), parseFloat(longitude), driverId);
    }
    catch (error){
      console.log("FUCK ME DADDY", latitude, longitude)
    }
  }

  async getDriverLocation(driverId: string): Promise<{ latitude: number; longitude: number } | null> {
    try{
      const positions = await this.redisService.client.geopos('drivers', driverId);
      if (positions.length > 0 && positions[0]) {
        const [longitude, latitude] = positions[0];
        if(longitude && latitude)
        return { latitude: parseFloat(latitude), longitude: parseFloat(longitude) };
      }
      return null;
    }
    catch (error){
      return null
    }
  }

  async findNearestDrivers(latitude: number, longitude: number, radius = 2000000): Promise<string[]> {
    try{
      return await this.redisService.geoRadius('drivers', longitude, latitude, radius, 'm', 10, 'ASC');
    }
    catch (error){
      return []
    }
  }

  async updateOrderLocation(orderId: string, latitude: number, longitude: number, orderType: OrderType): Promise<void> {
    try{
      await this.redisService.geoAdd(`orders:${orderType}`, longitude, latitude, orderId);
    }
    catch (error){

    }
  }

  async findNearestOrdersByType(latitude: number, longitude: number, orderType: OrderType, radius = 200000000): Promise<string[]> {
    try{
      if(orderType == OrderType.INTERCITY_TAXI)
        radius = 3000000000
      return await this.redisService.geoRadius(`orders:${orderType}`, longitude, latitude, radius, 'm', 10, 'ASC');
    }
    catch (error){
      return []
    }
  }

  async removeOrderLocation(orderId: string, orderType: OrderType): Promise<void> {
    // Удаляем заказ из набора геолокации по типу заказа
    await this.redisService.client.zrem(`orders:${orderType}`, orderId);
  }
}
