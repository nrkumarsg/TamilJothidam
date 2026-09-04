import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PREDICTION_SECTIONS } from './prediction.types';
import { PromptLoaderService } from './prompt-loader.service';

describe('PromptLoaderService', () => {
  let service: PromptLoaderService;

  beforeEach(() => {
    service = new PromptLoaderService();
  });

  it('loads the shared system prompt', () => {
    const text = service.loadSystemPrompt();
    expect(text).toContain('{{language_name}}');
    expect(text.length).toBeGreaterThan(0);
  });

  it('loads every Tamil and English section prompt actually on disk', () => {
    for (const section of PREDICTION_SECTIONS) {
      const ta = service.loadSectionPrompt('ta', section);
      const en = service.loadSectionPrompt('en', section);
      expect(ta.length).toBeGreaterThan(0);
      expect(en.length).toBeGreaterThan(0);
    }
  });

  it('throws NotFoundException for a section with no template file', () => {
    expect(() => service.loadSectionPrompt('ta', 'does_not_exist')).toThrow('Prompt template not found');
  });

  it('caches file reads — a second load returns the originally-read content even after the file on disk changes', () => {
    // fs.readFileSync isn't spyable (non-configurable in this Node build),
    // so caching is proven behaviorally: mutate the file after the first
    // load and confirm the second load still returns the cached content.
    const filePath = path.join(__dirname, '..', '..', 'prompts', 'english', 'basic_reading.md');
    const original = fs.readFileSync(filePath, 'utf-8');
    try {
      const first = service.loadSectionPrompt('en', 'basic_reading');
      fs.writeFileSync(filePath, original + `\n<!-- mutated ${os.tmpdir()} -->`);
      const second = service.loadSectionPrompt('en', 'basic_reading');
      expect(second).toBe(first);
      expect(second).not.toContain('mutated');
    } finally {
      fs.writeFileSync(filePath, original);
    }
  });
});
