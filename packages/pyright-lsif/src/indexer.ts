import { Program } from 'pyright-internal/analyzer/program';
import { ImportResolver } from 'pyright-internal/analyzer/importResolver';
import { createFromRealFileSystem } from 'pyright-internal/common/realFileSystem';
import { ConfigOptions } from 'pyright-internal/common/configOptions';
import { IndexResults } from 'pyright-internal/languageService/documentSymbolProvider';
import { TreeVisitor } from './treeVisitor';
import { FullAccessHost } from 'pyright-internal/common/fullAccessHost';
import { glob } from 'glob';
import { createWriteStream } from 'fs';
import { Emitter } from './emitter';

if (false) {
    const writeStream = createWriteStream('dump.lsif', { start: 0 });

    const configOptions = new ConfigOptions('/home/tjdevries/tmp/pyxample/');
    configOptions.checkOnlyOpenFiles = false;
    configOptions.indexing = true;

    const fs = createFromRealFileSystem();
    const host = new FullAccessHost(fs);
    const importResolver = new ImportResolver(createFromRealFileSystem(), configOptions, host);

    const pyFiles = glob.sync('/home/tjdevries/tmp/pyxample/src/**/*.py');
    const program = new Program(importResolver, configOptions);

    program.setTrackedFiles(pyFiles);

  // import { Event } from 'vscode-languageserver/lib/common/api';
  //   let visitors: Map<string, TreeVisitor> = new Map();
  //   console.log(
  //       'Workspace:',
  //       program.indexWorkspace(
  //           (path: string, results: IndexResults) => {
  //               const parseResults = program.getSourceFile(path)?.getParseResults();
  //               const tree = parseResults?.parseTree;
  //               const typeEvaluator = program.evaluator;
  //               let visitor = new TreeVisitor(new Emitter(writeStream), program, typeEvaluator!!, path);
  //               visitor.walk(tree!!);
  //
  //               visitors.set(path, visitor);
  //           },
  //           {
  //               isCancellationRequested: false,
  //               onCancellationRequested: Event.None,
  //           }
  //       )
  //   );

    while (program.analyze()) {}
}

export class Indexer {
    constructor() {}

    public index(): void {}
}
