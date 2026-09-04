import { PrismaClient } from '@prisma/client';

// Exercises the schema end-to-end against a live Postgres instance
// (DATABASE_URL). Requires local dev DB — see docs/ARCHITECTURE.md.
describe('Database schema (integration)', () => {
  const prisma = new PrismaClient();
  const testEmail = `phase2-test-${Date.now()}@example.invalid`;

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.$disconnect();
  });

  it('creates a user -> birth profile -> location -> jathakam -> planet chain', async () => {
    const user = await prisma.user.create({
      data: { email: testEmail, passwordHash: 'not-a-real-hash' },
    });

    const setting = await prisma.calculationSetting.upsert({
      where: { ayanamsa_engineVersion: { ayanamsa: 'LAHIRI', engineVersion: 'test-0.1' } },
      create: { ayanamsa: 'LAHIRI', engineVersion: 'test-0.1' },
      update: {},
    });

    const profile = await prisma.birthProfile.create({
      data: {
        userId: user.id,
        name: 'Test Profile',
        gender: 'MALE',
        dateOfBirth: new Date('1990-01-15'),
        timeOfBirth: '08:30:00',
        timeAccuracy: 'EXACT',
        birthLocation: {
          create: {
            placeName: 'Chennai',
            country: 'India',
            latitude: 13.0827,
            longitude: 80.2707,
            timezone: 'Asia/Kolkata',
            utcOffsetMinutes: 330,
          },
        },
      },
      include: { birthLocation: true },
    });

    expect(profile.birthLocation?.placeName).toBe('Chennai');

    const jathakam = await prisma.jathakam.create({
      data: {
        profileId: profile.id,
        calculationSettingId: setting.id,
        julianDay: 2447906.854167,
        chartData: { placeholder: true },
        planets: {
          create: [
            {
              graha: 'SUN',
              longitude: 274.5,
              signIndex: 9,
              degreeInSign: 4.5,
              nakshatra: 22,
              pada: 2,
              house: 10,
              dignity: 'NEUTRAL',
            },
          ],
        },
      },
      include: { planets: true },
    });

    expect(jathakam.planets).toHaveLength(1);
    expect(jathakam.planets[0].graha).toBe('SUN');

    const found = await prisma.user.findUnique({
      where: { id: user.id },
      include: { birthProfiles: { include: { jathakams: true } } },
    });

    expect(found?.birthProfiles).toHaveLength(1);
    expect(found?.birthProfiles[0].jathakams).toHaveLength(1);
  });
});
