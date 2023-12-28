module.exports = {
    moduleFileExtensions: [
      'js',
      'ts',
      'tsx',
    ],
    transform: {
      '^.+\\.(ts|tsx)?$': [
        'ts-jest'
      ],
    },
    modulePaths: [
      "<rootDir>",
      "packages/core",
    ],
    moduleNameMapper: {
      '^@authdog/hydra-core$': '<rootDir>/packages/core/src',
    },
    testMatch: [
      '**/**/*.test.(ts|js)',
      '**/test/**/*.test.(ts|js)',
    ],
    testPathIgnorePatterns: [
      '/node_modules/',
      'build',
    ],
    testEnvironment: 'node',
    rootDir: '.',
    collectCoverageFrom: [
      '!<rootDir>/src',
    ],
    preset: 'ts-jest',
  }
  