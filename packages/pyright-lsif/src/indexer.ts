import { Event } from '../../pyright-internal/node_modules/vscode-languageserver/lib/common/api';

import { Program } from 'pyright-internal/analyzer/program';
import { ImportResolver } from 'pyright-internal/analyzer/importResolver';
import { createFromRealFileSystem} from 'pyright-internal/common/realFileSystem';
import { ConfigOptions } from 'pyright-internal/common/configOptions';
import { IndexResults } from 'pyright-internal/languageService/documentSymbolProvider';
import { TreeVisitor } from './treeVisitor';
import { FullAccessHost } from 'pyright-internal/common/fullAccessHost';
import { glob } from 'glob';
import { Document, ElementTypes, MetaData, VertexLabels } from 'lsif-protocol';
import { createWriteStream } from 'fs';
import { Emitter } from './lsif';



const configOptions = new ConfigOptions("/home/tjdevries/tmp/pyxample/");
configOptions.checkOnlyOpenFiles = false;
configOptions.indexing = true;

const fs = createFromRealFileSystem();
const host = new FullAccessHost(fs);
const importResolver = new ImportResolver(createFromRealFileSystem(), configOptions, host);

const pyFiles = glob.sync("/home/tjdevries/tmp/pyxample/**/*.py");
const program = new Program(importResolver, configOptions);

program.setTrackedFiles(pyFiles)

const writeStream = createWriteStream("dump.lsif", { start: 0});

console.log("Workspace:", program.indexWorkspace(
    (path: string, results: IndexResults) => {
        // console.log("Are we indexing?");
        // console.log(path + '\n' + results.symbols.map((s) => JSON.stringify(s)));

        const parseResults = program.getSourceFile(path)?.getParseResults();
        const tree = parseResults?.parseTree;
        const typeEvaluator = program.evaluator;
        new TreeVisitor(new Emitter(writeStream), program, typeEvaluator!!, path).walk(tree!!);
    },
    {
        isCancellationRequested: false,
        onCancellationRequested: Event.None,
    }
));

while (program.analyze()) {};
const sourceFile = program.getSourceFile(pyFiles[1])!;
// console.log(sourceFile.getImports());
// console.log(sourceFile.getSymbolsForDocument("", {
//     isCancellationRequested: false,
//     onCancellationRequested: Event.None,
// }));
// program.setFileClosed

console.log("All done!");
