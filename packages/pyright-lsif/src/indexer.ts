import { Event } from '../../pyright-internal/node_modules/vscode-languageserver/lib/common/api';

import { Program } from 'pyright-internal/analyzer/program';
import { ImportResolver } from 'pyright-internal/analyzer/importResolver';
import { createFromRealFileSystem } from 'pyright-internal/common/realFileSystem';
import { ConfigOptions } from 'pyright-internal/common/configOptions';
import { IndexResults } from 'pyright-internal/languageService/documentSymbolProvider';
import { TreeVisitor } from './treeVisitor';
import { FullAccessHost } from 'pyright-internal/common/fullAccessHost';
import { glob } from 'glob';
import { Document, ElementTypes, MetaData, VertexLabels } from 'lsif-protocol';
import { createWriteStream } from 'fs';
import { Emitter } from './emitter';

if (false) {
    const configOptions = new ConfigOptions('/home/tjdevries/tmp/pyxample/');
    configOptions.checkOnlyOpenFiles = false;
    configOptions.indexing = true;

    const fs = createFromRealFileSystem();
    const host = new FullAccessHost(fs);
    const importResolver = new ImportResolver(createFromRealFileSystem(), configOptions, host);

    const pyFiles = glob.sync('/home/tjdevries/tmp/pyxample/src/**/*.py');
    const program = new Program(importResolver, configOptions);

    program.setTrackedFiles(pyFiles);

    const writeStream = createWriteStream('dump.lsif', { start: 0 });

    let visitors: Map<string, TreeVisitor> = new Map();

    console.log(
        'Workspace:',
        program.indexWorkspace(
            (path: string, results: IndexResults) => {
                const parseResults = program.getSourceFile(path)?.getParseResults();
                const tree = parseResults?.parseTree;
                const typeEvaluator = program.evaluator;
                let visitor = new TreeVisitor(new Emitter(writeStream), program, typeEvaluator!!, path);
                visitor.walk(tree!!);

                visitors.set(path, visitor);
            },
            {
                isCancellationRequested: false,
                onCancellationRequested: Event.None,
            }
        )
    );

    while (program.analyze()) {}

    visitors.forEach((visitor, path) => {
        // console.log(path, "=>", emitter);
        // _ = i.emitter.EmitContains(d.DocumentID, union(d.DefinitionRangeIDs, d.ReferenceRangeIDs))
        // visitor.writ
        if (visitor.contains.length > 0) {
            visitor.emitter.EmitContains(visitor.document!, visitor.contains);
        }
    });

    // console.log(sourceFile.getImports());
    // console.log(sourceFile.getSymbolsForDocument("", {
    //     isCancellationRequested: false,
    //     onCancellationRequested: Event.None,
    // }));
    // program.setFileClosed

    console.log('All done!');
}

console.log("Trying Proto Bufs");
