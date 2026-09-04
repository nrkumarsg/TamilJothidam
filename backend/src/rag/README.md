# rag/ — Astrology Knowledge Base Retrieval (deferred, spec §25 marks this optional)

**Status: not implemented in Phase 13.** The AI interpretation engine
(`backend/src/ai/`) ships without vector retrieval — grounding comes instead
directly from the already-computed structured chart JSON (planets, houses,
yogas, doshas, dasha), which itself already carries the classical facts via
the bilingual names/descriptions built in Phases 5-12. The system prompt's
non-negotiable rules (never invent, never recalculate, only interpret
supplied data) constrain the model without needing a separate knowledge base
lookup.

This was a deliberate scope decision, not an oversight: the portable
(no-admin) Postgres setup used for local development is not confirmed to
have the pgvector extension available, and spec §25 explicitly names this
enhancement optional. If a future phase adds it, the design stays as
originally sketched below — retrieving documented interpretation rules
(Parashara principles, nakshatra meanings, house significations, yoga rules,
Tamil terminology) from `backend/knowledge/`, embedded into pgvector, before
the AI layer composes its final prompt — and the same authority hierarchy
applies: the knowledge base may only ever supply *documented interpretation
rules*, never override the deterministic calculation engine's output
(planetary positions, houses, dashas). See docs/ARCHITECTURE.md § AI
Architecture.
