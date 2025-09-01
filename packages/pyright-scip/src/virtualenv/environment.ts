import * as fs from 'fs';
import * as child_process from 'child_process';
import * as os from 'os';
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

let pipCommand: string | undefined;
let getPipCommand = () => {
    if (pipCommand === undefined) {
        if (commandExistsSync('pip3')) {
            pipCommand = 'pip3';
        } else if (commandExistsSync('pip')) {
            pipCommand = 'pip';
        } else {
            throw new Error('Could not find valid pip command');
        }
    }

    return pipCommand;
};

function spawnSyncWithRetry(command: string, args: string[]): child_process.SpawnSyncReturns<string> {
    let maxBuffer = 1 * 1024 * 1024; // Start with 1MB (original default)
    const maxMemory = os.totalmem() * 0.1; // Don't use more than 10% of total system memory

    while (true) {
        const result = child_process.spawnSync(command, args, {
            encoding: 'utf8',
            maxBuffer: maxBuffer,
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
function pipBulkShow(names: string[]): string[] {
    // FIXME: The performance of this scales with the number of packages that
    // are installed in the Python distribution, not just the number of packages
    // that are requested. If 10K packages are installed, this can take several
    // minutes. However, it's not super obvious if there is a more performant
    // way to do this without hand-rolling the functionality ourselves.
    const result = spawnSyncWithRetry(getPipCommand(), ['show', '-f', ...names]);

    if (result.status !== 0) {
        throw new Error(`pip show failed with code ${result.status}: ${result.stderr}`);
    }

    return result.stdout.split('\n---').filter((pkg) => pkg.trim());
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

        progress.message('Gathering environment information from `pip`');
        const bulk = pipBulkShow(listed.map((item) => item.name));

        progress.message('Analyzing dependencies');
        const info = bulk.map((shown) => {
            return PythonPackage.fromPipShow(shown);
        });
        return new PythonEnvironment(projectFiles, projectVersion, info);
    });
}
