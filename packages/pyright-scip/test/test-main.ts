import { main } from '../src/main-impl';
import * as path from 'path';
import * as fs from 'fs';
import { Indexer } from '../src/indexer';

function testPyprojectParsing() {
    const testCases = [
        {
            expected: { name: undefined, version: undefined },
            tomlContents: [
                ``,
                `[project]`,
                `[tool.poetry]`,
                `[tool]
poetry = {}`,
                `[tool.poetry]
name = false
version = {}`,
            ],
        },
        {
            expected: { name: 'abc', version: undefined },
            tomlContents: [
                `[project]
name = "abc"`,
                `[tool.poetry]
name = "abc"`,
                `[tool]
poetry = { name = "abc" }`,
                `[project]
name = "abc"
[tool.poetry]
name = "ignored"`,
            ],
        },
        {
            expected: { name: undefined, version: '16.05' },
            tomlContents: [
                `[project]
version = "16.05"`,
                `[tool.poetry]
version = "16.05"`,
                `[tool]
poetry = { version = "16.05" }`,
                `[project]
version = "16.05"
[tool.poetry]
version = "ignored"`,
            ],
        },
        {
            expected: { name: 'abc', version: '16.05' },
            tomlContents: [
                `[project]
name = "abc"
version = "16.05"`,
                `[tool.poetry]
name = "abc"
version = "16.05"`,
                `[project]
name = "abc"
[tool.poetry]
version = "16.05"`,
                `[project]
version = "16.05"
[tool.poetry]
name = "abc"`,
                `[project]
[tool.poetry]
name = "abc"
version = "16.05"`,
            ],
        },
    ];

    for (const testCase of testCases) {
        for (const content of testCase.tomlContents) {
            const got = Indexer.inferProjectInfo(false, () => content);
            const want = testCase.expected;
            if (got.name !== want.name) {
                throw `name mismatch (got: ${got.name}, expected: ${want.name}) for ${content}`;
            }
            if (got.version !== want.version) {
                throw `version mismatch (got: ${got.version}, expected: ${want.version}) for ${content}`;
            }
        }
    }
}

function unitTests(): void {
    testPyprojectParsing();
}

function snapshotTests(mode: 'check' | 'update'): void {
    const nodePath = process.argv[0];
    const startCwd = process.cwd();
    // Returns list of subdir names, not absolute paths.
    const inputDir = path.join('.', 'snapshots', 'input');
    const subdirNames = fs.readdirSync(inputDir);
    const packageInfoPath = path.join('.', 'snapshots', 'packageInfo.json');
    const packageInfo = JSON.parse(fs.readFileSync(packageInfoPath, 'utf8'));
    for (const subdirName of subdirNames) {
        console.assert(!subdirName.includes(path.sep));
        let projectName = undefined;
        let projectVersion = undefined;
        if (!fs.existsSync(path.join(inputDir, subdirName, 'pyproject.toml'))) {
            projectName = packageInfo['default']['name'];
            projectVersion = packageInfo['default']['version'];
        }
        if (subdirName in packageInfo['special']) {
            projectName = packageInfo['special'][subdirName]['name'];
            projectVersion = packageInfo['special'][subdirName]['version'];
        }
        const argv = [
            nodePath,
            path.resolve('./index.js'),
            'snapshot-dir',
            './snapshots',
            '--environment',
            'snapshots/testEnv.json',
            '--quiet',
            '--only',
            subdirName,
        ]; // FIXME: This should pass with a --dev flag
        argv.push(...(projectName ? ['--project-name', projectName] : []));
        argv.push(...(projectVersion ? ['--project-version', projectVersion] : []));
        if (mode === 'check') {
            argv.push('--check');
        }
        main(argv);
    }
}

function testMain(mode: 'check' | 'update'): void {
    unitTests();
    snapshotTests(mode);
}

if (process.argv.indexOf('--check') !== -1) {
    testMain('check');
} else {
    testMain('update');
}
