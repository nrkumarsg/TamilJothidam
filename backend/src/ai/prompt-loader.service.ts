import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

// Versioned prompt templates live as plain markdown files under
// backend/prompts/ (spec §33) — never hard-coded in TypeScript. This
// resolves correctly whether running from src/ (ts-node-dev) or dist/
// (compiled build): prompts/ is a sibling of src/, not inside it, so
// __dirname/../.. lands on backend/ either way.
const PROMPTS_DIR = path.join(__dirname, '..', '..', 'prompts');

export type PromptLanguage = 'ta' | 'en';

@Injectable()
export class PromptLoaderService {
  private readonly cache = new Map<string, string>();

  // Shared system prompt (spec §25 rules) — language-agnostic instructions
  // about HOW to behave; the section prompts below say WHAT to write about,
  // authored directly in the target language.
  loadSystemPrompt(): string {
    return this.readFile(path.join(PROMPTS_DIR, 'system.md'));
  }

  loadSectionPrompt(language: PromptLanguage, section: string): string {
    const langDir = language === 'ta' ? 'tamil' : 'english';
    return this.readFile(path.join(PROMPTS_DIR, langDir, `${section}.md`));
  }

  private readFile(filePath: string): string {
    const cached = this.cache.get(filePath);
    if (cached !== undefined) return cached;

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`Prompt template not found: ${filePath}`);
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    this.cache.set(filePath, content);
    return content;
  }
}
