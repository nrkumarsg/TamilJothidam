# prisma/ — Database Schema (Phase 2)

`schema.prisma` will define the tables listed in docs/ARCHITECTURE.md § Database
Schema: users, birth_profiles, birth_locations, jathakams, planets, houses,
divisional_charts, dashas, transits, yogas, doshas, predictions, reports,
remedies, language_settings, calculation_settings — plus Prisma migrations.

Postgres runs locally via the root `docker-compose.yml` (uses the `pgvector`
image so the `rag/` knowledge base can share the same database).
