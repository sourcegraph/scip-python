import * as path from 'path';
import { Event } from 'vscode-languageserver/lib/common/api';

import { Program } from 'pyright-internal/analyzer/program';
import { ImportResolver } from 'pyright-internal/analyzer/importResolver';
import { createFromRealFileSystem } from 'pyright-internal/common/realFileSystem';
import { ConfigOptions } from 'pyright-internal/common/configOptions';
import { IndexResults } from 'pyright-internal/languageService/documentSymbolProvider';
import { TreeVisitor } from './treeVisitor';
import { FullAccessHost } from 'pyright-internal/common/fullAccessHost';
import { glob } from 'glob';
import * as url from 'url';
import { lsiftyped, LsifConfig } from './lib';
import { SourceFile } from 'pyright-internal/analyzer/sourceFile';
import { Counter } from './lsif-typescript/Counter';
import { getTypeShedFallbackPath } from 'pyright-internal/analyzer/pythonPathUtils';
import { PyrightFileSystem } from 'pyright-internal/pyrightFileSystem';
import getEnvironment from './virtualenv/environment';
import { version } from 'package.json';

export interface Config {}

export class Indexer {
    program: Program;
    importResolver: ImportResolver;
    counter: Counter;
    pyrightConfig: ConfigOptions;

    constructor(public readonly config: Config, public lsifConfig: LsifConfig) {
        this.counter = new Counter();

        // TODO: Consider using the same setup that is used by pyright `[tool.pyright]`
        //  The only problem is we probably _do_ want to try and analyze those tools.
        //
        //  Perhaps we should add `[tool.lsif-python]` to the section and just use the same logic.
        //  I think that could be a pretty elegant solution to the problem (since you would already
        //  have the same methods of configuring, you might just want to change the include/exclude)
        //
        // private _getConfigOptions(host: Host, commandLineOptions: CommandLineOptions): ConfigOptions {
        this.pyrightConfig = new ConfigOptions(lsifConfig.projectRoot);
        this.pyrightConfig.checkOnlyOpenFiles = false;
        this.pyrightConfig.indexing = true;
        this.pyrightConfig.useLibraryCodeForTypes = true;

        const fs = new PyrightFileSystem(createFromRealFileSystem());
        this.pyrightConfig.typeshedPath = getTypeShedFallbackPath(fs);

        const host = new FullAccessHost(fs);
        this.importResolver = new ImportResolver(fs, this.pyrightConfig, host);
        this.program = new Program(this.importResolver, this.pyrightConfig);

        // TODO:
        // - [ ] pyi files?
        // - [ ] More configurable globbing?
        const pyFiles = glob.sync(lsifConfig.projectRoot + '/**/*.py');
        this.program.setTrackedFiles(pyFiles);
    }

    public index(): void {
        const token = {
            isCancellationRequested: false,
            onCancellationRequested: Event.None,
        };

        const packageConfig = getEnvironment(this.lsifConfig.projectVersion, this.lsifConfig.environment);

        // Emit metadata
        this.lsifConfig.writeIndex(
            new lsiftyped.Index({
                metadata: new lsiftyped.Metadata({
                    project_root: url.pathToFileURL(this.lsifConfig.workspaceRoot).toString(),
                    text_document_encoding: lsiftyped.TextEncoding.UTF8,
                    tool_info: new lsiftyped.ToolInfo({
                        name: 'lsif-pyright',
                        version,
                        arguments: [],
                    }),
                }),
            })
        );

        // Run program analysis once.
        while (this.program.analyze()) {}

        // let visitors: lib.codeintel.lsiftyped.Document[] = [];
        let projectSourceFiles: SourceFile[] = [];
        this.program.indexWorkspace((filepath: string, _results: IndexResults) => {
            // Filter out filepaths not part of this project
            if (filepath.indexOf(this.lsifConfig.projectRoot) != 0) {
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

        // Mark every original sourceFile as dirty so that we can
        // visit them via the program again (with all dependencies noted)
        projectSourceFiles.forEach((sourceFile) => {
            sourceFile.markDirty(true);
        });

        while (this.program.analyze()) {}

        const typeEvaluator = this.program.evaluator!;
        projectSourceFiles.forEach((sourceFile) => {
            const filepath = sourceFile.getFilePath();
            let doc = new lsiftyped.Document({
                relative_path: path.relative(this.lsifConfig.workspaceRoot, filepath),
            });

            const parseResults = sourceFile.getParseResults();
            const tree = parseResults?.parseTree!;

            let visitor = new TreeVisitor({
                document: doc,
                sourceFile: sourceFile,
                evaluator: typeEvaluator,
                program: this.program,
                pyrightConfig: this.pyrightConfig,
                lsifConfig: this.lsifConfig,
                pythonEnvironment: packageConfig,
            });
            visitor.walk(tree);

            if (doc.occurrences.length === 0) {
                console.log(`file:${filepath} had no occurrences`);
                return;
            }

            this.lsifConfig.writeIndex(
                new lsiftyped.Index({
                    documents: [doc],
                })
            );
        });
    }
}
