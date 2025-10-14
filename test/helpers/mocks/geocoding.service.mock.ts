import { GeocodingPort } from '@domain/shared/ports/geocoding.port';

export class MockGeocodingService implements GeocodingPort {
  public getAddressByCoordinates = jest.fn().mockResolvedValue('Test Address, Test City');
  public searchPlaces = jest.fn().mockResolvedValue([
    {
      name: 'Test Place 1',
      lat: 43.585472,
      lng: 51.236168,
    },
    {
      name: 'Test Place 2',
      lat: 43.586472,
      lng: 51.237168,
    },
  ]);

  // Test utilities
  public getLastCoordinatesQuery(): { lat: number; lng: number; radius: number } | null {
    const calls = this.getAddressByCoordinates.mock.calls;
    if (calls.length === 0) return null;
    
    const lastCall = calls[calls.length - 1];
    return {
      lat: lastCall[0],
      lng: lastCall[1],
      radius: lastCall[2],
    };
  }

  public getLastSearchQuery(): { search: string; lat: number; lng: number } | null {
    const calls = this.searchPlaces.mock.calls;
    if (calls.length === 0) return null;
    
    const lastCall = calls[calls.length - 1];
    return {
      search: lastCall[0],
      lat: lastCall[1],
      lng: lastCall[2],
    };
  }

  public reset(): void {
    this.getAddressByCoordinates.mockClear();
    this.searchPlaces.mockClear();
  }

  public simulateError(error: Error): void {
    this.getAddressByCoordinates.mockRejectedValue(error);
    this.searchPlaces.mockRejectedValue(error);
  }

  public simulateApiFailure(): void {
    this.getAddressByCoordinates.mockRejectedValue(new Error('2GIS API Error: 500 Internal Server Error'));
    this.searchPlaces.mockRejectedValue(new Error('2GIS API Error: 500 Internal Server Error'));
  }

  public simulateNoResults(): void {
    this.getAddressByCoordinates.mockResolvedValue('Адрес не найден');
    this.searchPlaces.mockResolvedValue([]);
  }

  public setMockAddress(address: string): void {
    this.getAddressByCoordinates.mockResolvedValue(address);
  }

  public setMockPlaces(places: Array<{ name: string; lat: number; lng: number }>): void {
    this.searchPlaces.mockResolvedValue(places);
  }
}
