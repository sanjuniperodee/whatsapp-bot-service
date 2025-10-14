import { Injectable } from '@nestjs/common';
import { GeocodingPort, GeocodingResult } from '@domain/shared/ports/geocoding.port';
import { Logger } from '@libs/ddd/domain/ports/logger.port';
import { Inject } from '@nestjs/common';

@Injectable()
export class TwoGisGeocodingAdapter implements GeocodingPort {
  constructor(
    @Inject('Logger') private readonly logger: Logger,
  ) {}

  async getAddressByCoordinates(lat: number, lng: number, radius: number = 15): Promise<string> {
    try {
      const response = await fetch(
        `https://platform.2gis.ru/api/services/geocoder?type=street%2Cbuilding%2Cattraction%2Cstation_platform%2Cadm_div.place%2Cadm_div.city%2Cadm_div.district&fields=items.point%2Citems.region_id%2Citems.segment_id&lon=${lng}&lat=${lat}`,
        {
          method: 'GET',
          headers: { 'User-Agent': 'MyApp/1.0' }
        }
      );

      if (!response.ok) {
        throw new Error(`2ГИС API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data?.result?.items || data.result.items.length === 0) {
        return 'Адрес не найден';
      }

      const bestMatch = data.result.items[0];
      return bestMatch.full_name || bestMatch.name;
    } catch (error) {
      this.logger.error(`Failed to get address by coordinates:`, error);
      throw error;
    }
  }

  async searchPlaces(query: string, lat: number, lng: number): Promise<GeocodingResult[]> {
    try {
      const bbox = this.makeBoundingBox(lat, lng, 25);
      const url = new URL('https://platform.2gis.ru/api/services/geocoder');
      url.searchParams.set('fields', 'items.point,items.region_id,items.segment_id');
      url.searchParams.set('q', query);
      url.searchParams.set('point1', `${bbox.left},${bbox.top}`);
      url.searchParams.set('point2', `${bbox.right},${bbox.bottom}`);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'User-Agent': 'MyApp/1.0' }
      });

      if (!response.ok) {
        throw new Error(`2ГИС API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data?.result?.items || data.result.items.length === 0) {
        return [];
      }

      return data.result.items.map((item: any) => ({
        name: item.full_name || item.name || 'Неизвестный адрес',
        lat: item.point.lat,
        lng: item.point.lon,
        address: item.full_name
      }));
    } catch (error) {
      this.logger.error(`Failed to search places:`, error);
      throw error;
    }
  }

  async getCoordinatesByAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const url = new URL('https://platform.2gis.ru/api/services/geocoder');
      url.searchParams.set('fields', 'items.point');
      url.searchParams.set('q', address);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'User-Agent': 'MyApp/1.0' }
      });

      if (!response.ok) {
        throw new Error(`2ГИС API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data?.result?.items || data.result.items.length === 0) {
        return null;
      }

      const firstResult = data.result.items[0];
      return {
        lat: firstResult.point.lat,
        lng: firstResult.point.lon
      };
    } catch (error) {
      this.logger.error(`Failed to get coordinates by address:`, error);
      return null;
    }
  }

  private makeBoundingBox(lat: number, lon: number, radiusKm: number) {
    const degPerKmLat = 1 / 111;
    const degPerKmLon = 1 / (111 * Math.cos(lat * Math.PI / 180));

    const latDelta = radiusKm * degPerKmLat;
    const lonDelta = radiusKm * degPerKmLon;

    return {
      top: lat + latDelta,
      bottom: lat - latDelta,
      left: lon - lonDelta,
      right: lon + lonDelta
    };
  }
}
