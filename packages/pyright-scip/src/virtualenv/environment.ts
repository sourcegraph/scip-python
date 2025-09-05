import * as fs from 'fs';
import * as child_process from 'child_process';
import * as os from 'os';
import * as path from 'path';
import PythonPackage from './PythonPackage';
import PythonEnvironment from './PythonEnvironment';
import { withStatus } from 'src/status';
import { sync as commandExistsSync } from 'command-exists';

// Some future improvements:
//  - Could use `importlib` and execute some stuff from Python

interface PipInformation {
    name: string;
    version: string;
}

type PipBulkShowResult =
    | { success: true; data: string[] }
    | { success: false; error: 'timeout'; message: string }
    | { success: false; error: 'other'; message: string; code?: number };

let pipCommand: string | undefined;
let getPipCommand = () => {
    if (pipCommand === undefined) {
        if (commandExistsSync('pip3')) {
            pipCommand = 'pip3';
        } else if (commandExistsSync('pip')) {
            pipCommand = 'pip';
        } else {
            throw new Error(`Could not find valid pip command. Searched PATH: ${process.env.PATH}`);
        }
    }

    return pipCommand;
};

let pythonCommand: string | undefined;
let getPythonCommand = () => {
    if (pythonCommand === undefined) {
        if (commandExistsSync('python3')) {
            pythonCommand = 'python3';
        } else if (commandExistsSync('python')) {
            pythonCommand = 'python';
        } else {
            throw new Error(`Could not find valid python command. Searched PATH: ${process.env.PATH}`);
        }
    }

    return pythonCommand;
};

function spawnSyncWithRetry(command: string, args: string[], timeout?: number): child_process.SpawnSyncReturns<string> {
    let maxBuffer = 1 * 1024 * 1024; // Start with 1MB (original default)
    const maxMemory = os.totalmem() * 0.1; // Don't use more than 10% of total system memory

    while (true) {
        const result = child_process.spawnSync(command, args, {
            encoding: 'utf8',
            maxBuffer: maxBuffer,
            timeout: timeout, // Will be undefined if not provided, which is fine
        });

        const error = result.error as NodeJS.ErrnoException | null;
        if (error && error.code === 'ENOBUFS') {
            const nextBuffer = maxBuffer * 10;
            if (nextBuffer > maxMemory) {
                throw new Error(
                    `Command output too large: final attempt maxBuffer ${(maxBuffer / 1024 / 1024).toFixed(
                        1
                    )}MB (total memory: ${(maxMemory / 1024 / 1024).toFixed(1)}MB)`
                );
            }
            maxBuffer = nextBuffer;
            continue; // Retry with larger buffer
        }

        return result;
    }
}

// Utility function for temporary directory cleanup
function cleanupTempDirectory(tempDir: string): void {
    try {
        fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
        console.warn(`Warning: Failed to cleanup temp directory ${tempDir}: ${error}`);
    }
}

// Helper function to validate and warn about missing packages
function validatePackageResults(results: PythonPackage[], requestedNames: string[]): PythonPackage[] {
    if (results.length !== requestedNames.length) {
        const foundNames = new Set(results.map((pkg) => pkg.name));
        const missingNames = requestedNames.filter((name) => !foundNames.has(name));
        console.warn(`Warning: Could not find package information for: ${missingNames.join(', ')}`);
    }
    return results;
}

function generatePackageInfoScript(): string {
    return `#!/usr/bin/env python3
import sys
import json
import importlib.metadata

def get_package_info(package_names):
    results = []
    package_set = set(package_names)  # Use set for faster lookup
    
    for dist in importlib.metadata.distributions():
        if dist.name in package_set:
            files = []
            
            # Get files for this package
            if dist.files:
                for file_path in dist.files:
                    file_str = str(file_path)
                    
                    # Skip cached or out-of-project files
                    if file_str.startswith('..') or '__pycache__' in file_str:
                        continue
                    
                    # Only include .py and .pyi files
                    if file_str.endswith(('.py', '.pyi')):
                        files.append(file_str)
            
            results.append({
                'name': dist.name,
                'version': dist.version,
                'files': files
            })
    
    return results

if __name__ == '__main__':
    package_names = set(sys.argv[1:])
    package_info = get_package_info(package_names)
    json.dump(package_info, sys.stdout)
`;
}

function pipList(): PipInformation[] {
    const result = spawnSyncWithRetry(getPipCommand(), ['list', '--format=json']);

    if (result.status !== 0) {
        throw new Error(`pip list failed with code ${result.status}: ${result.stderr}`);
    }

    return JSON.parse(result.stdout) as PipInformation[];
}

// pipBulkShow returns the results of 'pip show', one for each package.
//
// It doesn't cross-check if the length of the output matches that of the input.
function pipBulkShow(names: string[]): PipBulkShowResult {
    // FIXME: The performance of this scales with the number of packages that
    // are installed in the Python distribution, not just the number of packages
    // that are requested. If 10K packages are installed, this can take several
    // minutes. However, it's not super obvious if there is a more performant
    // way to do this without hand-rolling the functionality ourselves.
    const result = spawnSyncWithRetry(getPipCommand(), ['show', '-f', ...names], 60000); // 1 minute timeout

    if (result.status !== 0) {
        const error = result.error as NodeJS.ErrnoException | null;
        if (result.signal === 'SIGTERM' || (error && error.code === 'ETIMEDOUT')) {
            return {
                success: false,
                error: 'timeout',
                message: 'pip show timed out after 1 minute.',
            };
        }
        return {
            success: false,
            error: 'other',
            message: `pip show failed: ${result.stderr}`,
            code: result.status ?? undefined,
        };
    }

    return {
        success: true,
        data: result.stdout.split('\n---').filter((pkg) => pkg.trim()),
    };
}

// Get package information by running a short Python script.
// If we fail to run that, attempt to use `pip show`.
function gatherPackageData(packageNames: string[]): PythonPackage[] {
    // First try the new importlib.metadata approach
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scip-python-'));
    try {
        const scriptPath = path.join(tempDir, 'get_packages.py');
        const scriptContent = generatePackageInfoScript();

        fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });

        const result = spawnSyncWithRetry(getPythonCommand(), [scriptPath, ...packageNames]);

        if (result.status === 0) {
            const packageData = JSON.parse(result.stdout);
            const packages = packageData.map((pkg: any) => new PythonPackage(pkg.name, pkg.version, pkg.files));
            return validatePackageResults(packages, packageNames);
        } else {
            console.warn(`Python script failed with code ${result.status}: ${result.stderr}`);
            console.warn('Falling back to pip show approach');
        }
    } catch (error) {
        console.warn(`Failed to use importlib.metadata approach: ${error}`);
        console.warn('Falling back to pip show approach');
    } finally {
        cleanupTempDirectory(tempDir);
    }

    // Fallback to original pip show approach
    const bulkResult = pipBulkShow(packageNames);
    if (!bulkResult.success) {
        console.warn(`Warning: Package discovery failed - ${bulkResult.message}`);
        console.warn('Navigation to external packages may not work correctly.');
        return [];
    }

    const pipResults = bulkResult.data.map((shown) => PythonPackage.fromPipShow(shown));
    return validatePackageResults(pipResults, packageNames);
}

export default function getEnvironment(
    projectFiles: Set<string>,
    projectVersion: string,
    cachedEnvFile: string | undefined
): PythonEnvironment {
    if (cachedEnvFile) {
        let f = JSON.parse(fs.readFileSync(cachedEnvFile).toString()).map((entry: any) => {
            return new PythonPackage(entry.name, entry.version, entry.files);
        });

        return new PythonEnvironment(projectFiles, projectVersion, f);
    }

    return withStatus('Evaluating python environment dependencies', (progress) => {
        const listed = pipList();

        progress.message('Gathering environment information');
        const packageNames = listed.map((item) => item.name);
        const info = gatherPackageData(packageNames);

        return new PythonEnvironment(projectFiles, projectVersion, info);
    });
}

// Export for testing purposes
export { gatherPackageData };
