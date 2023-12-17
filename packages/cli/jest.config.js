module.exports = {
  // setupFilesAfterEnv: ['./jest.setup.js'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {//the content you'd placed at "global"
      babel: true,
      tsconfig: 'tsconfig.json',
    }]
  },
  "transformIgnorePatterns": [
    "/node_modules/",
  ]
}
