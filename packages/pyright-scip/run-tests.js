#!/usr/bin/env node

/**
 * Run snapshot tests using Jest programmatically with proper configuration
 */

const jest = require('jest');

const args = process.argv.slice(2);
const jestArgs = ['--testPathPattern=test/test-main.ts', '--forceExit', '--detectOpenHandles'];

if (args.includes('--update')) {
    process.env.UPDATE_SNAPSHOTS = 'true';
}

if (args.includes('--verbose')) {
    process.env.VERBOSE = 'true';
}

// Run Jest programmatically
jest.run(jestArgs);
