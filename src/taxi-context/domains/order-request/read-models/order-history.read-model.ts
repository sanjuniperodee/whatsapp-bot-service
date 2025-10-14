export interface OrderHistoryReadModel {
  id: string;
  clientId: string;
  driverId?: string;
  orderType: string;
  orderStatus: string;
  from: string;
  to: string;
  fromMapboxId: string;
  toMapboxId: string;
  lat: number;
  lng: number;
  price: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
  startTime?: Date;
  arrivalTime?: Date;
  completedAt?: Date;
  rating?: number;
  rejectReason?: string;
  
  // Денормализованные данные клиента
  client: {
    id: string;
    phone: string;
    firstName: string;
    lastName: string;
    middleName?: string;
  };
  
  // Денормализованные данные водителя (если был)
  driver?: {
    id: string;
    phone: string;
    firstName: string;
    lastName: string;
    middleName?: string;
  };
  
  // Денормализованные данные автомобиля (если был)
  car?: {
    id: string;
    SSN: string;
    brand: string;
    model: string;
    color: string;
    number: string;
  };
}
