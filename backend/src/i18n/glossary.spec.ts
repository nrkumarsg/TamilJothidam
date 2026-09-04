import { Graha } from '@prisma/client';
import {
  CORE_TERMS,
  CoreTermKey,
  DEFAULT_LOCALE,
  GRAHA_NAMES,
  REPORT_SECTIONS,
  SUPPORTED_LOCALES,
  coreTerm,
  grahaName,
  reportSectionById,
  reportSectionBySlug,
} from './glossary';

describe('glossary', () => {
  it('defaults to Tamil, with English also supported (spec §26/§27)', () => {
    expect(DEFAULT_LOCALE).toBe('ta');
    expect(SUPPORTED_LOCALES).toEqual(['ta', 'en']);
  });

  describe('GRAHA_NAMES', () => {
    // The Graha enum (prisma/schema.prisma) is the source of truth for which
    // grahas exist — every value must have a full-name translation, not just
    // the ones convenient to remember.
    const allGrahas: Graha[] = ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN', 'RAHU', 'KETU', 'LAGNA'];

    it('has a non-empty ta/en pair for every Graha enum value', () => {
      expect(Object.keys(GRAHA_NAMES).sort()).toEqual([...allGrahas].sort());
      for (const graha of allGrahas) {
        expect(GRAHA_NAMES[graha].ta.length).toBeGreaterThan(0);
        expect(GRAHA_NAMES[graha].en.length).toBeGreaterThan(0);
      }
    });

    it('grahaName() returns the correct pair, e.g. Saturn', () => {
      expect(grahaName('SATURN')).toEqual({ ta: 'சனி', en: 'Saturn' });
    });
  });

  describe('CORE_TERMS', () => {
    // Every term spec §26 explicitly lists as required Tamil vocabulary.
    const expectedKeys: CoreTermKey[] = [
      'jathakam', 'lagna', 'rasi', 'nakshatra', 'pada', 'bhava', 'bhavaAdhipati',
      'dasha', 'bukti', 'gochara', 'yogam', 'dosham', 'pariharam', 'selvam',
      'thozhil', 'thirumanam', 'kudumbam', 'udalnalam', 'kalvi', 'sothu',
    ];

    it('covers exactly the spec §26 term list, each with non-empty ta/en', () => {
      expect(Object.keys(CORE_TERMS).sort()).toEqual([...expectedKeys].sort());
      for (const key of expectedKeys) {
        expect(CORE_TERMS[key].ta.length).toBeGreaterThan(0);
        expect(CORE_TERMS[key].en.length).toBeGreaterThan(0);
      }
    });

    it('coreTerm() returns the exact spec §26 Tamil word, e.g. bhavaAdhipati', () => {
      expect(coreTerm('bhavaAdhipati').ta).toBe('பாவாதிபதி');
      expect(coreTerm('gochara').ta).toBe('கோச்சாரம்');
    });
  });

  describe('REPORT_SECTIONS', () => {
    it('has exactly 34 sections, numbered 1-34 in order (spec §28)', () => {
      expect(REPORT_SECTIONS).toHaveLength(34);
      REPORT_SECTIONS.forEach((section, index) => {
        expect(section.id).toBe(index + 1);
      });
    });

    it('has non-empty ta/en and a unique slug for every section', () => {
      const slugs = new Set<string>();
      for (const section of REPORT_SECTIONS) {
        expect(section.ta.length).toBeGreaterThan(0);
        expect(section.en.length).toBeGreaterThan(0);
        expect(slugs.has(section.slug)).toBe(false);
        slugs.add(section.slug);
      }
      expect(slugs.size).toBe(34);
    });

    it('matches spec §28 wording exactly for the first, a middle, and the last section', () => {
      expect(reportSectionById(1)).toMatchObject({ slug: 'summary', ta: 'ஜாதகத்தின் சுருக்கம்' });
      expect(reportSectionById(28)).toMatchObject({ slug: 'favorable_periods', ta: 'சாதகமான காலங்கள்' });
      expect(reportSectionById(34)).toMatchObject({ slug: 'final_summary', ta: 'இறுதி சுருக்கம்' });
    });

    it('reportSectionBySlug() finds a section by its machine-readable slug', () => {
      expect(reportSectionBySlug('vimshottari_dasha')).toMatchObject({ id: 11, en: 'Vimshottari Dasha' });
    });

    it('returns undefined for an id/slug that does not exist', () => {
      expect(reportSectionById(0)).toBeUndefined();
      expect(reportSectionById(35)).toBeUndefined();
      expect(reportSectionBySlug('not_a_real_section')).toBeUndefined();
    });
  });
});
