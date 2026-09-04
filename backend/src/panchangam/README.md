# panchangam/ — Daily Panchangam Engine (Phase 21)

Computes the "pancha anga" (five limbs of the day) — tithi, vaara, nakshatra,
yoga, karana — plus the inauspicious/auspicious day-segments (Rahu Kalam,
Yamagandam, Gulika, Durmuhurtham, Abhijit Muhurta, Gowri Panchangam / Nalla
Neram) for any date and place.

This module is entirely independent of the birth-chart pipeline: it takes a
calendar date and a location, never a birth profile, and computes a property
of that day at that place — not a property of a person.

## The one rule that shapes everything here

**Every value is computed at sunrise, not midnight.** The Vedic day runs
sunrise-to-sunrise, so the tithi, vaara and all the day-segment windows are
sampled at that instant. A panchangam sampled at local midnight would
disagree with every printed almanac, most visibly on the weekday itself (the
last hour or two before sunrise still belongs to the previous vaara).

## Implementation

- `panchangam-reference.ts` — the fixed classical tables: tithi/paksha/
  vaara/yoga/karana names (bilingual, Tamil first), the Rahu Kalam /
  Yamagandam / Gulika weekday-to-eighth tables, the Durmuhurtham
  weekday-to-muhurta table, and the Gowri Panchangam cycle + per-weekday
  rotation offsets. Every table that has genuine regional variation between
  almanac traditions says so in a comment, and the South Indian / Tamil
  convention is the one followed throughout.
- `panchangam.service.ts` — `compute()`:
  - Finds sunrise/sunset via `EphemerisService.sunriseSunset()` (Swiss
    Ephemeris `rise_trans`), searching from just before local midnight so an
    early sunrise still resolves to the requested calendar day.
  - **Tithi**: `floor(elongation / 12°) + 1`, where elongation is
    Moon-longitude minus Sun-longitude, normalized to 0-360°. The 15th of
    each half gets its own name (Pournami / Amavasai) instead of a numbered
    tithi name.
  - **Karana**: half a tithi (6° slots, 60 per lunar month) — slot 0 is
    Kimstughna, slots 57-59 are the three closing fixed karanas, everything
    else cycles through the seven movable karanas.
  - **Yoga**: 27 divisions of (Sun + Moon) longitude — unrelated to the
    chart yogas of Phase 11 despite the shared word.
  - **Vaara**: read from the sunrise instant's local weekday, not the
    requested date.
  - **Nakshatra**: reuses the same 27-nakshatra lookup as the birth chart
    (`jathakam/names.ts`), applied to the Moon's sidereal longitude at
    sunrise.
  - Rahu Kalam / Yamagandam / Gulika / Gowri Panchangam are each one eighth
    of the sunrise-to-sunset span — genuinely seasonal, not the fixed
    90-minute blocks some sources quote. Durmuhurtham and Abhijit Muhurta
    divide the same span into fifteenths.
  - **Polar day/night**: when the Sun does not both rise and set (high
    latitude, midsummer/midwinter), `sunriseJd`/`sunsetJd` come back `null`,
    every day-segment window is `null`/`[]`, and `polarDayOrNight: true` is
    set. The five angas are still computed — sampled at local apparent noon
    instead of sunrise — so the result degrades gracefully rather than
    erroring.
  - **Varjyam is deliberately NOT computed.** It needs per-nakshatra
    vishaghati fractions plus the exact nakshatra start/end instants, and
    the published fraction tables disagree between almanac traditions.
    Rather than ship a plausible-looking number, it is listed in
    `notComputed` with the reason.
- `panchangam.types.ts` — `PanchangamQuery` (date + lat/lon/timezone) and
  `PanchangamResult`, including `polarDayOrNight` and `notComputed:
  {item, reason}[]` so the API is explicit about what it did and didn't
  compute rather than silently omitting fields.
- `dto/panchangam-query.dto.ts` — validates the date format, lat/lon range,
  and that a timezone string was given (an unrecognized IANA zone is caught
  downstream by Luxon and turned into a 400 naming the zone).
- `GET /panchangam?date=&latitude=&longitude=&timezone=` — **deliberately
  unauthenticated**, unlike every jathakam route: a panchangam is a public
  property of a date and place, involving no birth data, and is exactly the
  kind of lookup a visitor should be able to make before creating an
  account.

## Verified via

- `panchangam.service.spec.ts` (22 tests): real Swiss Ephemeris output
  checked against facts true independently of this code — Amavasai sits at
  lunar conjunction and Pournami at opposition (elongation ~360°/~180°,
  which is what those phases physically *are*); southern-hemisphere daylight
  correctly inverts (Sydney is short in June, long in December, the
  opposite of Chennai); the Rahu Kalam/Yamagandam start times match the
  published Tamil almanac figures for Saturday and Sunday within tolerance;
  Gulika starts exactly at sunrise on Saturday; all eight Gowri qualities
  appear exactly once per day on every weekday; polar midnight sun at
  Longyearbyen produces `polarDayOrNight: true` with nulled windows instead
  of an error; an invalid timezone is rejected with 400 instead of silently
  defaulting to UTC.
- `panchangam.e2e-spec.ts` (5 tests): confirms the endpoint responds with
  **no** `Authorization` header, validates query params (malformed date,
  out-of-range latitude, missing timezone all 400), and exercises the polar
  day/night path over HTTP.
- Manually cross-checked against independent sources during development:
  JavaScript's own `Date`/`Intl` weekday for two consecutive dates agreed
  with `vaara`; Chennai's real published sunrise/sunset (~05:57/~18:16 IST
  in early September) and the resulting Rahu Kalam/Gulika windows matched
  the classical Saturday/Sunday figures quoted in Tamil almanacs.
