const fs = require('fs');
const os = require('os');
const path = require('path');

// If PLAYWRIGHT_BROWSERS_PATH points to a non-writable directory (e.g. /opt/ms-playwright
// in some Docker images), redirect to ~/.cache/ms-playwright so that:
//   1. jest.globalSetup can install browsers there
//   2. worker processes use the same path when launching Playwright
if (process.env.PLAYWRIGHT_BROWSERS_PATH) {
  try {
    fs.accessSync(process.env.PLAYWRIGHT_BROWSERS_PATH, fs.constants.W_OK);
  } catch {
    process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(os.homedir(), '.cache', 'ms-playwright');
  }
}

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globalSetup: './jest.globalSetup.cjs',
  testMatch: [
    '<rootDir>/src/**/*.test.ts'
  ],
  modulePathIgnorePatterns: [
    "<rootDir>/docs/",
    "<rootDir>/dist/"
  ],
  moduleNameMapper: {
    "^(.*)\\.js$": "$1"
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: 'tsconfig.test.json'
    }],
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
