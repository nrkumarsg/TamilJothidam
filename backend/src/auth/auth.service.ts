import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './jwt-payload.type';
import { GoogleProfile } from './google-auth.service';
import { EmailService } from './email.service';

const SALT_ROUNDS = 10;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export interface AuthResult {
  accessToken: string;
  user: { id: string; email: string; role: User['role']; plan: User['plan'] };
}

// Real authentication (Phase 17, spec §41), replacing the dev-user
// stand-in every profile/jathakam-scoped service used before this phase
// (see profiles.service.ts's now-deleted getOrCreateDevUser). Deliberately
// hand-rolled rather than Passport.js — one email/password strategy and a
// JWT issuance step don't need the strategy-abstraction machinery Passport
// provides, matching this project's "raw fetch over SDK" precedent
// (AnthropicProvider) for keeping dependencies to what's actually used.
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly email: EmailService,
  ) {}

  async register(email: string, password: string): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException(`An account with email "${email}" already exists`);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await this.prisma.user.create({ data: { email, passwordHash } });
    return this.buildAuthResult(user);
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Same error for "no such user", "wrong password", and "this account
    // was created via Google sign-in and has no password at all" — never
    // reveal which one it was.
    if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.buildAuthResult(user);
  }

  // Finds the account by googleId if this browser has signed in with this
  // Google account before; otherwise links to an existing local account
  // sharing the same (Google-verified) email, or creates a brand new
  // account with no password at all.
  async loginWithGoogle(profile: GoogleProfile): Promise<AuthResult> {
    let user = await this.prisma.user.findUnique({ where: { googleId: profile.googleId } });
    if (!user) {
      const existingByEmail = await this.prisma.user.findUnique({ where: { email: profile.email } });
      user = existingByEmail
        ? await this.prisma.user.update({ where: { id: existingByEmail.id }, data: { googleId: profile.googleId } })
        : await this.prisma.user.create({ data: { email: profile.email, googleId: profile.googleId } });
    }
    return this.buildAuthResult(user);
  }

  // Always resolves — never reveals whether the email belongs to an
  // account (same "one answer either way" principle as login()'s shared
  // error message). A Google-only account (no passwordHash) still gets a
  // token here deliberately: resetting sets a password, letting that
  // account additionally sign in with email/password from then on, which
  // is a reasonable recovery path rather than a dead end.
  async forgotPassword(email: string, language: 'ta' | 'en' = 'ta'): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return;

    const rawToken = crypto.randomBytes(32).toString('hex');
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;
    await this.email.sendPasswordResetEmail(user.email, resetLink, language);
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('This password reset link is invalid or has expired');
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);
  }

  async deleteAccount(userId: string): Promise<void> {
    // Cascades through BirthProfile -> Jathakam -> every downstream table
    // (Planet, House, Dasha, Yoga, Dosha, Prediction, Report, Remedy — all
    // `onDelete: Cascade` in schema.prisma), satisfying spec §41's "User
    // deletion" and "Report deletion" in one operation.
    await this.prisma.user.delete({ where: { id: userId } });
  }

  private buildAuthResult(user: User): AuthResult {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwt.sign(payload),
      user: { id: user.id, email: user.email, role: user.role, plan: user.plan },
    };
  }
}
