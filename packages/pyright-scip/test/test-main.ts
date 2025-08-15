import { indexAction } from '../src/main-impl';
import { scip } from '../src/scip';
import { Input } from '../src/lsif-typescript/Input';
import { formatSnapshot, writeSnapshot, diffSnapshot } from '../src/lib';
import { SnapshotOptions } from '../src/MainCommand';
import { join } from 'path';
import * as path from 'path';
import * as fs from 'fs';
import { Indexer } from '../src/indexer';
import { checkSometimesAssertions } from '../src/assertions';

const snapshotRoot = './snapshots';
const inputDirectory = path.resolve(join(snapshotRoot, 'input'));
const outputDirectory = path.resolve(join(snapshotRoot, 'output'));

// Load package info for tests
const packageInfoPath = path.join(snapshotRoot, 'packageInfo.json');
const packageInfo = JSON.parse(fs.readFileSync(packageInfoPath, 'utf8'));

function createTempDirectory(outputDirectory: string, testName: string): string {
    const tempPrefix = path.join(path.dirname(outputDirectory), `.tmp-${testName}-`);
    return fs.mkdtempSync(tempPrefix);
}

function replaceFolder(tempDir: string, finalDir: string): void {
    fs.rmSync(finalDir, { recursive: true, force: true });
    fs.renameSync(tempDir, finalDir);
}

function cleanupTempDirectory(tempDir: string): void {
    try {
        fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
        console.warn(`Warning: Failed to cleanup temp directory ${tempDir}: ${error}`);
    }
}

function processSingleTest(
    testName: string,
    options: { mode: 'check' | 'update'; quiet: boolean } & Partial<SnapshotOptions>
): void {
    const projectRoot = join(inputDirectory, testName);

    if (!fs.lstatSync(projectRoot).isDirectory()) {
        throw new Error(`Test directory does not exist: ${testName}`);
    }

    indexAction({
        projectName: options.projectName ?? '',
        projectVersion: options.projectVersion ?? '',
        projectNamespace: options.projectNamespace,
        environment: options.environment ? path.resolve(options.environment) : undefined,
        dev: options.dev ?? false,
        output: path.join(projectRoot, options.output ?? 'index.scip'),
        cwd: projectRoot,
        targetOnly: options.targetOnly,
        infer: { projectVersionFromCommit: false },
        quiet: options.quiet,
        showProgressRateLimit: undefined,
    });

    // Read and validate generated SCIP index
    const scipIndexPath = path.join(projectRoot, options.output ?? 'index.scip');
    const scipIndex = scip.Index.deserializeBinary(fs.readFileSync(scipIndexPath));

    if (isJest) {
        expect(scipIndex.documents.length).toBeGreaterThan(0);
    } else if (scipIndex.documents.length === 0) {
        throw new Error('SCIP index has 0 documents');
    }

    if (options.mode === 'check') {
        const testOutputPath = path.join(outputDirectory, testName);
        if (isJest) {
            expect(fs.existsSync(testOutputPath)).toBe(true);
        } else if (!fs.existsSync(testOutputPath)) {
            throw new Error(`Expected output folder does not exist: ${testOutputPath}`);
        }
    }

    let tempDir: string | undefined;

    try {
        if (options.mode !== 'check') {
            const testOutputDir = path.resolve(outputDirectory, testName);
            tempDir = createTempDirectory(testOutputDir, testName);
        }

        for (const doc of scipIndex.documents) {
            // FIXME: We should update the SCIP index generation to not generate
            // relative paths starting with '..'
            if (doc.relative_path.startsWith('..')) {
                continue;
            }

            const inputPath = path.join(projectRoot, doc.relative_path);
            const input = Input.fromFile(inputPath);
            const obtained = formatSnapshot(input, doc, scipIndex.external_symbols);
            const relativeToInputDirectory = path.relative(projectRoot, inputPath);
            const outputPath = path.resolve(outputDirectory, testName, relativeToInputDirectory);

            if (options.mode === 'check') {
                const diffResult = diffSnapshot(outputPath, obtained);
                if (isJest) {
                    expect(diffResult).not.toBe('different');
                } else if (diffResult === 'different') {
                    throw new Error(`Snapshot content mismatch for ${outputPath}`);
                }
            } else {
                const tempOutputPath = path.join(tempDir!, relativeToInputDirectory);
                writeSnapshot(tempOutputPath, obtained);
            }
        }

        if (options.mode !== 'check' && tempDir) {
            const testOutputDir = path.resolve(outputDirectory, testName);
            replaceFolder(tempDir, testOutputDir);
            tempDir = undefined; // Mark as consumed to prevent cleanup
        }
    } finally {
        if (tempDir) {
            cleanupTempDirectory(tempDir);
        }
    }
}

// Check if we're running in Jest or standalone mode
const isJest = typeof describe !== 'undefined' && typeof test !== 'undefined';

if (isJest) {
    describe('pyproject parsing', () => {
        test('parses various pyproject.toml formats', () => {
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
                if (isJest) {
                    expect(got.name).toBe(want.name);
                    expect(got.version).toBe(want.version);
                } else {
                    if (got.name !== want.name || got.version !== want.version) {
                        throw new Error(`name/version mismatch for ${content}`);
                    }
                }
            }
        }
        });
    });

    describe('snapshot tests', () => {
    const mode = process.env.UPDATE_SNAPSHOTS ? 'update' : 'check';
    const quiet = process.env.VERBOSE !== 'true';

    // Get all test directories
    let snapshotDirectories = fs.readdirSync(inputDirectory);

    // Check for orphaned outputs
    if (fs.existsSync(outputDirectory)) {
        const outputTests = fs.readdirSync(outputDirectory);
        const inputTests = new Set(snapshotDirectories);

        for (const outputTest of outputTests) {
            if (!inputTests.has(outputTest)) {
                if (mode === 'update') {
                    const orphanedPath = path.join(outputDirectory, outputTest);
                    fs.rmSync(orphanedPath, { recursive: true, force: true });
                    console.log(`Delete output folder with no corresponding input folder: ${outputTest}`);
                } else {
                    fail(`Output folder exists but no corresponding input folder found: ${outputTest}`);
                }
            }
        }
    }

    // Run test for each snapshot directory
    test.each(snapshotDirectories)('snapshot test: %s', (testName) => {
        let projectName: string | undefined;
        let projectVersion: string | undefined;

        // Only set project name/version from packageInfo if test doesn't have its own pyproject.toml
        const testProjectRoot = path.join(inputDirectory, testName);
        if (!fs.existsSync(path.join(testProjectRoot, 'pyproject.toml'))) {
            projectName = packageInfo['default']['name'];
            projectVersion = packageInfo['default']['version'];
        }

        if (testName in packageInfo['special']) {
            projectName = packageInfo['special'][testName]['name'];
            projectVersion = packageInfo['special'][testName]['version'];
        }

        processSingleTest(testName, {
            mode: mode as 'check' | 'update',
            quiet: quiet,
            ...(projectName && { projectName }),
            ...(projectVersion && { projectVersion }),
            environment: path.join(snapshotRoot, 'testEnv.json'),
            output: 'index.scip',
            dev: false,
            cwd: path.join(inputDirectory, testName),
            targetOnly: undefined,
        });
    });

        afterAll(() => {
            checkSometimesAssertions();
        });
    });
} else {
    // Running in standalone mode (not Jest)
    function runStandaloneTests() {
        const mode = process.argv.includes('--update') ? 'update' : 'check';
        const quiet = !process.argv.includes('--verbose');
        
        // Run pyproject parsing tests
        console.log('Running pyproject parsing tests...');
        const testCases = [
            {
                expected: { name: undefined, version: undefined },
                tomlContents: [``, `[project]`, `[tool.poetry]`],
            },
            {
                expected: { name: 'abc', version: undefined },
                tomlContents: [`[project]\nname = "abc"`],
            },
            {
                expected: { name: undefined, version: '16.05' },
                tomlContents: [`[project]\nversion = "16.05"`],
            },
            {
                expected: { name: 'abc', version: '16.05' },
                tomlContents: [`[project]\nname = "abc"\nversion = "16.05"`],
            },
        ];
        
        for (const testCase of testCases) {
            for (const content of testCase.tomlContents) {
                const got = Indexer.inferProjectInfo(false, () => content);
                const want = testCase.expected;
                if (got.name !== want.name || got.version !== want.version) {
                    console.error(`FAIL: pyproject parsing test failed`);
                    process.exit(1);
                }
            }
        }
        console.log('✓ pyproject parsing tests passed');
        
        // Run snapshot tests
        console.log('\nRunning snapshot tests...');
        let snapshotDirectories = fs.readdirSync(inputDirectory);
        let failed = false;
        
        for (const testName of snapshotDirectories) {
            if (!quiet) {
                console.log(`--- Running snapshot test: ${testName} ---`);
            }
            
            try {
                let projectName: string | undefined;
                let projectVersion: string | undefined;

                const testProjectRoot = path.join(inputDirectory, testName);
                if (!fs.existsSync(path.join(testProjectRoot, 'pyproject.toml'))) {
                    projectName = packageInfo['default']['name'];
                    projectVersion = packageInfo['default']['version'];
                }

                if (testName in packageInfo['special']) {
                    projectName = packageInfo['special'][testName]['name'];
                    projectVersion = packageInfo['special'][testName]['version'];
                }

                processSingleTest(testName, {
                    mode: mode as 'check' | 'update',
                    quiet: quiet,
                    ...(projectName && { projectName }),
                    ...(projectVersion && { projectVersion }),
                    environment: path.join(snapshotRoot, 'testEnv.json'),
                    output: 'index.scip',
                    dev: false,
                    cwd: path.join(inputDirectory, testName),
                    targetOnly: undefined,
                });
            } catch (error) {
                console.error(`FAIL [${testName}]: ${error}`);
                failed = true;
                if (process.argv.includes('--fail-fast')) {
                    process.exit(1);
                }
            }
        }
        
        checkSometimesAssertions();
        
        if (failed) {
            process.exit(1);
        }
        console.log('\n✓ All snapshot tests passed');
    }
    
    runStandaloneTests();
}
