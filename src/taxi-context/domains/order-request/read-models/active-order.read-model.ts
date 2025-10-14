export interface ActiveOrderReadModel {
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
  rating?: number;
  
  // Денормализованные данные клиента
  client?: {
    id: string;
    phone: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    deviceToken?: string;
  };
  
  // Денормализованные данные водителя
  driver?: {
    id: string;
    phone: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    deviceToken?: string;
  };
  
  // Денормализованные данные автомобиля
  car?: {
    id: string;
    SSN: string;
    brand: string;
    model: string;
    color: string;
    number: string;
  };
}
