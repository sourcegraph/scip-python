import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';

import { scip } from './scip';
import { diffSnapshot, formatSnapshot, writeSnapshot } from './lib';
import { Input } from './lsif-typescript/Input';
import { join } from 'path';
import { mainCommand } from './MainCommand';
import { sendStatus, setQuiet, setShowProgressRateLimit } from './status';
import { Indexer } from './indexer';
import { exit } from 'process';

export function main(): void {
    const command = mainCommand(
        (options) => {
            setQuiet(options.quiet);
            if (options.showProgressRateLimit !== undefined) {
                setShowProgressRateLimit(options.showProgressRateLimit);
            }

            console.log(options);
            exit(1);

            const workspaceRoot = options.cwd;
            const snapshotDir = options.snapshotDir;
            const environment = options.environment;

            const projectRoot = workspaceRoot;
            process.chdir(workspaceRoot);

            // TODO: use setup.py / poetry to determine better projectName
            const projectName = options.projectName;
            if (!projectName || projectName == '') {
                console.warn('Must pass `--project-name`');
                return;
            }

            // TODO: Use setup.py / poetry to determine better projectVersion
            //  for now, the current hash works OK
            let projectVersion = options.projectVersion;
            if (!projectVersion || projectVersion === '') {
                // Default to current git hash
                try {
                    projectVersion = child_process.execSync('git rev-parse HEAD').toString().trim();
                } catch (e) {
                    console.warn('Must either pass `--project-version` or run from within a git repository');
                    return;
                }
            }

            const outputFile = path.join(projectRoot, options.output);
            const output = fs.openSync(outputFile, 'w');

            sendStatus(`Indexing ${projectRoot} with version ${projectVersion}`);

            try {
                let indexer = new Indexer({
                    ...options,
                    workspaceRoot,
                    projectRoot,
                    projectName,
                    projectVersion,
                    environment,
                    writeIndex: (partialIndex: scip.Index): void => {
                        fs.writeSync(output, partialIndex.serializeBinary());
                    },
                });

                indexer.index();
            } catch (e) {
                console.warn(
                    '\n\nExperienced Fatal Error While Indexing:\nPlease create an issue at github.com/sourcegraph/scip-python:',
                    e
                );
                exit(1);
            }

            fs.close(output);

            if (snapshotDir) {
                sendStatus(`Writing snapshot from index: ${outputFile}`);

                const scipIndex = scip.Index.deserializeBinary(fs.readFileSync(outputFile));
                for (const doc of scipIndex.documents) {
                    if (doc.relative_path.startsWith('..')) {
                        console.log('Skipping Doc:', doc.relative_path);
                        continue;
                    }

                    const inputPath = path.join(projectRoot, doc.relative_path);
                    const input = Input.fromFile(inputPath);
                    const obtained = formatSnapshot(input, doc, scipIndex.external_symbols);
                    const relativeToInputDirectory = path.relative(projectRoot, inputPath);
                    const outputPath = path.resolve(snapshotDir, relativeToInputDirectory);
                    writeSnapshot(outputPath, obtained);
                }
            }
        },
        (snapshotRoot, options) => {
            setQuiet(options.quiet);
            if (options.showProgressRateLimit !== undefined) {
                setShowProgressRateLimit(options.showProgressRateLimit);
            }

            console.log('... Snapshotting ... ');
            const projectName = options.projectName;
            const projectVersion = options.projectVersion;
            const environment = options.environment ? path.resolve(options.environment) : undefined;

            const snapshotOnly = options.only;

            const inputDirectory = path.resolve(join(snapshotRoot, 'input'));
            const outputDirectory = path.resolve(join(snapshotRoot, 'output'));

            // Either read all the directories or just the one passed in by name
            let snapshotDirectories = fs.readdirSync(inputDirectory);
            if (snapshotOnly) {
                snapshotDirectories = [snapshotOnly];
            }

            for (const snapshotDir of snapshotDirectories) {
                let projectRoot = join(inputDirectory, snapshotDir);
                if (!fs.lstatSync(projectRoot).isDirectory()) {
                    continue;
                }

                projectRoot = path.resolve(projectRoot);
                process.chdir(projectRoot);

                const scipBinaryFile = path.join(projectRoot, options.output);
                const output = fs.openSync(scipBinaryFile, 'w');

                if (options.index) {
                    let indexer = new Indexer({
                        ...options,
                        workspaceRoot: projectRoot,
                        projectRoot,
                        projectName,
                        projectVersion,
                        environment,
                        writeIndex: (partialIndex: any): void => {
                            fs.writeSync(output, partialIndex.serializeBinary());
                        },
                    });
                    indexer.index();
                    fs.close(output);
                }

                const contents = fs.readFileSync(scipBinaryFile);
                const scipIndex = scip.Index.deserializeBinary(contents);

                for (const doc of scipIndex.documents) {
                    if (doc.relative_path.startsWith('..')) {
                        continue;
                    }

                    const inputPath = path.join(projectRoot, doc.relative_path);
                    const input = Input.fromFile(inputPath);
                    const obtained = formatSnapshot(input, doc, scipIndex.external_symbols);
                    const relativeToInputDirectory = path.relative(projectRoot, inputPath);
                    const outputPath = path.resolve(outputDirectory, snapshotDir, relativeToInputDirectory);

                    if (options.check) {
                        diffSnapshot(outputPath, obtained);
                    } else {
                        writeSnapshot(outputPath, obtained);
                    }
                }
            }
        },
        (_) => {
            throw 'not yet implemented';
            // console.log('ENVIRONMENT OPTIONS', options);
            // console.log(getEnvironment(new Set(), '', undefined));
        }
    );

    command.parse(process.argv);
}

main();
