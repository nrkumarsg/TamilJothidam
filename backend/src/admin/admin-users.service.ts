import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

type SafeUser = Omit<User, 'passwordHash' | 'googleId'> & { hasGoogleAccount: boolean };

// Spec §35 "Manage users". Never returns passwordHash — select it out
// explicitly rather than trusting callers to strip it, so a future field
// added to User can't accidentally leak the same way. googleId itself
// isn't secret (just a linking id, not a credential) but there's no
// reason to expose the raw value either — a boolean is all an admin needs.
const SAFE_USER_SELECT = {
  id: true,
  email: true,
  role: true,
  plan: true,
  googleId: true,
  createdAt: true,
  updatedAt: true,
} as const;

function toSafeUser(user: {
  id: string;
  email: string;
  role: User['role'];
  plan: User['plan'];
  googleId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): SafeUser {
  const { googleId, ...rest } = user;
  return { ...rest, hasGoogleAccount: googleId !== null };
}

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<SafeUser[]> {
    const users = await this.prisma.user.findMany({ select: SAFE_USER_SELECT, orderBy: { createdAt: 'desc' } });
    return users.map(toSafeUser);
  }

  async findOne(id: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: SAFE_USER_SELECT });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return toSafeUser(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<SafeUser> {
    await this.findOne(id); // 404s cleanly instead of a Prisma "record not found" on update
    const user = await this.prisma.user.update({ where: { id }, data: dto, select: SAFE_USER_SELECT });
    return toSafeUser(user);
  }

  // Admin-initiated version of spec §41 "User deletion" — same cascade as
  // the self-service DELETE /auth/me (auth.service.ts).
  async delete(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
  }
}
