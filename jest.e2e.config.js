const baseConfig = require('./jest.base.config.js');

module.exports = {
  ...baseConfig,
  displayName: 'e2e',
  testEnvironment: 'node', // ここを追加
  testMatch: [
    '<rootDir>/tests/e2e/**/*.e2e.test.(ts|tsx)',
  ],
};