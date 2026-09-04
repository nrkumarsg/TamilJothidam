import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { CreateBirthProfileDto } from './dto/create-birth-profile.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload.type';

@UseGuards(JwtAuthGuard)
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post()
  create(@Body() dto: CreateBirthProfileDto, @CurrentUser() user: JwtPayload) {
    return this.profilesService.create(dto, user.sub);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.profilesService.findAllForUser(user.sub);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const profile = await this.profilesService.findOne(id);
    // 404 (never 403) for someone else's profile — see auth/ownership.util.ts.
    if (!profile || profile.userId !== user.sub) {
      throw new NotFoundException(`Birth profile ${id} not found`);
    }
    return profile;
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<void> {
    const profile = await this.profilesService.findOne(id);
    if (!profile || profile.userId !== user.sub) {
      throw new NotFoundException(`Birth profile ${id} not found`);
    }
    await this.profilesService.delete(id);
  }
}
