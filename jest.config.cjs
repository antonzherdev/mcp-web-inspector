module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
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
