// import { readFileSync, WriteStream } from 'fs';
// import { lib } from './lsif';
//
// export const lsif_typed = lib.codeintel.lsif_typed
//
// const exampleIndex: Index = {
//     metadata: {
//         toolInfo: undefined,
//         projectRoot: '/home/tjdevries/tmp/pyxample/',
//         positionEncoding: Metadata_PositionEncoding.POSITION_ENCODING_UTF16,
//     },
//
//     document: [
//         {
//             relativePath: 'src/pyxample/__init__.py',
//             symbols: [
//                 {
//                     uri: 'pyright/pyxample:MyClass',
//                     unique: Symbol_Unique.UNIQUE_GLOBAL,
//                     packageUri: '',
//                     documentation: ['MyClass is a class'],
//                     implementationSymbols: [],
//                     referenceSymbols: [],
//                 },
//             ],
//             occurrences: [
//                 {
//                     range: [2, 6, 12],
//                     highlight: Occurrence_Highlight.HIGHLIGHT_IDENTIFIER,
//                     symbolUri: 'pyright/pyxample:MyClass',
//                     symbolRole: Occurrence_Role.ROLE_DEFINITION,
//                     symbolDocumentation: [],
//                 },
//                 // {},
//             ],
//         },
//     ],
//     package: [],
//     externalSymbols: [],
// };
//
// export function writeDocument(stream: WriteStream, path: string, doc: Document) {
//     // sort the occurences.
//     let occurences = doc.occurrences.slice();
//     occurences.sort((a, b) => {
//         return a.range[0] - b.range[0];
//     });
//
//     let contents = readFileSync(path, { encoding: 'utf-8' });
//     let lines = contents.split('\n');
//
//     let occurenceIdx = 0;
//     lines.forEach((line, idx) => {
//         stream.write(line + "\n");
//
//         while (occurenceIdx < occurences.length && occurences[occurenceIdx].range[0] == idx) {
//             let occ = occurences[occurenceIdx];
//             occurenceIdx += 1;
//
//             let descriptor = 'definition';
//
//             var s: string;
//             if (occ.range[1] == 0) {
//                 s = '#' + '^'.repeat(occ.range[2] - occ.range[1] - 1) + ' ' + descriptor + ' ' + occ.symbolUri;
//             } else {
//                 s =
//                     '#' +
//                     ' '.repeat(occ.range[1] - 1) +
//                     '^'.repeat(occ.range[2] - occ.range[1] + 1) +
//                     ' ' +
//                     descriptor +
//                     ' ' +
//                     occ.symbolUri;
//             }
//
//             stream.write(s + "\n");
//         }
//
//         while (occurenceIdx < occurences.length && occurences[occurenceIdx].range[0] < idx) {
//             occurenceIdx += 1;
//         }
//     });
// }
//
// function generate(index: Index): string {
//     for (const doc of index.document) {
//         console.log(doc);
//     }
//
//     return 'hello';
// }
