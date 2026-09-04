import * as fs from 'fs';
import { ServiceUnavailableException } from '@nestjs/common';
import puppeteer from 'puppeteer-core';

// puppeteer-core (not puppeteer) deliberately — it ships no bundled
// Chromium, avoiding a ~300MB download in this no-admin, portable-tooling
// dev environment (same reasoning as the portable Postgres and Moshier-
// mode ephemeris elsewhere in this project). It drives whatever
// Chromium-based browser is already installed instead.
const COMMON_CANDIDATES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
];

// Split out from resolveBrowserExecutable() so tests can exercise the
// actual selection logic against real temp files instead of mocking
// fs.existsSync (which isn't spyable — non-configurable in this Node
// build; see prompt-loader.service.spec.ts for the same constraint).
export function resolveExecutableFrom(candidates: string[], envValue?: string): string {
  if (envValue) {
    if (!fs.existsSync(envValue)) {
      throw new ServiceUnavailableException(
        `PUPPETEER_EXECUTABLE_PATH is set to "${envValue}" but that file does not exist.`,
      );
    }
    return envValue;
  }

  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    throw new ServiceUnavailableException(
      'No Chromium-based browser found for PDF generation. Set PUPPETEER_EXECUTABLE_PATH in ' +
        'backend/.env to a Chrome/Edge/Chromium executable path.',
    );
  }
  return found;
}

export function resolveBrowserExecutable(): string {
  return resolveExecutableFrom(COMMON_CANDIDATES, process.env.PUPPETEER_EXECUTABLE_PATH);
}

export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const executablePath = resolveBrowserExecutable();
  const browser = await puppeteer.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '18mm', bottom: '16mm', left: '14mm', right: '14mm' },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
