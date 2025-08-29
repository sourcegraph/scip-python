import * as fs from 'fs';
import * as child_process from 'child_process';
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

function pipList(): PipInformation[] {
    console.log(`Executing pip list.`);
    return JSON.parse(
        child_process.execSync(`${getPipCommand()} list --format=json`, { maxBuffer: 1024 * 1024 * 100 }).toString()
    ) as PipInformation[];
}

function pipBulkShow(names: string[]): string[] {
    const BATCH_SIZE = 10;
    const results: string[] = [];
    console.log(names.length + ' packages to show');

    for (let i = 0; i < names.length; i += BATCH_SIZE) {
        const batch = names.slice(i, i + BATCH_SIZE);
        console.log(`Executing pip show for the following packages: ${batch.join(', ')}`);
        console.log(`${getPipCommand()} show -f ${batch.join(' ')}`);t
        const output = child_process
            .execSync(`${getPipCommand()} show -f ${batch.join(' ')}`, { maxBuffer: 1024 * 1024 * 5 })
            .toString()
        results.push(...output.split('\n---'));
    }

    return results;
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
