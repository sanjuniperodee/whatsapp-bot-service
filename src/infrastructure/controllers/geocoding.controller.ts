import { Controller, Get, Query, BadRequestException, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { GeocodingPort } from '@domain/shared/ports/geocoding.port';

@ApiTags('Geocoding')
@Controller('v1/order-requests')
export class GeocodingController {
  constructor(
    @Inject('GeocodingPort') private readonly geocodingService: GeocodingPort,
  ) {}
  @Get('address')
  @ApiOperation({ summary: 'Get address by coordinates' })
  @ApiResponse({ status: 200, description: 'Address retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid coordinates' })
  async getAddress(
    @Query('lat') latStr: string,
    @Query('lon') lonStr: string,
    @Query('radius') radiusStr?: string,
  ) {
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    const radius = radiusStr ? parseFloat(radiusStr) : 15;

    if (isNaN(lat) || isNaN(lon)) {
      throw new BadRequestException('Invalid lat/lon query params');
    }

    return await this.geocodingService.getAddressByCoordinates(lat, lon, radius);
  }

  @Get('find-by-name')
  @ApiOperation({ summary: 'Search places by name' })
  @ApiResponse({ status: 200, description: 'Places found successfully' })
  @ApiResponse({ status: 400, description: 'Invalid search parameters' })
  async localSearch(
    @Query('lat') latStr: string,
    @Query('lon') lonStr: string,
    @Query('search') search: string,
  ) {
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);

    if (isNaN(lat) || isNaN(lon) || !search) {
      throw new BadRequestException('Invalid params: lat, lon, query are required');
    }

    const results = await this.geocodingService.searchPlaces(search, lat, lon);
    
    return results.map(result => ({
      name: result.name,
      lat: result.lat.toString(),
      lon: result.lng.toString()
    }));
  }
}
