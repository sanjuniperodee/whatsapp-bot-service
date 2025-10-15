import { Injectable } from '@nestjs/common';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';
import { Logger } from '@libs/ddd/domain/ports/logger.port';
import { Inject } from '@nestjs/common';
import { Server } from 'socket.io';
import { OrderRequestRepository } from '../../../domain-repositories/order-request/order-request.repository';

@Injectable()
export class LocationTrackingService {
  constructor(
    private readonly cacheStorageService: CloudCacheStorageService,
    private readonly orderRequestRepository: OrderRequestRepository,
    @Inject('Logger') private readonly logger: Logger,
  ) {}

  async handleDriverLocationUpdate(
    driverId: string, 
    lng: number, 
    lat: number, 
    orderId?: string,
    server?: Server
  ): Promise<void> {
    try {
      // Обновляем геолокацию водителя в кеше
      await this.cacheStorageService.updateDriverLocation(driverId, lng.toString(), lat.toString());
      
      if (orderId) {
        // Если есть активный заказ, находим клиента и уведомляем его
        try {
          // Находим активный заказ
          const orderRequest = await this.orderRequestRepository.findOneById(orderId);
          if (orderRequest) {
            const clientId = orderRequest.getPropsCopy().clientId.value;
            
            // Получаем все сокеты клиента
            const clientSocketIds = await this.cacheStorageService.getSocketIds(clientId);
            
            if (clientSocketIds && clientSocketIds.length > 0 && server) {
              for (const socketId of clientSocketIds) {
                try {
                  const socket = server.sockets.sockets.get(socketId);
                  if (socket && socket.connected) {
                    socket.emit('driverLocationUpdate', {
                      driverId,
                      lng,
                      lat,
                      orderId,
                      timestamp: Date.now()
                    });
                  } else {
                    // Удаляем неактивный сокет
                    await this.cacheStorageService.removeSocketId(clientId, socketId);
                  }
                } catch (error) {
                  console.error(`❌ [LOCATION] Ошибка отправки на сокет ${socketId}:`, error);
                  await this.cacheStorageService.removeSocketId(clientId, socketId);
                }
              }
              this.logger.debug(`Driver location update sent to client ${clientId} for order ${orderId}`);
            }
          }
        } catch (error) {
          console.error(`❌ [LOCATION] Ошибка при поиске заказа ${orderId}:`, error);
        }
      }

      this.logger.debug(`Driver ${driverId} location updated: ${lat}, ${lng}`);
    } catch (error) {
      this.logger.error(`Failed to handle driver location update for ${driverId}:`, error);
    }
  }
}
