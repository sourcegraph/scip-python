import * as path from 'path';
import { Event } from 'vscode-languageserver/lib/common/api';

import { Program } from 'pyright-internal/analyzer/program';
import { ImportResolver } from 'pyright-internal/analyzer/importResolver';
import { createFromRealFileSystem } from 'pyright-internal/common/realFileSystem';
import { ConfigOptions } from 'pyright-internal/common/configOptions';
import { IndexResults } from 'pyright-internal/languageService/documentSymbolProvider';
import { TreeVisitor } from './treeVisitor';
import { FullAccessHost } from 'pyright-internal/common/fullAccessHost';
import * as url from 'url';
import { ScipConfig } from './lib';
import { SourceFile } from 'pyright-internal/analyzer/sourceFile';
import { Counter } from './lsif-typescript/Counter';
import { getTypeShedFallbackPath } from 'pyright-internal/analyzer/pythonPathUtils';
import { PyrightFileSystem } from 'pyright-internal/pyrightFileSystem';
import getEnvironment from './virtualenv/environment';
import { version } from 'package.json';
import { getFileSpec } from 'pyright-internal/common/pathUtils';
import { FileMatcher } from './FileMatcher';
import { sendStatus, StatusUpdater, withStatus } from './status';
import { scip } from './scip';

export class Indexer {
    program: Program;
    importResolver: ImportResolver;
    counter: Counter;
    pyrightConfig: ConfigOptions;
    projectFiles: Set<string>;

    constructor(public scipConfig: ScipConfig) {
        this.counter = new Counter();

        // TODO: Consider using the same setup that is used by pyright `[tool.pyright]`
        //  The only problem is we probably _do_ want to try and analyze those tools.
        //
        //  Perhaps we should add `[tool.scip-python]` to the section and just use the same logic.
        //  I think that could be a pretty elegant solution to the problem (since you would already
        //  have the same methods of configuring, you might just want to change the include/exclude)
        //
        // private _getConfigOptions(host: Host, commandLineOptions: CommandLineOptions): ConfigOptions {
        this.pyrightConfig = new ConfigOptions(scipConfig.projectRoot);
        this.pyrightConfig.checkOnlyOpenFiles = false;
        this.pyrightConfig.indexing = true;
        this.pyrightConfig.useLibraryCodeForTypes = true;

        const fs = new PyrightFileSystem(createFromRealFileSystem());
        this.pyrightConfig.typeshedPath = getTypeShedFallbackPath(fs);

        if (this.scipConfig.include) {
            this.pyrightConfig.include = this.scipConfig.include
                .split(',')
                .map((pathspec) => getFileSpec(fs, process.cwd(), pathspec));
        } else {
            this.pyrightConfig.include = [getFileSpec(fs, process.cwd(), '.')];
        }

        if (this.scipConfig.exclude) {
            this.pyrightConfig.exclude = this.scipConfig.exclude
                .split(',')
                .map((pathspec) => getFileSpec(fs, process.cwd(), pathspec));
        }

        const matcher = new FileMatcher(this.pyrightConfig, fs);
        this.projectFiles = new Set(matcher.matchFiles(this.pyrightConfig.include, this.pyrightConfig.exclude));

        const host = new FullAccessHost(fs);
        this.importResolver = new ImportResolver(fs, this.pyrightConfig, host);

        this.program = new Program(this.importResolver, this.pyrightConfig);
        this.program.setTrackedFiles([...this.projectFiles]);
    }

    public index(): void {
        const token = {
            isCancellationRequested: false,
            onCancellationRequested: Event.None,
        };

        const analyzer_fn = (progress: StatusUpdater) => {
            while (this.program.analyze({ openFilesTimeInMs: 10000, noOpenFilesTimeInMs: 10000 })) {
                const filesCompleted = this.program.getFileCount() - this.program.getFilesToAnalyzeCount();
                const filesTotal = this.program.getFileCount();
                progress.message(`${filesCompleted} / ${filesTotal}`);
            }
        };

        const packageConfig = getEnvironment(
            this.projectFiles,
            this.scipConfig.projectVersion,
            this.scipConfig.environment
        );

        const globalSymbols = new Map();

        // Emit metadata
        this.scipConfig.writeIndex(
            new scip.Index({
                metadata: new scip.Metadata({
                    project_root: url.pathToFileURL(this.scipConfig.workspaceRoot).toString(),
                    text_document_encoding: scip.TextEncoding.UTF8,
                    tool_info: new scip.ToolInfo({
                        name: 'scip-python',
                        version,
                        arguments: [],
                    }),
                }),
            })
        );

        // Run program analysis once.
        withStatus('Parse and search for dependencies', analyzer_fn);

        // let projectSourceFiles: SourceFile[] = this.program.getTracked().map((f) => f.sourceFile);
        let projectSourceFiles: SourceFile[] = [];
        withStatus('Index workspace and track project files', () => {
            this.program.indexWorkspace((filepath: string) => {
                // Filter out filepaths not part of this project
                if (filepath.indexOf(this.scipConfig.projectRoot) != 0) {
                    return;
                }

                const sourceFile = this.program.getSourceFile(filepath)!;
                projectSourceFiles.push(sourceFile);

                let requestsImport = sourceFile.getImports();
                requestsImport.forEach((entry) =>
                    entry.resolvedPaths.forEach((value) => {
                        this.program.addTrackedFile(value, true, false);
                    })
                );
            }, token);
        });

        // Mark every original sourceFile as dirty so that we can
        // visit them and only them via the program again (with all dependencies noted)
        projectSourceFiles.forEach((sourceFile) => {
            sourceFile.markDirty(true);
        });

        withStatus('Analyze project and dependencies', analyzer_fn);

        let externalSymbols: Map<string, scip.SymbolInformation> = new Map();
        withStatus('Parse and emit SCIP', (progress) => {
            const typeEvaluator = this.program.evaluator!;
            projectSourceFiles.forEach((sourceFile, index) => {
                progress.progress(`(${index}/${projectSourceFiles.length}): ${sourceFile.getFilePath()}`);

                const filepath = sourceFile.getFilePath();
                let doc = new scip.Document({
                    relative_path: path.relative(this.scipConfig.workspaceRoot, filepath),
                });

                const parseResults = sourceFile.getParseResults();
                const tree = parseResults?.parseTree!;

                let visitor = new TreeVisitor({
                    document: doc,
                    externalSymbols,
                    sourceFile: sourceFile,
                    evaluator: typeEvaluator,
                    program: this.program,
                    pyrightConfig: this.pyrightConfig,
                    scipConfig: this.scipConfig,
                    pythonEnvironment: packageConfig,
                    globalSymbols,
                });

                try {
                    visitor.walk(tree);
                } catch (e) {
                    throw {
                        currentFilepath: sourceFile.getFilePath(),
                        error: e,
                    };
                }

                if (doc.occurrences.length === 0) {
                    console.log(`file:${filepath} had no occurrences`);
                    return;
                }

                this.scipConfig.writeIndex(
                    new scip.Index({
                        documents: [doc],
                    })
                );
            });
        });

        withStatus('Writing external symbols to SCIP index', () => {
            const externalSymbolIndex = new scip.Index();
            externalSymbolIndex.external_symbols = Array.from(externalSymbols.values());
            this.scipConfig.writeIndex(externalSymbolIndex);
        });

        sendStatus(`Sucessfully wrote SCIP index to ${this.scipConfig.output}`);
    }
}
