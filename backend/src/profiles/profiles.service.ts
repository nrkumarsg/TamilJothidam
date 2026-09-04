import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBirthProfileDto } from './dto/create-birth-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBirthProfileDto, userId: string) {
    return this.prisma.birthProfile.create({
      data: {
        userId,
        name: dto.name,
        gender: dto.gender,
        dateOfBirth: new Date(dto.dateOfBirth),
        timeOfBirth: dto.timeOfBirth,
        timeAccuracy: dto.timeAccuracy,
        birthLocation: {
          create: {
            placeName: dto.location.placeName,
            country: dto.location.country,
            latitude: dto.location.latitude,
            longitude: dto.location.longitude,
            timezone: dto.location.timezone,
            utcOffsetMinutes: dto.location.utcOffsetMinutes,
            dstApplicable: dto.location.dstApplicable ?? false,
            manuallyCorrected: dto.location.manuallyCorrected ?? false,
          },
        },
      },
      include: { birthLocation: true },
    });
  }

  async findAllForUser(userId: string) {
    return this.prisma.birthProfile.findMany({
      where: { userId },
      include: { birthLocation: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.birthProfile.findUnique({
      where: { id },
      include: { birthLocation: true },
    });
  }

  // Cascades to the profile's Jathakam and everything under it (spec §41
  // "Report deletion") — see schema.prisma's onDelete: Cascade chain.
  async delete(id: string): Promise<void> {
    await this.prisma.birthProfile.delete({ where: { id } });
  }
}
