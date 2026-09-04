import { randomUUID } from 'crypto';
import { DashaLevel, Prisma } from '@prisma/client';
import { DashaNode, jdToDate } from './dasha.util';

const LEVEL_BY_DEPTH: DashaLevel[] = ['MAHA', 'ANTAR', 'PRATYANTAR'];

// Flattens the in-memory tree into rows for a single Dasha.createMany call.
// IDs are generated client-side so child rows can reference their parent's
// id without needing a DB round trip per row (a full tree is ~9 Mahadasha +
// ~90 Antardasha + ~800 Pratyantardasha rows).
export function flattenDashaTree(
  nodes: DashaNode[],
  jathakamId: string,
  depth = 0,
  parentId: string | null = null,
): Prisma.DashaCreateManyInput[] {
  const level = LEVEL_BY_DEPTH[depth];
  const rows: Prisma.DashaCreateManyInput[] = [];

  for (const node of nodes) {
    const id = randomUUID();
    rows.push({
      id,
      jathakamId,
      level,
      graha: node.graha,
      startDate: jdToDate(node.startJd),
      endDate: jdToDate(node.endJd),
      parentId: parentId ?? undefined,
    });
    rows.push(...flattenDashaTree(node.children, jathakamId, depth + 1, id));
  }

  return rows;
}
