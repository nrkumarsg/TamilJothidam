import { Injectable, NotFoundException } from '@nestjs/common';
import { Dasha, DashaLevel, Graha } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { buildDashaTree } from './dasha.util';
import { flattenDashaTree } from './dasha.flatten';

export interface DashaPeriodDto {
  graha: Graha;
  startDate: string;
  endDate: string;
}

export interface DashaLevelSummary {
  previous: DashaPeriodDto | null;
  current: DashaPeriodDto | null;
  next: DashaPeriodDto | null;
}

export interface DashaSummary {
  asOfDate: string;
  mahadasha: DashaLevelSummary;
  antardasha: DashaLevelSummary;
  pratyantardasha: DashaLevelSummary;
  // Full life timeline at Maha+Antar resolution (spec §8: full period tree
  // for the life-prediction/timeline modules). Pratyantardasha detail is
  // available per-period via findChildren() rather than nested here, to
  // keep this payload a reasonable size (~9 Mahadasha x 9 Antardasha, not
  // x9 again).
  mahadashaList: (DashaPeriodDto & { antardashas: DashaPeriodDto[] })[];
}

function toDto(d: Dasha): DashaPeriodDto {
  return { graha: d.graha, startDate: d.startDate.toISOString(), endDate: d.endDate.toISOString() };
}

// Vimshottari Dasha engine (Phase 9, spec §8). Computes once at jathakam
// creation time from the Moon's nakshatra placement (exact dates only,
// never approximated — see dasha.util.ts) and persists the full
// Maha/Antar/Pratyantar tree; "past/current/next" are then just a cheap
// date-range query over that already-computed, immutable data.
@Injectable()
export class DashaService {
  constructor(private readonly prisma: PrismaService) {}

  async createForJathakam(jathakamId: string): Promise<void> {
    const jathakam = await this.prisma.jathakam.findUniqueOrThrow({
      where: { id: jathakamId },
      include: { planets: true },
    });
    const moon = jathakam.planets.find((p) => p.graha === 'MOON');
    if (!moon) {
      throw new NotFoundException(`Jathakam ${jathakamId} has no Moon position; cannot compute Dasha`);
    }

    const tree = buildDashaTree(moon.nakshatra, moon.longitude, jathakam.julianDay);
    const rows = flattenDashaTree(tree, jathakamId);
    await this.prisma.dasha.createMany({ data: rows });
  }

  async getSummary(jathakamId: string, asOf: Date = new Date()): Promise<DashaSummary> {
    const all = await this.prisma.dasha.findMany({
      where: { jathakamId },
      orderBy: { startDate: 'asc' },
    });
    if (all.length === 0) {
      throw new NotFoundException(`No Dasha data found for jathakam ${jathakamId}`);
    }

    const byLevel = (level: DashaLevel) => all.filter((d) => d.level === level);

    const mahadashas = byLevel('MAHA');
    const mahadashaList = mahadashas.map((m) => ({
      ...toDto(m),
      antardashas: all.filter((d) => d.parentId === m.id).map(toDto),
    }));

    return {
      asOfDate: asOf.toISOString(),
      mahadasha: this.levelSummary(mahadashas, asOf),
      antardasha: this.levelSummary(byLevel('ANTAR'), asOf),
      pratyantardasha: this.levelSummary(byLevel('PRATYANTAR'), asOf),
      mahadashaList,
    };
  }

  // periods within a level are contiguous and sorted (each ends exactly
  // where the next starts), so the "current or most recent" period is
  // simply the last one whose start is <= asOf.
  private levelSummary(periods: Dasha[], asOf: Date): DashaLevelSummary {
    let idx = -1;
    for (let i = 0; i < periods.length; i++) {
      if (periods[i].startDate <= asOf) idx = i;
      else break;
    }

    if (idx === -1) {
      // asOf is before the very first period (shouldn't normally happen,
      // since the first period starts at birth).
      return { previous: null, current: null, next: periods[0] ? toDto(periods[0]) : null };
    }

    const candidate = periods[idx];
    const isCurrent = asOf < candidate.endDate;

    if (isCurrent) {
      return {
        previous: idx > 0 ? toDto(periods[idx - 1]) : null,
        current: toDto(candidate),
        next: idx + 1 < periods.length ? toDto(periods[idx + 1]) : null,
      };
    }
    // asOf is beyond the last generated period's coverage.
    return { previous: toDto(candidate), current: null, next: null };
  }
}
