import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ServiceUnavailableException } from '@nestjs/common';
import { resolveBrowserExecutable, resolveExecutableFrom } from './pdf-renderer';

// fs.existsSync isn't spyable (non-configurable in this Node build), so
// these tests use a genuinely-created temp file rather than mocking —
// same workaround as prompt-loader.service.spec.ts.
describe('resolveExecutableFrom', () => {
  const realFile = path.join(os.tmpdir(), `pdf-renderer-spec-${Date.now()}.txt`);
  const missingFile = path.join(os.tmpdir(), `pdf-renderer-spec-missing-${Date.now()}.txt`);

  beforeAll(() => {
    fs.writeFileSync(realFile, 'stand-in for a browser executable');
  });

  afterAll(() => {
    fs.rmSync(realFile, { force: true });
  });

  it('uses envValue when it points to a real file', () => {
    expect(resolveExecutableFrom([], realFile)).toBe(realFile);
  });

  it('throws ServiceUnavailableException when envValue is set but the file does not exist', () => {
    expect(() => resolveExecutableFrom([], missingFile)).toThrow(ServiceUnavailableException);
  });

  it('falls back to the first existing candidate when envValue is not set', () => {
    expect(resolveExecutableFrom([missingFile, realFile], undefined)).toBe(realFile);
  });

  it('throws ServiceUnavailableException when no envValue and no candidate exists', () => {
    expect(() => resolveExecutableFrom([missingFile], undefined)).toThrow(ServiceUnavailableException);
  });

  it('envValue takes priority over candidates', () => {
    expect(resolveExecutableFrom([realFile], realFile)).toBe(realFile);
  });
});

describe('resolveBrowserExecutable', () => {
  const originalEnv = process.env.PUPPETEER_EXECUTABLE_PATH;

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.PUPPETEER_EXECUTABLE_PATH;
    else process.env.PUPPETEER_EXECUTABLE_PATH = originalEnv;
  });

  it('resolves a real Chromium-based browser on this dev machine', () => {
    delete process.env.PUPPETEER_EXECUTABLE_PATH;
    // No mocking — proves at least one of the hardcoded common candidates
    // (or PUPPETEER_EXECUTABLE_PATH, if the machine sets one) actually
    // exists here, since this suite's e2e PDF test depends on it.
    expect(() => resolveBrowserExecutable()).not.toThrow();
    expect(fs.existsSync(resolveBrowserExecutable())).toBe(true);
  });
});
