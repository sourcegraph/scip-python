import { Document, Range } from 'lsif-protocol';
import { AnalyzerFileInfo } from 'pyright-internal/analyzer/analyzerFileInfo';
import { getFileInfo } from 'pyright-internal/analyzer/analyzerNodeInfo';
import { ParseTreeWalker } from 'pyright-internal/analyzer/parseTreeWalker';
import { Program } from 'pyright-internal/analyzer/program';
import { TypeEvaluator } from 'pyright-internal/analyzer/typeEvaluatorTypes';
import { convertOffsetToPosition } from 'pyright-internal/common/positionUtils';
import { ClassNode, FunctionNode, ModuleNode } from 'pyright-internal/parser/parseNodes';
import { Emitter, NewDefinitionResult, NewDocument, NewRange } from './lsif';

// TODO:
// - [ ] Emit definitions for all class
// - [ ] Emit references for classes
// - [ ] Emit definitions for all functions
// - [ ] Emit references for functions

export class TreeVisitor extends ParseTreeWalker {
    private fileInfo: AnalyzerFileInfo | undefined;
    private uri: string;

    private document: number | undefined;
    private contains: number[];

    constructor(
        private emitter: Emitter,
        private program: Program,
        private evaluator: TypeEvaluator,
        private file: string
    ) {
        super();

        this.uri = 'file://' + this.file;
        this.contains = [];
    }

    override visitModule(node: ModuleNode): boolean {
        this.fileInfo = getFileInfo(node);
        this.document = this.emitter.EmitDocument(this.uri);

        return true;
    }

    override visitClass(node: ClassNode): boolean {
        console.log('Class Node:', node.id);

        let name = node.name;
        let start = convertOffsetToPosition(name.start, this.fileInfo!!.lines);
        let end = convertOffsetToPosition(name.start + name.length, this.fileInfo!.lines);
        let range = this.emitter.EmitRange(start, end);
        this.contains.push(range);

        let result = this.emitter.EmitDefinitionResult();


        // defResultID := i.emitter.EmitDefinitionResult()
        //
        // _ = i.emitter.EmitNext(rangeID, resultSetID)
        // _ = i.emitter.EmitTextDocumentDefinition(resultSetID, defResultID)
        // _ = i.emitter.EmitItem(defResultID, []uint64{rangeID}, document.DocumentID)

        // this.emitter(
        //
        // Emit a new range
        //
        // Track that we emit the range, so we can connect to document later via contains
        //
        // Ensure result set for this range
        //
        // Connect result set to a definition
        //
        // Connect definition to the correct range
        return true;
    }

    // override visitYield(node: YieldNode): boolean {
    //   return true;
    // }
    override visitFunction(node: FunctionNode): boolean {
        console.log('Visiting FunctionNode:', node.id, '->', node.parent! /* " | ", node.name */);

        let name = node.name;
        let start = convertOffsetToPosition(name.start, this.fileInfo!!.lines);
        let end = convertOffsetToPosition(name.start + name.length, this.fileInfo!.lines);
        let range = this.emitter.EmitRange(start, end);
        this.contains.push(range);

        return true;
    }

    // override visitName(node: NameNode): boolean {
    //   console.log("Visiting Node:", node);
    //   return true;
    // }
}
