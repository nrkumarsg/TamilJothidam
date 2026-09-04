import { Injectable, NotFoundException } from '@nestjs/common';
import { Graha } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EphemerisService } from '../calculation/ephemeris.service';
import { houseFromSign, longitudeToSign } from '../calculation/derivation';
import { BilingualLabel, signName } from '../jathakam/names';
import { isAshtamaShani, isJanmaShani, sadeSatiPhase, SadeSatiPhase } from './transit-flags';

// Grahas analyzed for transit (spec §9: "At minimum analyze: Saturn,
// Jupiter, Rahu, Ketu, Mars").
const TRANSIT_GRAHAS: Exclude<Graha, 'LAGNA' | 'SUN' | 'MOON' | 'MERCURY' | 'VENUS'>[] = [
  'SATURN',
  'JUPITER',
  'RAHU',
  'KETU',
  'MARS',
];

export interface TransitGrahaResult {
  graha: Graha;
  signIndex: number;
  signName: BilingualLabel;
  retrograde: boolean;
  houseFromMoon: number;
  houseFromLagna: number;
}

export interface SadeSatiInfo {
  active: boolean;
  phase: SadeSatiPhase | null;
}

export interface TransitSummary {
  asOfDate: string;
  natalMoonSignIndex: number;
  natalLagnaSignIndex: number;
  transits: TransitGrahaResult[];
  sadeSati: SadeSatiInfo;
  ashtamaShani: boolean;
  janmaShani: boolean;
}

// Gochara / Transit engine (Phase 10, spec §9). Compares CURRENT (or an
// as-of date's) planetary positions against the NATAL chart — clearly
// tagged as "transit" output, never merged into or overriding natal-chart
// data (see docs/ARCHITECTURE.md § Pipeline). Computed live on every
// request, not persisted: unlike the natal chart or Dasha, a transit
// snapshot is stale the moment it's computed, so there is nothing useful
// to cache.
@Injectable()
export class TransitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ephemeris: EphemerisService,
  ) {}

  async getTransits(jathakamId: string, asOf: Date = new Date()): Promise<TransitSummary> {
    const jathakam = await this.prisma.jathakam.findUnique({
      where: { id: jathakamId },
      include: { planets: true },
    });
    if (!jathakam) {
      throw new NotFoundException(`Jathakam ${jathakamId} not found`);
    }

    const moon = jathakam.planets.find((p) => p.graha === 'MOON');
    const lagna = jathakam.planets.find((p) => p.graha === 'LAGNA');
    if (!moon || !lagna) {
      throw new NotFoundException(`Jathakam ${jathakamId} is missing Moon/Lagna data`);
    }

    // asOf is a calendar date; evaluate at UTC noon for stability well away
    // from any day-boundary ambiguity (transit signs change over days for
    // these slow movers, so sub-day precision isn't meaningful here).
    const isoNoon = `${asOf.toISOString().slice(0, 10)}T12:00:00`;
    const jd = this.ephemeris.julianDayUt(isoNoon, 'UTC');

    const transits: TransitGrahaResult[] = TRANSIT_GRAHAS.map((graha) => {
      const { longitude, speedLongitude } = this.ephemeris.siderealLongitudeForGraha(graha, jd);
      const { signIndex } = longitudeToSign(longitude);
      return {
        graha,
        signIndex,
        signName: signName(signIndex),
        retrograde: speedLongitude < 0,
        houseFromMoon: houseFromSign(signIndex, moon.signIndex),
        houseFromLagna: houseFromSign(signIndex, lagna.signIndex),
      };
    });

    const saturn = transits.find((t) => t.graha === 'SATURN')!;

    return {
      asOfDate: asOf.toISOString(),
      natalMoonSignIndex: moon.signIndex,
      natalLagnaSignIndex: lagna.signIndex,
      transits,
      sadeSati: {
        active: sadeSatiPhase(saturn.houseFromMoon) !== null,
        phase: sadeSatiPhase(saturn.houseFromMoon),
      },
      ashtamaShani: isAshtamaShani(saturn.houseFromMoon),
      janmaShani: isJanmaShani(saturn.houseFromMoon),
    };
  }
}
