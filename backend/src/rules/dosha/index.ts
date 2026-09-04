import { DoshaRule } from './dosha.types';
import { sevvaiDosham } from './sevvai-dosham';
import { kalaSarpaDosha } from './kala-sarpa-dosha';
import { pitruDosha } from './pitru-dosha';
import { grahanaDosha } from './grahana-dosha';

export const ALL_DOSHA_RULES: DoshaRule[] = [sevvaiDosham, kalaSarpaDosha, pitruDosha, grahanaDosha];

export * from './dosha.types';
