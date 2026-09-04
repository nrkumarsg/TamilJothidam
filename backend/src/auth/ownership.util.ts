import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Both helpers 404 (never 403) when a resource exists but belongs to
// someone else — spec §41: never expose one user's birth data to another,
// which includes not confirming the resource exists at all.
export async function assertProfileOwnership(
  prisma: PrismaService,
  profileId: string,
  userId: string,
): Promise<void> {
  const profile = await prisma.birthProfile.findUnique({
    where: { id: profileId },
    select: { userId: true },
  });
  if (!profile || profile.userId !== userId) {
    throw new NotFoundException(`Birth profile ${profileId} not found`);
  }
}

export async function assertJathakamOwnership(
  prisma: PrismaService,
  jathakamId: string,
  userId: string,
): Promise<void> {
  const jathakam = await prisma.jathakam.findUnique({
    where: { id: jathakamId },
    select: { profile: { select: { userId: true } } },
  });
  if (!jathakam || jathakam.profile.userId !== userId) {
    throw new NotFoundException(`Jathakam ${jathakamId} not found`);
  }
}
