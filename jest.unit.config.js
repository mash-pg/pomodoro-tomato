const baseConfig = require('./jest.base.config.js');

module.exports = {
  ...baseConfig,
  displayName: 'unit',
  testMatch: [
    '<rootDir>/tests/api/**/*.test.(ts|tsx)',
    '<rootDir>/tests/app/**/*.test.(ts|tsx)',
    '<rootDir>/tests/components/**/*.test.(ts|tsx)',
    '<rootDir>/tests/context/**/*.test.(ts|tsx)',
    '<rootDir>/src/**/*.test.(ts|tsx)',
  ],
};