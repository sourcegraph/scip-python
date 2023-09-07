import { main } from '../src/main-impl';
import * as path from 'path';
import * as fs from 'fs';

function testMain(mode: 'check' | 'update'): void {
    const nodePath = process.argv[0];
    // Returns list of subdir names, not absolute paths.
    const subdirNames = fs.readdirSync('./snapshots/input');
    for (const subdirName of subdirNames) {
        console.assert(subdirName.includes('/') === false);
        const argv = [
            nodePath,
            path.resolve('./index.js'),
            'snapshot-dir',
            './snapshots',
            '--environment',
            'snapshots/testEnv.json',
            '--quiet',
            '--project-name',
            'snapshot-util',
            '--project-version',
            '0.1',
            '--only',
            subdirName,
        ];
        if (mode === 'check') {
            argv.push('--check');
        }
        main(argv);
    }
}

if (process.argv.indexOf('--check') !== -1) {
    testMain('check');
} else {
    testMain('update');
}
