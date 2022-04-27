import * as fs from 'fs';
import * as path from 'path';

import { Indexer } from './indexer';
import { lib } from './lsif';
import { Input } from './lsif-typescript/Input';
import { Range } from './lsif-typescript/Range';

export const lsiftyped = lib.codeintel.lsiftyped;

export interface LsifConfig {
    /**
     * The directory where to generate the dump.lsif-typed file.
     *
     * All `Document.relative_path` fields will be relative paths to this directory.
     */
    workspaceRoot: string;

    /** The directory containing a tsconfig.json file. */
    projectRoot: string;

    /** Name of current project **/
    projectName: string;

    /** Version of current project **/
    projectVersion: string;

    /** Cached Deps **/
    environment: string | undefined;

    writeIndex: (index: lib.codeintel.lsiftyped.Index) => void;
}

export function index(options: LsifConfig) {
    const indexer = new Indexer({}, options);
    indexer.index();
}

function getSymbolTable(
    doc: lib.codeintel.lsiftyped.Document
): Map<string, lib.codeintel.lsiftyped.SymbolInformation> {
    let symbolTable = new Map();
    for (const symbol of doc.symbols) {
        symbolTable.set(symbol.symbol, symbol);
    }
    return symbolTable;
}

const packageName = 'lsif-pyright pypi';
const commentSyntax = '#';

export function formatSnapshot(input: Input, doc: lib.codeintel.lsiftyped.Document): string {
    const symbolTable = getSymbolTable(doc);

    const out: string[] = [];
    doc.occurrences.sort(occurrencesByLine);
    let occurrenceIndex = 0;
    for (const [lineNumber, line] of input.lines.entries()) {
        out.push('');
        out.push(line);
        out.push('\n');
        while (
            occurrenceIndex < doc.occurrences.length &&
            doc.occurrences[occurrenceIndex].range[0] === lineNumber
        ) {
            const occurrence = doc.occurrences[occurrenceIndex];
            occurrenceIndex++;
            if (occurrence.range.length > 3) {
                // Skip multiline occurrences for now.
                continue;
            }

            out.push(commentSyntax);
            const range = Range.fromLsif(occurrence.range);

            const isStartOfLine = range.start.character == 0;
            if (!isStartOfLine) {
                out.push(' '.repeat(range.start.character - 1));
            }


            let modifier = 0;
            if (isStartOfLine) {
                modifier = 1;
            }

            const caretLength = range.end.character - range.start.character - modifier;
            if (caretLength < 0) {
                throw new Error(input.format(range, 'negative length occurrence!'));
            }
            out.push('^'.repeat(caretLength));
            out.push(' ');
            const isDefinition = (occurrence.symbol_roles & lsiftyped.SymbolRole.Definition) > 0;
            out.push(isDefinition ? 'definition' : 'reference');
            out.push(' ');
            const symbol = occurrence.symbol.startsWith(packageName)
                ? occurrence.symbol.slice(packageName.length)
                : occurrence.symbol;
            out.push(symbol.replace('\n', '|'));

            const info = symbolTable.get(occurrence.symbol);
            if (info && isDefinition) {
                let docPrefix = '\n' + commentSyntax
                if (!isStartOfLine) {
                    docPrefix += ' '.repeat(range.start.character - 1);
                }

                for (const documentation of info.documentation) {
                    for (const [idx, line] of documentation.split('\n').entries()) {
                        out.push(docPrefix);
                        if (idx == 0) {
                            out.push('documentation ');
                        } else {
                            out.push('            > ');
                        }
                        out.push(line);
                    }
                }
            }

            out.push('\n');
        }
    }
    return out.join('');
}

export function writeSnapshot(outputPath: string, obtained: string): void {
    // eslint-disable-next-line no-sync
    fs.mkdirSync(path.dirname(outputPath), {
        recursive: true,
    });
    // eslint-disable-next-line no-sync
    fs.writeFileSync(outputPath, obtained, { flag: 'w' });
}

function occurrencesByLine(a: lib.codeintel.lsiftyped.Occurrence, b: lib.codeintel.lsiftyped.Occurrence): number {
    return Range.fromLsif(a.range).compare(Range.fromLsif(b.range));
}
