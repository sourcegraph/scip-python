const { main } = require('../dist/scip-python-lib');
import path from 'node:path';

export function testMain(mode: 'check' | 'update'): void {
    const nodePath = process.argv[0];
    const argv = [
        nodePath,
        path.resolve('../index.js'),
        'snapshot-dir',
        './snapshots',
        '--environment',
        'snapshots/testEnv.json',
        '--quiet',
    ];
    if (mode === 'check') {
        argv.push('--check');
    }
    main(argv);
}

if (process.argv.indexOf('--check') !== -1) {
    testMain('check');
} else {
    testMain('update');
}
