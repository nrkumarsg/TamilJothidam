/** @type {import('jest').Config} */
module.exports = {
  rootDir: '.',
  testRegex: '.*\\.(spec|e2e-spec)\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleFileExtensions: ['js', 'json', 'ts'],
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  // Each *.e2e-spec.ts boots a full Nest app (its own Prisma connection
  // pool) against the same local Postgres instance in beforeAll/afterAll.
  // With enough e2e suites now in the project, Jest's default worker count
  // (one per CPU core) opens more pooled connections than the portable dev
  // Postgres comfortably serves at once, so afterAll's final query can
  // exceed Jest's 5000ms default hook timeout under contention — not a
  // logic bug, just too many DB connections opening at once. Capping
  // workers and raising the timeout gives every suite room to finish.
  maxWorkers: 4,
  testTimeout: 15000,
};
