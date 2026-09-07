import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Post, Query, Redirect, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleAuthService } from './google-auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { JwtPayload } from './jwt-payload.type';
import { PrismaService } from '../prisma/prisma.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password);
  }

  @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  // Always 200 with the same generic body regardless of whether the email
  // exists — see AuthService.forgotPassword's comment.
  @HttpCode(200)
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email, dto.language);
    return { message: 'If that email is registered, a reset link has been sent.' };
  }

  @HttpCode(200)
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Password updated.' };
  }

  // GET, not POST — this is a full-page browser redirect to Google's
  // consent screen, not an API call the frontend fetches.
  @Get('google')
  @Redirect()
  googleRedirect() {
    return { url: this.googleAuthService.buildAuthUrl() };
  }

  // Google redirects the browser here with ?code=. No CSRF `state` check
  // is implemented (documented simplification, see auth/README.md) — the
  // redirect_uri is registered with Google ahead of time, which is the
  // primary defense; a stricter deployment should add a signed `state`
  // round-tripped through the initial redirect.
  @Get('google/callback')
  @Redirect()
  async googleCallback(@Query('code') code?: string, @Query('error') error?: string) {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    if (error || !code) {
      return { url: `${frontendUrl}/login?error=google_oauth_failed` };
    }
    try {
      const profile = await this.googleAuthService.exchangeCodeForProfile(code);
      const result = await this.authService.loginWithGoogle(profile);
      return { url: `${frontendUrl}/auth/callback?token=${encodeURIComponent(result.accessToken)}` };
    } catch {
      return { url: `${frontendUrl}/login?error=google_oauth_failed` };
    }
  }

  // Re-reads the current role/plan from the database rather than trusting
  // the JWT payload's claims — same reasoning as AdminGuard (Phase 18):
  // a stale claim would hide a just-granted admin promotion (or a
  // just-revoked one) from the frontend until the user logs in again.
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: JwtPayload) {
    const current = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { id: true, email: true, role: true, plan: true },
    });
    if (!current) throw new NotFoundException('Account no longer exists');
    return current;
  }

  // spec §41: "User deletion" — cascades to every profile/jathakam/report
  // this account owns. Irreversible; no confirmation flow beyond "you must
  // already hold a valid token for this account" (no re-auth/password
  // re-entry step — documented simplification, not a full "type DELETE to
  // confirm" UX).
  @UseGuards(JwtAuthGuard)
  @Delete('me')
  @HttpCode(204)
  async deleteMe(@CurrentUser() user: JwtPayload): Promise<void> {
    await this.authService.deleteAccount(user.sub);
  }
}
