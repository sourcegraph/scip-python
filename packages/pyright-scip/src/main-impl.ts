import * as fs from 'fs';
import * as path from 'path';

import { scip } from './scip';
import { diffSnapshot, formatSnapshot, writeSnapshot } from './lib';
import { Input } from './lsif-typescript/Input';
import { join } from 'path';
import { IndexOptions, SnapshotOptions, mainCommand } from './MainCommand';
import { sendStatus, setQuiet, setShowProgressRateLimit } from './status';
import { Indexer } from './indexer';
import { exit } from 'process';

function indexAction(options: IndexOptions): void {
    setQuiet(options.quiet);
    if (options.showProgressRateLimit !== undefined) {
        setShowProgressRateLimit(options.showProgressRateLimit);
    }

    const projectRoot = options.cwd;
    const environment = options.environment;

    const originalWorkdir = process.cwd();
    process.chdir(projectRoot);

    const outputFile = path.join(projectRoot, options.output);
    const output = fs.openSync(outputFile, 'w');

    try {
        let indexer = new Indexer({
            ...options,
            projectRoot,
            environment,
            infer: { projectVersionFromCommit: true },
            writeIndex: (partialIndex: scip.Index): void => {
                fs.writeSync(output, partialIndex.serializeBinary());
            },
        });

        sendStatus(`Indexing ${projectRoot} with version ${indexer.scipConfig.projectVersion}`);

        indexer.index();
    } catch (e) {
        console.warn(
            '\n\nExperienced Fatal Error While Indexing:\nPlease create an issue at github.com/sourcegraph/scip-python:',
            e
        );
        process.chdir(originalWorkdir);
        exit(1);
    }

    fs.close(output);

    process.chdir(originalWorkdir);
}

function snapshotAction(snapshotRoot: string, options: SnapshotOptions): void {
    setQuiet(options.quiet);
    if (options.showProgressRateLimit !== undefined) {
        setShowProgressRateLimit(options.showProgressRateLimit);
    }

    console.log('... Snapshotting ... ');
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
        const originalWorkdir = process.cwd();
        process.chdir(projectRoot);

        const scipBinaryFile = path.join(projectRoot, options.output);
        const output = fs.openSync(scipBinaryFile, 'w');

        if (options.index) {
            let indexer = new Indexer({
                ...options,
                projectRoot,
                environment,
                infer: { projectVersionFromCommit: false },
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

        process.chdir(originalWorkdir);
    }
}

export function main(argv: string[]): void {
    const command = mainCommand(indexAction, snapshotAction, (_) => {
        throw 'not yet implemented';
        // console.log('ENVIRONMENT OPTIONS', options);
        // console.log(getEnvironment(new Set(), '', undefined));
    });
    command.parse(argv);
}
