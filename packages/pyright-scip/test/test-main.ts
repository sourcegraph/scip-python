import { main, indexAction } from '../src/main-impl';
import { TestRunner, ValidationResults } from '../src/test-runner';
import { scip } from '../src/scip';
import { Input } from '../src/lsif-typescript/Input';
import { formatSnapshot, writeSnapshot, diffSnapshot } from '../src/lib';
import { SnapshotOptions } from '../src/MainCommand';
import { join } from 'path';
import * as path from 'path';
import * as fs from 'fs';
import { Indexer } from '../src/indexer';
import {
    setGlobalAssertionFlags,
    setGlobalContext,
    checkSometimesAssertions,
    SeenCondition
} from '../src/assertions';
import { normalizePathCase, isFileSystemCaseSensitive } from 'pyright-internal/common/pathUtils';
import { PyrightFileSystem } from 'pyright-internal/pyrightFileSystem';
import { createFromRealFileSystem } from 'pyright-internal/common/realFileSystem';

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

function validateOutputExists(outputDirectory: string, testName: string) {
    const testOutputPath = path.join(outputDirectory, testName);
    if (!fs.existsSync(testOutputPath)) {
        return {
            testName,
            type: 'missing-output' as const,
            message: `Expected output folder does not exist`
        };
    }
    
    return null;
}

function processSingleTest(
    testName: string,
    inputDirectory: string,
    outputDirectory: string,
    options: { mode: 'check' | 'update'; quiet: boolean } & Partial<SnapshotOptions>
): ValidationResults {
    const results: ValidationResults = {
        passed: [],
        failed: [],
        skipped: []
    };

    const projectRoot = join(inputDirectory, testName);
    if (!fs.lstatSync(projectRoot).isDirectory()) {
        results.failed.push({
            testName,
            type: 'missing-output',
            message: `Test directory does not exist: ${testName}`
        });
        return results;
    }

    try {
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
    } catch (error) {
        results.failed.push({
            testName,
            type: 'caught-exception',
            message: `Indexing failed: ${error}`
        });
        return results;
    }

    // Read and validate generated SCIP index
    const scipIndexPath = path.join(projectRoot, options.output ?? 'index.scip');
    let scipIndex: scip.Index;
    
    try {
        scipIndex = scip.Index.deserializeBinary(fs.readFileSync(scipIndexPath));
    } catch (error) {
        results.failed.push({
            testName,
            type: 'caught-exception',
            message: `Failed to read generated SCIP index: ${error}`
        });
        return results;
    }

    if (scipIndex.documents.length === 0) {
        results.failed.push({
            testName,
            type: 'empty-scip-index',
            message: 'SCIP index has 0 documents'
        });
        return results;
    }

    if (options.mode === 'check') {
        const testOutputPath = path.join(outputDirectory, testName);
        if (!fs.existsSync(testOutputPath)) {
            results.failed.push({
                testName,
                type: 'missing-output' as const,
                message: `Expected output folder does not exist`
            });
            return results;
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
                if (diffResult === 'different') {
                    results.failed.push({
                        testName,
                        type: 'content-mismatch',
                        message: `Snapshot content mismatch for ${outputPath}`
                    });
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
    } catch (error) {
        results.failed.push({
            testName,
            type: 'caught-exception',
            message: `Error processing snapshots: ${error}`
        });
    } finally {
        if (tempDir) {
            cleanupTempDirectory(tempDir);
        }
    }

    if (results.failed.length === 0) {
        results.passed.push(testName);
    }

    return results;
}

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

function snapshotTests(mode: 'check' | 'update', failFast: boolean, quiet: boolean, filterTests?: string[]): void {
    const snapshotRoot = './snapshots';
    const cwd = process.cwd();
    
    // Initialize assertion flags
    const fileSystem = new PyrightFileSystem(createFromRealFileSystem());
    const pathNormalizationChecks = !isFileSystemCaseSensitive(fileSystem) && normalizePathCase(fileSystem, cwd) !== cwd;
    const otherChecks = true;
    setGlobalAssertionFlags(pathNormalizationChecks, otherChecks);
    
    // Load package info to determine project name and version per test
    const packageInfoPath = path.join(snapshotRoot, 'packageInfo.json');
    const packageInfo = JSON.parse(fs.readFileSync(packageInfoPath, 'utf8'));
    
    const testRunner = new TestRunner({
        snapshotRoot,
        filterTests: filterTests ? filterTests.join(',') : undefined,
        failFast: failFast,
        quiet: quiet,
        mode: mode
    });

    testRunner.runTests((testName, inputDir, outputDir) => {
        // Set context for this test
        setGlobalContext(testName);
        
        let projectName: string | undefined;
        let projectVersion: string | undefined;
        
        // Only set project name/version from packageInfo if test doesn't have its own pyproject.toml
        const testProjectRoot = path.join(inputDir, testName);
        if (!fs.existsSync(path.join(testProjectRoot, 'pyproject.toml'))) {
            projectName = packageInfo['default']['name'];
            projectVersion = packageInfo['default']['version'];
        }
        
        if (testName in packageInfo['special']) {
            projectName = packageInfo['special'][testName]['name'];
            projectVersion = packageInfo['special'][testName]['version'];
        }

        return processSingleTest(testName, inputDir, outputDir, {
            mode: mode,
            quiet: quiet,
            ...(projectName && { projectName }),
            ...(projectVersion && { projectVersion }),
            environment: path.join(snapshotRoot, 'testEnv.json'),
            output: 'index.scip',
            dev: false,
            cwd: path.join(inputDir, testName),
            targetOnly: undefined
        });
    });
}

function testMain(mode: 'check' | 'update', failFast: boolean, quiet: boolean, filterTests?: string[]): void {
    unitTests();
    snapshotTests(mode, failFast, quiet, filterTests);
}

function parseFilterTests(): string[] | undefined {
    const filterIndex = process.argv.indexOf('--filter-tests');
    if (filterIndex === -1 || filterIndex + 1 >= process.argv.length) {
        return undefined;
    }
    const filterValue = process.argv[filterIndex + 1];
    return filterValue.split(',').map(test => test.trim());
}

const filterTests = parseFilterTests();
const failFast = (process.argv.indexOf('--fail-fast') !== -1) ?? false;
const quiet = process.argv.indexOf('--verbose') === -1;

if (process.argv.indexOf('--check') !== -1) {
    testMain('check', failFast, quiet, filterTests);
} else {
    testMain('update', failFast, quiet, filterTests);
}
