import { Command, InvalidArgumentError } from 'commander';
import packageJson from '../package.json';

export interface IndexOptions {
    project: string;
    projectName: string;
    projectVersion: string;
    projectNamespace?: string;
    snapshotDir: string;
    environment?: string;
    dev: boolean;
    output: string;
    cwd: string;
    targetOnly?: string;

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

const parseOptionalNum = (value: string) => {
    if (value === undefined) {
        return undefined;
    }

    // parseInt takes a string and a radix
    const parsedValue = parseFloat(value);
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
        .option('--project-namespace <namespace>', 'A prefix to prepend to all module definitions in the current index')
        .option('--cwd <path>', 'working directory for executing scip-python', process.cwd())
        .option('--target-only <path>', 'limit analysis to the following path')
        .option('--output <path>', 'path to the output file', DEFAULT_OUTPUT_FILE)
        .option('--snapshot-dir <path>', 'the directory to output a snapshot of the SCIP dump')
        .option('--quiet', 'run without logging and status information', false)
        .option(
            '--show-progress-rate-limit <limit>',
            'minimum number of seconds between progress messages in the output.',
            parseOptionalNum
        )
        .option('--environment <json-file>', 'the environment json file (experimental)')
        .option('--dev', 'run in developer mode (experimental)', false)
        .action((parsedOptions) => {
            indexAction(parsedOptions as IndexOptions);
        });

    command
        .command('snapshot-dir')
        .addHelpText('before', '[Unstable implementation detail, use at your own risk!]')
        .argument('<path>', 'the directory containing `input` directories')
        .option('--check', 'whether to update or check', false)
        .option('--only <name>', 'only generate snapshots for <name>')
        .requiredOption('--project-name <name>', 'the name of the current project, pypi name if applicable')
        .requiredOption('--project-version <version>', 'the name of the current project, pypi name if applicable')
        .option('--output <path>', 'path to the output file', DEFAULT_OUTPUT_FILE)
        .option('--environment <json-file>', 'the environment json file (experimental)')
        .option('--no-index', 'skip indexing (use existing index.scip)')
        .option('--quiet', 'run without logging and status information', false)
        .option(
            '--show-progress-rate-limit <limit>',
            'minimum number of seconds between progress messages in the output.',
            parseOptionalNum
        )
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
