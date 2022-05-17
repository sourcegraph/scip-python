import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';

import { lib } from './lsif';
import { index, formatSnapshot, writeSnapshot } from './lib';
import { Input } from './lsif-typescript/Input';
import { join } from 'path';
import { mainCommand } from './MainCommand';
import { withStatus, statusConfig } from './status';

// TODO: I should make this closer to PyrightConfigOptions

export function main(): void {
    const command = mainCommand(
        (options) => {
            if (!options.progressBar) {
                statusConfig.showProgress = false;
            }

            const workspaceRoot = options.cwd;
            let snapshotDir = options.snapshotDir;
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

            const scipIndex = new lib.codeintel.lsiftyped.Index();

            console.log('Indexing Dir:', projectRoot, ' // version:', projectVersion);

            try {
                index({
                    ...options,
                    workspaceRoot,
                    projectRoot,
                    projectName,
                    projectVersion,
                    environment,
                    writeIndex: (partialIndex: any): void => {
                        if (partialIndex.metadata) {
                            scipIndex.metadata = partialIndex.metadata;
                        }
                        for (const doc of partialIndex.documents) {
                            scipIndex.documents.push(doc);
                        }
                    },
                });
            } catch (e) {
                console.warn('Experienced Fatal Error While Indexing: Please create an issue:', e);
                return;
            }

            withStatus('Writing to ' + path.join(projectRoot, options.output), () => {
                fs.writeFileSync(path.join(projectRoot, options.output), scipIndex.serializeBinary());
            });

            if (snapshotDir) {
                for (const doc of scipIndex.documents) {
                    if (doc.relative_path.startsWith('..')) {
                        console.log('Skipping Doc:', doc.relative_path);
                        continue;
                    }

                    const inputPath = path.join(projectRoot, doc.relative_path);
                    const input = Input.fromFile(inputPath);
                    const obtained = formatSnapshot(input, doc);
                    const relativeToInputDirectory = path.relative(projectRoot, inputPath);
                    const outputPath = path.resolve(snapshotDir, relativeToInputDirectory);
                    writeSnapshot(outputPath, obtained);
                }
            }
        },
        (snapshotRoot, options) => {
            const projectName = options.projectName;
            const projectVersion = options.projectVersion;
            const environment = options.environment;

            const snapshotOnly = options.only;

            const inputDirectory = join(snapshotRoot, 'input');
            const outputDirectory = join(snapshotRoot, 'output');

            // Either read all the directories or just the one passed in by name
            let snapshotDirectories = fs.readdirSync(inputDirectory);
            if (snapshotOnly) {
                snapshotDirectories = [snapshotOnly];
            }

            for (const snapshotDir of snapshotDirectories) {
                const projectRoot = join(inputDirectory, snapshotDir);
                if (!fs.lstatSync(projectRoot).isDirectory()) {
                    continue;
                }

                console.log('Creating Snapshot For: ', projectRoot);

                const scipIndex = new lib.codeintel.lsiftyped.Index();
                index({
                    ...options,
                    workspaceRoot: projectRoot,
                    projectRoot,
                    projectName,
                    projectVersion,
                    environment,
                    writeIndex: (partialIndex: any): void => {
                        if (partialIndex.metadata) {
                            scipIndex.metadata = partialIndex.metadata;
                        }
                        for (const doc of partialIndex.documents) {
                            scipIndex.documents.push(doc);
                        }
                    },
                });

                const scipBinaryFile = path.join(projectRoot, options.output);
                fs.writeFileSync(scipBinaryFile, scipIndex.serializeBinary());

                for (const doc of scipIndex.documents) {
                    if (doc.relative_path.startsWith('..')) {
                        continue;
                    }

                    const inputPath = path.join(projectRoot, doc.relative_path);
                    const input = Input.fromFile(inputPath);
                    const obtained = formatSnapshot(input, doc);
                    const relativeToInputDirectory = path.relative(projectRoot, inputPath);
                    const outputPath = path.resolve(outputDirectory, snapshotDir, relativeToInputDirectory);
                    writeSnapshot(outputPath, obtained);
                }
            }
        }
    );

    command.parse(process.argv);
}

main();
