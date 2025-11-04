export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^didcomm$': '<rootDir>/mocks/didcomm.js',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          verbatimModuleSyntax: false,
          isolatedModules: true,
        },
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(didcomm|@stablelib|@noble)/)',
  ],
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  collectCoverageFrom: [
    'src/routes/**/*.ts',
    'src/verification/**/*.ts',
    'src/challenge/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts',
    '!src/**/*.test.ts',
    '!src/test-setup.ts',
    '!mocks/**/**',
  ],
  coverageThreshold: {
    'src/routes/**/*.ts': {
      branches: 45,
      functions: 75,
      lines: 50,
      statements: 50,
    },
  },
};

