module.exports = {
  testMatch: ['**/*.test.*'],
  testPathIgnorePatterns: ['__playwrightTests__/*'],
  // this file is ignored because code coverage was inserting some cov_asdf line that was making tests fail
  // After trying to istanbul-ignore a single line, I ended up disabling the coverage completely for this file.
  // https://stackoverflow.com/questions/55272295/using-jest-with-puppeteer-evaluation-failed-referenceerror-cov-4kq3tptqc-is
  coveragePathIgnorePatterns: ['<rootDir>/src/takeSnapshot.ts'],
};
