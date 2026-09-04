import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('I18n (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /i18n/glossary returns the full glossary shape', async () => {
    const res = await request(app.getHttpServer()).get('/i18n/glossary').expect(200);

    expect(res.body.defaultLocale).toBe('ta');
    expect(res.body.supportedLocales).toEqual(['ta', 'en']);
    expect(res.body.reportSections).toHaveLength(34);
    expect(res.body.grahaNames.SATURN).toEqual({ ta: 'சனி', en: 'Saturn' });
    expect(res.body.coreTerms.jathakam).toEqual({ ta: 'ஜாதகம்', en: 'Jathakam (birth chart)' });
  });
});
