/*
 * jest.config.js
 *
 * Configuration for jest tests.
 */

// jest.config.js
const { pathsToModuleNameMapper } = require('ts-jest');
// In the following statement, replace `./tsconfig` with the path to your `tsconfig` file
// which contains the path mapping (ie the `compilerOptions.paths` option):
const { compilerOptions } = require('./tsconfig');

module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/src/', '<rootDir>/test/'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    testMatch: ['**/src/**/*.test.ts', '**/test/test-*.ts'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
    moduleNameMapper: {
        ...pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>' }),
        '^typescript-char$': '<rootDir>/../pyright-internal/node_modules/.pnpm/typescript-char@0.0.0/node_modules/typescript-char',
        '^vscode-uri$': '<rootDir>/../pyright-internal/node_modules/.pnpm/vscode-uri@3.1.0/node_modules/vscode-uri',
        '^vscode-languageserver-protocol$': '<rootDir>/../pyright-internal/node_modules/.pnpm/vscode-languageserver-protocol@3.17.3/node_modules/vscode-languageserver-protocol',
        '^vscode-languageserver-types$': '<rootDir>/../pyright-internal/node_modules/.pnpm/vscode-languageserver-types@3.17.3/node_modules/vscode-languageserver-types',
    },
    globals: {
        'ts-jest': {
            tsconfig: 'tsconfig.test.json',
        },
    },
};
