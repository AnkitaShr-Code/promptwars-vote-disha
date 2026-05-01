module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/shared/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
};
