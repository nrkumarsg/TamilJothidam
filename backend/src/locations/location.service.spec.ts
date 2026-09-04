import { LocationService } from './location.service';

describe('LocationService.resolveTimezone', () => {
  const service = new LocationService();

  it('resolves Chennai, India to Asia/Kolkata with a fixed +330 offset (no DST)', () => {
    const result = service.resolveTimezone(13.0827, 80.2707, '1990-01-15T08:30:00');
    expect(result.timezone).toBe('Asia/Kolkata');
    expect(result.utcOffsetMinutes).toBe(330);
    expect(result.dstApplicable).toBe(false);
  });

  it('is date-aware: New York offset differs between January (standard) and July (DST)', () => {
    const january = service.resolveTimezone(40.7128, -74.006, '2024-01-15T08:30:00');
    const july = service.resolveTimezone(40.7128, -74.006, '2024-07-15T08:30:00');

    expect(january.timezone).toBe('America/New_York');
    expect(january.utcOffsetMinutes).toBe(-300); // EST, UTC-5
    expect(january.dstApplicable).toBe(false);

    expect(july.utcOffsetMinutes).toBe(-240); // EDT, UTC-4
    expect(july.dstApplicable).toBe(true);
  });

  it('throws a clear error for an invalid local date/time', () => {
    expect(() => service.resolveTimezone(13.0827, 80.2707, 'not-a-date')).toThrow();
  });
});
