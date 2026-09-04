# prompts/tamil/ (Phase 13-14)

Versioned Tamil prompt templates, one per report section
(`basic_reading.md`, `health.md`, `wealth.md`, `career.md`, `marriage.md`,
`karma.md`, `future.md`, ...). Never embed these prompts directly in
TypeScript source — load them at runtime so they can be edited/versioned via
the admin panel without a code deploy. Version tracked via
`ASTROLOGY_PROMPT_VERSION` in `.env`.
