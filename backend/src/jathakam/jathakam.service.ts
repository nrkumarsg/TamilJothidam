import { Injectable, NotFoundException } from '@nestjs/common';
import { Graha, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CalculationService } from '../calculation/calculation.service';
import { SIGN_LORDS } from '../calculation/reference-data';
import { GrahaResult } from '../calculation/calculation.types';
import { BilingualLabel, nakshatraName, signName } from './names';
import { navamsaCalculator } from './divisional-charts';
import { HOUSE_SIGNIFICATIONS, aspectedHouses, isNaturalBenefic, isNaturalMalefic } from './house-analysis';
import { DashaService } from '../dasha/dasha.service';
import { ALL_YOGA_RULES, YogaChartInput } from '../rules/yoga';
import { yogaDescription } from '../rules/yoga/yoga-names';
import { ALL_DOSHA_RULES, DoshaChartInput } from '../rules/dosha';
import { doshaDescription } from '../rules/dosha/dosha-names';

type JathakamWithRelations = Prisma.JathakamGetPayload<{
  include: {
    planets: true;
    houses: true;
    calculationSetting: true;
    divisionalCharts: true;
    yogas: true;
    doshas: true;
  };
}>;

interface NamedPlanet extends Prisma.PlanetGetPayload<Record<string, never>> {
  signName: BilingualLabel;
  nakshatraName: BilingualLabel;
  aspectsHouses: number[]; // spec §6: "எந்த பாவங்களை பார்வை செய்கிறது?"
}

interface NamedHouse extends Prisma.HouseGetPayload<Record<string, never>> {
  signName: BilingualLabel;
}

// House analysis (spec §7, items 1 and 4-7 — item 8 "வாழ்க்கையில் தாக்கம்" is
// AI-generated prose, Phase 13, not built here).
export interface HouseAnalysisEntry {
  houseNo: number;
  signIndex: number;
  signName: BilingualLabel;
  signification: BilingualLabel;
  lord: Graha;
  lordHouse: number;
  occupants: Graha[];
  conjunction: boolean;
  aspectingGrahas: Graha[];
  beneficInfluences: Graha[];
  maleficInfluences: Graha[];
  strengthScore: number | null; // simplified proxy = the house lord's strengthScore
}

// Persisted shape of a D9 DivisionalChart row's `data` JSON — kept minimal
// (just sign placements) since navamsa house lordship isn't needed until a
// later phase actually interprets it; re-derived into full houses below.
interface NavamsaChartData {
  lagnaSignIndex: number;
  planets: { graha: Graha; signIndex: number }[];
}

interface NavamsaHouseSummary {
  houseNo: number;
  signIndex: number;
  occupants: Graha[];
  signName: BilingualLabel;
}

export interface NavamsaSummary {
  lagnaSignIndex: number;
  lagnaSignName: BilingualLabel;
  houses: NavamsaHouseSummary[];
}

interface NamedYoga extends Prisma.YogaGetPayload<Record<string, never>> {
  description: BilingualLabel | null;
}

interface NamedDosha extends Prisma.DoshaGetPayload<Record<string, never>> {
  description: BilingualLabel | null;
}

export interface JathakamSummary {
  id: string;
  profileId: string;
  julianDay: number;
  ayanamsa: string;
  engineVersion: string;
  createdAt: Date;
  lagna: NamedPlanet | null;
  rasi: NamedPlanet | null; // "ராசி" = Chandra Rasi (Moon sign), the common Tamil usage
  planets: NamedPlanet[];
  houses: NamedHouse[];
  navamsa: NavamsaSummary | null;
  houseAnalysis: HouseAnalysisEntry[];
  yogas: NamedYoga[];
  doshas: NamedDosha[];
}

const JATHAKAM_INCLUDE = {
  planets: true,
  houses: true,
  calculationSetting: true,
  divisionalCharts: true,
  yogas: true,
  doshas: true,
} as const;

// Jathakam Engine (Phase 5): assembles + persists a chart from
// CalculationService's pure output, and computes bhava (house) lordships.
// This is where the pipeline's deterministic output first gets written to
// the database — see docs/ARCHITECTURE.md § Pipeline.
@Injectable()
export class JathakamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculationService: CalculationService,
    private readonly dashaService: DashaService,
  ) {}

  async create(profileId: string): Promise<JathakamSummary> {
    const profile = await this.prisma.birthProfile.findUnique({
      where: { id: profileId },
      include: { birthLocation: true },
    });
    if (!profile || !profile.birthLocation) {
      throw new NotFoundException(`Birth profile ${profileId} (with location) not found`);
    }

    const dateOfBirth = profile.dateOfBirth.toISOString().slice(0, 10);
    const result = this.calculationService.computeChart({
      dateOfBirth,
      timeOfBirth: profile.timeOfBirth,
      timezone: profile.birthLocation.timezone,
      latitude: profile.birthLocation.latitude,
      longitude: profile.birthLocation.longitude,
    });

    const calculationSetting = await this.prisma.calculationSetting.upsert({
      where: { ayanamsa_engineVersion: { ayanamsa: 'LAHIRI', engineVersion: result.engineVersion } },
      create: { ayanamsa: 'LAHIRI', engineVersion: result.engineVersion },
      update: {},
    });

    const allGrahas: GrahaResult[] = [result.lagna, ...result.planets];

    const navamsaData: NavamsaChartData = this.buildNavamsaChartData(allGrahas);
    const housesData = this.buildHouses(result.lagna.signIndex, result.planets);
    const detectedYogas = this.detectYogas(allGrahas, housesData);
    const detectedDoshas = this.detectDoshas(allGrahas, housesData);

    const jathakam = await this.prisma.jathakam.create({
      data: {
        profileId: profile.id,
        calculationSettingId: calculationSetting.id,
        julianDay: result.julianDayUt,
        chartData: result as unknown as Prisma.InputJsonValue,
        planets: {
          create: allGrahas.map((g) => ({
            graha: g.graha,
            longitude: g.longitude,
            signIndex: g.signIndex,
            degreeInSign: g.degreeInSign,
            nakshatra: g.nakshatra,
            pada: g.pada,
            house: g.house,
            retrograde: g.retrograde,
            combust: g.combust,
            dignity: g.dignity ?? undefined,
            strengthScore: g.strengthScore ?? undefined,
          })),
        },
        houses: { create: housesData },
        divisionalCharts: {
          create: [{ chartType: 'D9', data: navamsaData as unknown as Prisma.InputJsonValue }],
        },
        yogas: {
          create: detectedYogas.map((y) => ({
            name: y.name,
            strength: y.strength,
            participatingPlanets: y.participatingPlanets,
            participatingHouses: y.participatingHouses,
            interpretationKey: y.interpretationKey,
          })),
        },
        doshas: {
          create: detectedDoshas.map((d) => ({
            name: d.name,
            severity: d.severity,
            ruleTriggered: d.ruleTriggered,
          })),
        },
      },
      include: JATHAKAM_INCLUDE,
    });

    // Vimshottari Dasha (Phase 9) is computed and persisted once here, from
    // the just-created Moon placement — see dasha/dasha.service.ts.
    await this.dashaService.createForJathakam(jathakam.id);

    return this.toSummary(jathakam);
  }

  async findOne(id: string): Promise<JathakamSummary> {
    const jathakam = await this.prisma.jathakam.findUnique({ where: { id }, include: JATHAKAM_INCLUDE });
    if (!jathakam) throw new NotFoundException(`Jathakam ${id} not found`);
    return this.toSummary(jathakam);
  }

  async findForProfile(profileId: string): Promise<JathakamSummary[]> {
    const jathakams = await this.prisma.jathakam.findMany({
      where: { profileId },
      include: JATHAKAM_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return jathakams.map((j) => this.toSummary(j));
  }

  // Bhava lordship (spec §7: "அதிபதி எங்கு இருக்கிறார்?"): for each of the 12
  // whole-sign houses, its sign, that sign's lord, which house the lord
  // itself currently occupies, and which grahas sit in the house.
  private buildHouses(lagnaSignIndex: number, planets: GrahaResult[]) {
    const houseOfGraha = new Map<Graha, number>();
    for (const p of planets) houseOfGraha.set(p.graha, p.house);

    return Array.from({ length: 12 }, (_, i) => {
      const houseNo = i + 1;
      const signIndex = (lagnaSignIndex + i) % 12;
      const lord = SIGN_LORDS[signIndex];
      // Sign lords are always among the 7 classical grahas, all of which
      // are always present in `planets`, so this lookup never misses.
      const lordHouse = houseOfGraha.get(lord)!;
      const occupants = planets.filter((p) => p.house === houseNo).map((p) => p.graha);
      return { houseNo, signIndex, lord, lordHouse, occupants };
    });
  }

  // Yoga engine (Phase 11): runs every rule in rules/yoga against the
  // already-computed chart — no new astronomical calculation, just
  // classical combination detection over the Planet/House data built above.
  private detectYogas(allGrahas: GrahaResult[], housesData: ReturnType<JathakamService['buildHouses']>) {
    const chartInput: YogaChartInput = {
      planets: allGrahas.map((g) => ({
        graha: g.graha,
        signIndex: g.signIndex,
        house: g.house,
        dignity: g.dignity,
      })),
      houses: housesData.map((h) => ({
        houseNo: h.houseNo,
        signIndex: h.signIndex,
        lord: h.lord,
        lordHouse: h.lordHouse,
      })),
    };
    return ALL_YOGA_RULES.map((rule) => rule.evaluate(chartInput)).filter((r) => r !== null);
  }

  // Dosha engine (Phase 12): same rule-based pattern as detectYogas above.
  private detectDoshas(allGrahas: GrahaResult[], housesData: ReturnType<JathakamService['buildHouses']>) {
    const chartInput: DoshaChartInput = {
      planets: allGrahas
        .filter((g) => g.graha !== 'LAGNA')
        .map((g) => ({
          graha: g.graha,
          longitude: g.longitude,
          signIndex: g.signIndex,
          house: g.house,
        })),
      houses: housesData.map((h) => ({
        houseNo: h.houseNo,
        lord: h.lord,
        lordHouse: h.lordHouse,
      })),
    };
    return ALL_DOSHA_RULES.map((rule) => rule.evaluate(chartInput)).filter((r) => r !== null);
  }

  // Navamsa (D9, spec §4): sign placement only — Lagna's navamsa sign
  // becomes the D9 chart's house 1, same whole-sign counting as the D1
  // chart's buildHouses, just applied to navamsa sign indices.
  private buildNavamsaChartData(allGrahas: GrahaResult[]): NavamsaChartData {
    const navamsaPositions = allGrahas.map((g) => ({
      graha: g.graha,
      signIndex: navamsaCalculator.computeSignIndex(g.signIndex, g.degreeInSign),
    }));
    const lagna = navamsaPositions.find((g) => g.graha === 'LAGNA')!;
    return {
      lagnaSignIndex: lagna.signIndex,
      planets: navamsaPositions.filter((g) => g.graha !== 'LAGNA'),
    };
  }

  private buildNavamsaHouses(data: NavamsaChartData): NavamsaHouseSummary[] {
    return Array.from({ length: 12 }, (_, i) => {
      const houseNo = i + 1;
      const signIndex = (data.lagnaSignIndex + i) % 12;
      const occupants = data.planets.filter((g) => g.signIndex === signIndex).map((g) => g.graha);
      return { houseNo, signIndex, occupants, signName: signName(signIndex) };
    });
  }

  // House analysis (spec §7 items 1, 4-7): combines already-computed
  // Planet/House rows with the classical reference tables in
  // house-analysis.ts — no new astronomical calculation, just derivation.
  private buildHouseAnalysis(
    houses: Prisma.HouseGetPayload<Record<string, never>>[],
    planets: Prisma.PlanetGetPayload<Record<string, never>>[],
  ): HouseAnalysisEntry[] {
    const strengthByGraha = new Map<Graha, number | null>();
    for (const p of planets) strengthByGraha.set(p.graha, p.strengthScore);

    // Which grahas aspect each house, derived from every graha's own house
    // placement (excluding Lagna, which doesn't cast drishti).
    const aspectingByHouse = new Map<number, Graha[]>();
    for (const p of planets) {
      if (p.graha === 'LAGNA') continue;
      for (const targetHouse of aspectedHouses(p.graha, p.house)) {
        aspectingByHouse.set(targetHouse, [...(aspectingByHouse.get(targetHouse) ?? []), p.graha]);
      }
    }

    return [...houses]
      .sort((a, b) => a.houseNo - b.houseNo)
      .map((h) => {
        const aspectingGrahas = aspectingByHouse.get(h.houseNo) ?? [];
        const influencers = [...h.occupants, ...aspectingGrahas];
        return {
          houseNo: h.houseNo,
          signIndex: h.signIndex,
          signName: signName(h.signIndex),
          signification: HOUSE_SIGNIFICATIONS[h.houseNo - 1],
          lord: h.lord,
          lordHouse: h.lordHouse,
          occupants: h.occupants,
          conjunction: h.occupants.length >= 2,
          aspectingGrahas,
          beneficInfluences: influencers.filter(isNaturalBenefic),
          maleficInfluences: influencers.filter(isNaturalMalefic),
          strengthScore: strengthByGraha.get(h.lord) ?? null,
        };
      });
  }

  private toSummary(jathakam: JathakamWithRelations): JathakamSummary {
    const withNames = (row: Prisma.PlanetGetPayload<Record<string, never>>): NamedPlanet => ({
      ...row,
      signName: signName(row.signIndex),
      nakshatraName: nakshatraName(row.nakshatra),
      aspectsHouses: aspectedHouses(row.graha, row.house),
    });

    const lagnaRow = jathakam.planets.find((p) => p.graha === 'LAGNA');
    const moonRow = jathakam.planets.find((p) => p.graha === 'MOON');

    const d9Row = jathakam.divisionalCharts.find((d) => d.chartType === 'D9');
    let navamsa: NavamsaSummary | null = null;
    if (d9Row) {
      const data = d9Row.data as unknown as NavamsaChartData;
      navamsa = {
        lagnaSignIndex: data.lagnaSignIndex,
        lagnaSignName: signName(data.lagnaSignIndex),
        houses: this.buildNavamsaHouses(data),
      };
    }

    return {
      id: jathakam.id,
      profileId: jathakam.profileId,
      julianDay: jathakam.julianDay,
      ayanamsa: jathakam.calculationSetting.ayanamsa,
      engineVersion: jathakam.calculationSetting.engineVersion,
      createdAt: jathakam.createdAt,
      lagna: lagnaRow ? withNames(lagnaRow) : null,
      rasi: moonRow ? withNames(moonRow) : null,
      planets: jathakam.planets.map(withNames),
      houses: [...jathakam.houses]
        .sort((a, b) => a.houseNo - b.houseNo)
        .map((h) => ({ ...h, signName: signName(h.signIndex) })),
      navamsa,
      houseAnalysis: this.buildHouseAnalysis(jathakam.houses, jathakam.planets),
      yogas: jathakam.yogas.map((y) => ({ ...y, description: yogaDescription(y.name) })),
      doshas: jathakam.doshas.map((d) => ({ ...d, description: doshaDescription(d.name) })),
    };
  }
}
