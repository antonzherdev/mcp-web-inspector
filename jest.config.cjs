module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts', // exclude index.ts
    '!src/tools/browser/ancestorInspection.ts', // exclude - uses page.evaluate
    '!src/tools/browser/elementVisibility.ts', // exclude - uses page.evaluate
    '!src/tools/browser/computedStyles.ts', // exclude - uses page.evaluate
    '!src/tools/browser/findByText.ts', // exclude - uses page.evaluate
    '!src/tools/browser/elementExists.ts', // exclude - uses page.evaluate
    '!src/tools/browser/getTestIds.ts', // exclude - uses page.evaluate
    '!src/tools/browser/inspectDom.ts', // exclude - uses page.evaluate
    '!src/tools/browser/measureElement.ts', // exclude - uses page.evaluate
    '!src/tools/browser/visiblePage.ts', // exclude - uses page.evaluate
  ],
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
