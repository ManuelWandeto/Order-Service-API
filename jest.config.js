module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/**/*.test.ts'],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  moduleNameMapper: {
    '^uuid$': '<rootDir>/uuid-mock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)',
  ],
  testTimeout: 120000,
};
