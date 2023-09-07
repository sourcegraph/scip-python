import { main } from '../src/main-impl';
import * as path from 'path';
import * as fs from 'fs';

function testMain(mode: 'check' | 'update'): void {
    const nodePath = process.argv[0];
    // Returns list of subdir names, not absolute paths.
    const inputDir = path.join('.', 'snapshots', 'input');
    const subdirNames = fs.readdirSync(inputDir);
    for (const subdirName of subdirNames) {
        console.assert(path.dirname(subdirName) === '');
        const projectInfoPath = path.join(inputDir, subdirName, 'project-info.json');
        let projectName = 'snapshot-util';
        let projectVersion = '0.1';
        if (fs.existsSync(projectInfoPath)) {
            const projectInfo = JSON.parse(fs.readFileSync(projectInfoPath).toString());
            projectName = projectInfo['name'];
            projectVersion = projectInfo['version'];
        }
        const argv = [
            nodePath,
            path.resolve('./index.js'),
            'snapshot-dir',
            './snapshots',
            '--environment',
            'snapshots/testEnv.json',
            '--quiet',
            '--project-name',
            projectName,
            '--project-version',
            projectVersion,
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
