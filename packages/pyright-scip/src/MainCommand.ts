import { Command, InvalidArgumentError } from 'commander';
import packageJson from '../package.json';

export interface IndexOptions {
    project: string;
    projectName: string;
    projectVersion: string;
    snapshotDir: string;
    environment?: string;
    dev: boolean;
    include: string;
    exclude: string;
    output: string;
    cwd: string;

    // Progress reporting configuration
    quiet: boolean;
    showProgressRateLimit: number | undefined;
}

export interface SnapshotOptions extends IndexOptions {
    only: string;
    check: boolean;
    index: boolean;
}

export interface EnvironmentOptions {
    output: string;
}

export const DEFAULT_OUTPUT_FILE = 'index.scip';

const parseOptionalInt = (value: string) => {
    if (value === undefined) {
        return undefined;
    }

    // parseInt takes a string and a radix
    const parsedValue = parseInt(value, 10);
    if (isNaN(parsedValue)) {
        throw new InvalidArgumentError('Not a number.');
    }
    return parsedValue;
};

export function mainCommand(
    indexAction: (options: IndexOptions) => void,
    snapshotAction: (dir: string, options: SnapshotOptions) => void,
    environmentAction?: (options: EnvironmentOptions) => void
): Command {
    const command = new Command();
    command.name('scip-python').version(packageJson.version).description('SCIP indexer for Python');

    command
        .command('index')
        .requiredOption('--project-name <name>', 'the name of the current project, pypi name if applicable')
        .option('--project-version <version>', 'the version of the current project, defaults to git revision')
        .option('--cwd <path>', 'working directory for executing scip-python', process.cwd())
        .option('--output <path>', 'path to the output file', DEFAULT_OUTPUT_FILE)
        .option('--snapshot-dir <path>', 'the directory to output a snapshot of the SCIP dump')
        .option('--no-progress-bar', '(deprecated, use "--quiet")')
        .option('--quiet', 'run without logging and status information', false)
        .option('--show-progress-rate-limit <limit>', 'number of times to show progress per minute', parseOptionalInt)
        .option('--environment <json-file>', 'the environment json file (experimental)')
        .option('--include <pattern>', 'comma-separated list of patterns to include (experimental)')
        .option('--exclude <pattern>', 'comma-separated list of patterns to exclude (experimental)')
        .option('--dev', 'run in developer mode (experimental)', false)
        .action((parsedOptions) => {
            indexAction(parsedOptions as IndexOptions);
        });

    command
        .command('snapshot-dir')
        .argument('<path>', 'the directory containing `input` directories')
        .option('--check', 'whether to update or check', false)
        .option('--only <name>', 'only generate snapshots for <name>')
        .option('--project-name <name>', 'the name of the current project, pypi name if applicable', 'snapshot-util')
        .option('--project-version <version>', 'the name of the current project, pypi name if applicable', '0.1')
        .option('--output <path>', 'path to the output file', DEFAULT_OUTPUT_FILE)
        .option('--environment <json-file>', 'the environment json file (experimental)')
        .option('--no-index', 'skip indexing (use existing index.scip)')
        .option('--no-progress-bar', '(deprecated, use "--quiet")')
        .option('--quiet', 'run without logging and status information', false)
        .option('--show-progress-rate-limit <limit>', 'number of times to show progress per minute', parseOptionalInt)
        .action((dir, parsedOptions) => {
            snapshotAction(dir, parsedOptions as SnapshotOptions);
        });

    command
        .command('environment-dump')
        .requiredOption('--output <path>', 'the output path for the json file')
        .action((parsedOptions) => {
            environmentAction!(parsedOptions as EnvironmentOptions);
        });

    return command;
}
