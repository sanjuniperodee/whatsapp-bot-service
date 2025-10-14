export interface GeocodingResult {
  name: string;
  lat: number;
  lng: number;
  address?: string;
}

export interface GeocodingPort {
  getAddressByCoordinates(lat: number, lng: number, radius?: number): Promise<string>;
  searchPlaces(query: string, lat: number, lng: number): Promise<GeocodingResult[]>;
  getCoordinatesByAddress(address: string): Promise<{ lat: number; lng: number } | null>;
}
