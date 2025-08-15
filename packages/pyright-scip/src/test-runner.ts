import * as fs from 'fs';
import * as path from 'path';
import { join } from 'path';
import { checkSometimesAssertions, SeenCondition } from './assertions';

export interface TestFailure {
    testName: string;
    type:
        | 'empty-scip-index'
        | 'missing-output'
        | 'content-mismatch'
        | 'orphaned-output'
        | 'caught-exception'
        | 'sometimes-assertion';
    message: string;
}

export interface ValidationResults {
    passed: string[];
    failed: TestFailure[];
    skipped: string[];
}

export interface TestRunnerOptions {
    snapshotRoot: string;
    filterTests?: string;
    failFast: boolean;
    quiet: boolean;
    mode: 'check' | 'update';
}

export interface SingleTestOptions {
    check: boolean;
    quiet: boolean;
}

function validateFilterTestNames(inputDirectory: string, filterTestNames: string[]): void {
    const availableTests = fs.readdirSync(inputDirectory);
    const missingTests = filterTestNames.filter((name) => !availableTests.includes(name));

    if (missingTests.length > 0) {
        console.error(
            `ERROR: The following test names were not found: ${missingTests.join(
                ', '
            )}. Available tests: ${availableTests.join(', ')}`
        );
        process.exit(1);
    }
}

function handleOrphanedOutputs(
    inputTests: Set<string>,
    outputDirectory: string,
    mode: 'check' | 'update'
): TestFailure[] {
    if (!fs.existsSync(outputDirectory)) {
        return [];
    }

    const outputTests = fs.readdirSync(outputDirectory);
    const orphanedOutputs: TestFailure[] = [];

    for (const outputTest of outputTests) {
        if (inputTests.has(outputTest)) {
            continue;
        }
        if (mode === 'update') {
            const orphanedPath = path.join(outputDirectory, outputTest);
            fs.rmSync(orphanedPath, { recursive: true, force: true });
            console.log(`Delete output folder with no corresponding input folder: ${outputTest}`);
            continue;
        }
        orphanedOutputs.push({
            testName: outputTest,
            type: 'orphaned-output',
            message: `Output folder exists but no corresponding input folder found`,
        });
    }

    return orphanedOutputs;
}

function reportResults(results: ValidationResults): void {
    const totalTests = results.passed.length + results.failed.length + results.skipped.length;
    console.assert(totalTests > 0, 'No tests found');

    for (const failure of results.failed) {
        console.error(`FAIL [${failure.testName}]: ${failure.message}`);
    }

    let summaryStr = `\n${results.passed.length}/${totalTests} tests passed, ${results.failed.length} failed`;
    if (results.skipped.length > 0) {
        summaryStr += `, ${results.skipped.length} skipped`;
    }
    console.log(summaryStr);

    if (results.failed.length > 0) {
        process.exit(1);
    }
}

export class TestRunner {
    constructor(private options: TestRunnerOptions) {}

    runTests(runSingleTest: (testName: string, inputDir: string, outputDir: string) => ValidationResults): void {
        const inputDirectory = path.resolve(join(this.options.snapshotRoot, 'input'));
        const outputDirectory = path.resolve(join(this.options.snapshotRoot, 'output'));

        const results: ValidationResults = {
            passed: [],
            failed: [],
            skipped: [],
        };

        let snapshotDirectories = fs.readdirSync(inputDirectory);

        const orphanedOutputs = handleOrphanedOutputs(new Set(snapshotDirectories), outputDirectory, this.options.mode);
        if (orphanedOutputs.length > 0) {
            results.failed.push(...orphanedOutputs);
            if (this.options.failFast) {
                reportResults(results);
                return;
            }
        }

        if (this.options.filterTests) {
            const filterTestNames = this.options.filterTests.split(',').map((name) => name.trim());
            validateFilterTestNames(inputDirectory, filterTestNames);
            snapshotDirectories = snapshotDirectories.filter((dir) => filterTestNames.includes(dir));
            if (snapshotDirectories.length === 0) {
                console.error(`No tests found matching filter: ${this.options.filterTests}`);
                process.exit(1);
            }
        }

        for (let i = 0; i < snapshotDirectories.length; i++) {
            const testName = snapshotDirectories[i];
            if (!this.options.quiet) {
                console.log(`--- Running snapshot test: ${testName} ---`);
            }

            let testResults: ValidationResults;
            try {
                testResults = runSingleTest(testName, inputDirectory, outputDirectory);
            } catch (error) {
                testResults = {
                    passed: [],
                    failed: [
                        {
                            testName,
                            type: 'caught-exception',
                            message: `Test runner failed: ${error}`,
                        },
                    ],
                    skipped: [],
                };
            }

            results.passed.push(...testResults.passed);
            results.failed.push(...testResults.failed);

            if (this.options.failFast && testResults.failed.length > 0) {
                for (let j = i + 1; j < snapshotDirectories.length; j++) {
                    results.skipped.push(snapshotDirectories[j]);
                }
                reportResults(results);
                return;
            }
        }

        // Only check sometimes assertions when running all tests, not when filtering
        if (!this.options.filterTests) {
            const sometimesResults = checkSometimesAssertions();
            for (const [key, state] of sometimesResults) {
                if (state === SeenCondition.Mixed) continue; // success

                results.failed.push({
                    testName: 'assertions',
                    type: 'sometimes-assertion',
                    message: `Assertion '${key}' was ${state} across all test contexts`,
                });
            }
        }

        reportResults(results);
    }
}
