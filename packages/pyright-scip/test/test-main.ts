const { main } = require('../dist/scip-python');

export function testMain(mode: 'check' | 'update'): void {
    const argv = ['./index.js', 'snapshot-dir', 'snapshots', '--environment', 'snapshots/testEnv.json', '--quiet'];
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
