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
import { lsif_typed, Options } from './main';

export interface Config {}

export class Indexer {
    program: Program;

    constructor(public readonly config: Config, public options: Options) {
        const configOptions = new ConfigOptions(options.project);
        configOptions.checkOnlyOpenFiles = false;
        configOptions.indexing = true;

        const fs = createFromRealFileSystem();
        const host = new FullAccessHost(fs);
        const importResolver = new ImportResolver(createFromRealFileSystem(), configOptions, host);

        this.program = new Program(importResolver, configOptions);

        const pyFiles = glob.sync(options.project + '**/*.py');
        this.program.setTrackedFiles(pyFiles);
    }

    public index(): void {
        // Emit metadata
        this.options.writeIndex(
            new lsif_typed.Index({
                metadata: new lsif_typed.Metadata({
                    // TODO: Might need to change project -> projectRoot
                    project_root: url.pathToFileURL(this.options.project).toString(),
                    tool_info: new lsif_typed.ToolInfo({
                        name: 'lsif-node',
                        version: '1.0.0',
                        arguments: [],
                    }),
                }),
            })
        );

        while (this.program.analyze()) {}

        let visitors: Map<string, TreeVisitor> = new Map();
        this.program.indexWorkspace(
            (filepath: string, _results: IndexResults) => {
                const parseResults = this.program.getSourceFile(filepath)?.getParseResults();
                const tree = parseResults?.parseTree;
                const typeEvaluator = this.program.evaluator;


                let doc = new lsif_typed.Document({ 
                  relative_path: path.relative(
                    this.options.projectRoot,
                    filepath
                  ),
                });
                let visitor = new TreeVisitor(doc, this.program, typeEvaluator!, filepath);
                visitor.walk(tree!!);

                visitors.set(filepath, visitor);

                this.options.writeIndex(
                  new lsif_typed.Index({
                    documents: [doc],
                  })
                )
            },
            {
                isCancellationRequested: false,
                onCancellationRequested: Event.None,
            }
        );

    }
}
