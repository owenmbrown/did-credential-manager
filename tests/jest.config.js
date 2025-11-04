module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@did-edu/(.*)$': '<rootDir>/../$1/src',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          types: ['jest', 'node'],
        },
      },
    ],
  },
  testMatch: ['**/e2e/**/*.test.ts', '**/integration/**/*.test.ts', '**/unit/**/*.test.ts'],
  testTimeout: 60000, // 60 seconds for E2E tests
  collectCoverageFrom: [
    '../**/src/**/*.ts',
    '!../**/src/**/*.test.ts',
    '!../**/src/**/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
};

