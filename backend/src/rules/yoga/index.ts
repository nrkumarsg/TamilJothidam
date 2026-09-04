import { YogaRule } from './yoga.types';
import { rajaYoga } from './raja-yoga';
import { dhanaYoga } from './dhana-yoga';
import { gajaKesariYoga } from './gaja-kesari-yoga';
import { budhaAdityaYoga } from './budha-aditya-yoga';
import { neechaBhangaRajaYoga } from './neecha-bhanga-raja-yoga';
import { dharmaKarmaAdhipatiYoga } from './dharma-karma-adhipati-yoga';
import { vipareetaRajaYoga } from './vipareeta-raja-yoga';
import { chandraMangalaYoga } from './chandra-mangala-yoga';

export const ALL_YOGA_RULES: YogaRule[] = [
  rajaYoga,
  dhanaYoga,
  gajaKesariYoga,
  budhaAdityaYoga,
  neechaBhangaRajaYoga,
  dharmaKarmaAdhipatiYoga,
  vipareetaRajaYoga,
  chandraMangalaYoga,
];

export * from './yoga.types';
