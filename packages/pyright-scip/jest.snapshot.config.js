/*
 * jest.snapshot.config.js
 *
 * Configuration for snapshot tests that need to import pyright-internal.
 */

const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig');

module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/test/'],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: 'tsconfig.test.json',
            isolatedModules: true,
            diagnostics: false,
        }],
    },
    testMatch: ['**/test/test-*.ts'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
    moduleNameMapper: {
        ...pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>' }),
        '^typescript-char$': '<rootDir>/../pyright-internal/node_modules/.pnpm/typescript-char@0.0.0/node_modules/typescript-char',
        '^vscode-uri$': '<rootDir>/../pyright-internal/node_modules/.pnpm/vscode-uri@3.1.0/node_modules/vscode-uri',
        '^vscode-languageserver-protocol$': '<rootDir>/../pyright-internal/node_modules/.pnpm/vscode-languageserver-protocol@3.17.3/node_modules/vscode-languageserver-protocol',
        '^vscode-languageserver-types$': '<rootDir>/../pyright-internal/node_modules/.pnpm/vscode-languageserver-types@3.17.3/node_modules/vscode-languageserver-types',
    },
};
