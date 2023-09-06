#!/usr/bin/env node
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

// Stash the base directory into a global variable.
global.__rootDirectory = __dirname + '/dist/';

require('./dist/scip-python-test');

// Q: Why do we have this stub file instead of directly
// invoking a test running on `./test/test-main.ts`
// or invoking `node ./dist/scip-python-test.ts`?
//
// A: There is some reliance on specific relative directory
// structure in Pyright code, which means that if the
// script is in a subdirectory, it cannot find type stubs
// for stdlib modules, causing snapshot mismatches.
