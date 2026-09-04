import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { LocationService } from './location.service';

@Controller('locations')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  // GET /locations/search?q=Chennai
  @Get('search')
  search(@Query('q') q?: string) {
    if (!q || q.trim().length < 2) {
      throw new BadRequestException('Query parameter "q" must be at least 2 characters');
    }
    return this.locationService.searchPlaces(q.trim());
  }

  // GET /locations/timezone?latitude=13.08&longitude=80.27&localDateTime=1990-01-15T08:30:00
  @Get('timezone')
  timezone(
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
    @Query('localDateTime') localDateTime?: string,
  ) {
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!latitude || !longitude || Number.isNaN(lat) || Number.isNaN(lng)) {
      throw new BadRequestException('Valid "latitude" and "longitude" query params are required');
    }
    if (!localDateTime) {
      throw new BadRequestException(
        '"localDateTime" query param is required (ISO local date-time, e.g. 1990-01-15T08:30:00)',
      );
    }

    return this.locationService.resolveTimezone(lat, lng, localDateTime);
  }
}
