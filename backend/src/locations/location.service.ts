import { Injectable, InternalServerErrorException } from '@nestjs/common';
import tzLookup from 'tz-lookup';
import { DateTime } from 'luxon';

export interface PlaceCandidate {
  placeName: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface ResolvedTimezone {
  timezone: string;
  utcOffsetMinutes: number;
  dstApplicable: boolean;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: { country?: string };
}

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';

// Default geocoding provider (spec §2: "search for a city/place" +
// auto-determine lat/lng/timezone/DST). Free, no API key. Swappable later
// via GEOCODING_PROVIDER/GEOCODING_API_KEY (see .env.example) behind the
// same searchPlaces() signature without touching callers.
@Injectable()
export class LocationService {
  async searchPlaces(query: string): Promise<PlaceCandidate[]> {
    const url = new URL(NOMINATIM_SEARCH_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '5');

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          // Required by Nominatim's usage policy: an identifiable User-Agent.
          'User-Agent': 'TamilJathakamApp/0.1 (astrology birth-place lookup)',
        },
      });
    } catch (err) {
      throw new InternalServerErrorException('Location search is temporarily unavailable');
    }

    if (!response.ok) {
      throw new InternalServerErrorException(`Location search failed with status ${response.status}`);
    }

    const results = (await response.json()) as NominatimResult[];

    return results.map((r) => ({
      placeName: r.display_name,
      country: r.address?.country ?? '',
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lon),
    }));
  }

  // Pure offline lookup: tz-lookup resolves the IANA zone id from
  // coordinates; luxon then computes the UTC offset/DST status for the
  // *specific local date+time given* (not "now") — DST rules have changed
  // historically in many countries, so this must be date-aware.
  resolveTimezone(latitude: number, longitude: number, localDateTime: string): ResolvedTimezone {
    const timezone: string = tzLookup(latitude, longitude);
    const dt = DateTime.fromISO(localDateTime, { zone: timezone });

    if (!dt.isValid) {
      throw new InternalServerErrorException(
        `Could not resolve local date/time "${localDateTime}" in zone ${timezone}: ${dt.invalidReason}`,
      );
    }

    return {
      timezone,
      utcOffsetMinutes: dt.offset,
      dstApplicable: dt.isInDST,
    };
  }
}
