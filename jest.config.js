// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextJest = require("next/jest");
const createJestConfig = nextJest({dir: "./"})
module.exports = createJestConfig({
    testEnvironment: "node",
    globalSetup: "<rootDir>/jest.global-setup.ts",
    setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
});
