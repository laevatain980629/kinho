import { Controller, Get, Query } from '@nestjs/common';
import { GeoService } from './geo.service';

@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Get('reverse')
  async reverse(@Query('latitude') latitude: string, @Query('longitude') longitude: string) {
    return this.geoService.reverseGeocode(Number(latitude), Number(longitude));
  }
}
