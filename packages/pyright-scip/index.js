#!/usr/bin/env node
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

// Both source map APIs are marked experimental as of Aug 8 2025, so we use dynamic checks
// instead of calling them unconditionally to avoid crashes on unsupported Node.js versions.
// Prefer the recommended module.setSourceMapsSupport() API for newer Node versions (Node.js 23.7.0+, 22.14.0+)
// Fall back to process.setSourceMapsEnabled() for older Node versions (Node.js 16.6.0+, 14.18.0+)
if (typeof module.setSourceMapsSupport === 'function') {
    module.setSourceMapsSupport({ nodeModules: true, generatedCode: true });
} else if (typeof process.setSourceMapsEnabled === 'function') {
    process.setSourceMapsEnabled(true);
} else {
    // Check if source maps are already enabled via NODE_OPTIONS
    const nodeOptions = process.env.NODE_OPTIONS || '';
    if (!nodeOptions.includes('--enable-source-maps')) {
        if (nodeOptions) {
            console.warn(
                'Source maps support not available. Consider adding --enable-source-maps to the existing NODE_OPTIONS environment variable.'
            );
        } else {
            console.warn(
                'Source maps support not available. Consider setting the NODE_OPTIONS environment variable to "--enable-source-maps".'
            );
        }
    }
}

// Stash the base directory into a global variable.
global.__rootDirectory = __dirname + '/dist/';

require('./dist/scip-python');
