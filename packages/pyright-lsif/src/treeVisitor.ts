import { Document, Range, UniquenessLevel } from 'lsif-protocol';
import { AnalyzerFileInfo } from 'pyright-internal/analyzer/analyzerFileInfo';
import { getFileInfo } from 'pyright-internal/analyzer/analyzerNodeInfo';
import { getClassFullName } from 'pyright-internal/analyzer/parseTreeUtils';
import { ParseTreeWalker } from 'pyright-internal/analyzer/parseTreeWalker';
import { Program } from 'pyright-internal/analyzer/program';
import { TypeEvaluator } from 'pyright-internal/analyzer/typeEvaluatorTypes';
import { convertOffsetToPosition } from 'pyright-internal/common/positionUtils';
import { ClassNode, FunctionNode, ModuleNameNode, ModuleNode, ParameterNode, ParseNodeBase } from 'pyright-internal/parser/parseNodes';
import { UnescapeErrorType } from 'pyright-internal/parser/stringTokenUtils';
import { Emitter } from './lsif';

// TODO:
// - [ ] Emit definitions for all class
// - [ ] Emit references for classes
// - [ ] Emit definitions for all functions
// - [ ] Emit references for functions

// I think we can do something like,
//  keep track of where a particular scope would END
//  when we pass that spot, we pop whatever the last scope was until we're done.
//
//  so for a class, we can keep some "state" at the moment of who is where
//  and then pop that off as we move outside of each scope.
//
//  This should let us do a lot more stuff in a "single pass" style, instead
//  of looking back up the tree as we go the whole time.

class Scope {
    constructor(public name: string, public end: number) {}
}

export class TreeVisitor extends ParseTreeWalker {
    private fileInfo: AnalyzerFileInfo | undefined;
    private uri: string;

    public document: number | undefined;
    public contains: number[];
    private resultSets: Map<number, number>;

    private scopeStack: Scope[];

    constructor(
        public emitter: Emitter,
        private program: Program,
        private evaluator: TypeEvaluator,
        private file: string
    ) {
        super();

        this.uri = 'file://' + this.file;
        this.contains = [];
        this.scopeStack = [];
        this.resultSets = new Map();
    }

    private popScopeStack(node: ParseNodeBase) {
        while (this.scopeStack.length != 0) {
            let scope = this.scopeStack[this.scopeStack.length - 1];
            if (scope.end < node.start) {
                this.scopeStack.pop();
            } else {
                break;
            }
        }
    }

    override visitModule(node: ModuleNode): boolean {
        this.fileInfo = getFileInfo(node);
        this.document = this.emitter.EmitDocument(this.uri);
        this.scopeStack.push({ name: this.fileInfo.moduleName, end: Infinity });

        // this.scopeStack.push({
        //     name: node.nameParts.map((namePart) => namePart.value).join('.'),
        //     end: node.start + node.length,
        // });

        return true;
    }

    override visitModuleName(node: ModuleNameNode): boolean {
        console.log('printf debugging');
        this.popScopeStack(node);
        this.scopeStack.push({
            name: node.nameParts.map((namePart) => namePart.value).join('.'),
            end: node.start + node.length,
        });

        return true;
    }

    override visitClass(node: ClassNode): boolean {
        // TODO: We should handle when you define the same class in the same file and scope.
        // That should be OK, but it will be annoying.
        //    Probably can do something like keep track of the moniker -> result, and then emit that
        this.popScopeStack(node);

        let name = node.name;
        let start = convertOffsetToPosition(name.start, this.fileInfo!!.lines);
        let end = convertOffsetToPosition(name.start + name.length, this.fileInfo!.lines);
        let range = this.emitter.EmitRange(start, end);
        this.contains.push(range);

        let result = this.resultSets.get(range);
        if (result === undefined) {
            result = this.emitter.EmitResultSet();
            this.resultSets.set(range, result);
        }

        let defResult = this.emitter.EmitDefinitionResult();

        this.emitter.EmitNext(range, result);
        this.emitter.EmitTextDocumentDefinition(result, defResult);
        this.emitter.EmitItem(defResult, [range], this.document!);

        // TODO: Cache monikers
        let moniker = this.emitter.EmitExportMoniker(this.makeMoniker(node.name.value), UniquenessLevel.scheme);
        this.emitter.EmitMonikerEdge(result, moniker);

        this.scopeStack.push({ name: node.name.value, end: node.start + node.length });

        return true;
    }

    // override visitYield(node: YieldNode): boolean {
    //   return true;
    // }
    override visitFunction(node: FunctionNode): boolean {
        this.popScopeStack(node);

        let name = node.name;
        let start = convertOffsetToPosition(name.start, this.fileInfo!!.lines);
        let end = convertOffsetToPosition(name.start + name.length, this.fileInfo!.lines);

        let range = this.emitter.EmitRange(start, end);
        this.contains.push(range);

        let result = this.resultSets.get(range);
        if (result === undefined) {
            result = this.emitter.EmitResultSet();
            this.resultSets.set(range, result);
        }

        let defResult = this.emitter.EmitDefinitionResult();

        this.emitter.EmitNext(range, result);
        this.emitter.EmitTextDocumentDefinition(result, defResult);
        this.emitter.EmitItem(defResult, [range], this.document!);

        let moniker = this.emitter.EmitExportMoniker(this.makeMoniker(node.name.token.value), UniquenessLevel.scheme);

        this.emitter.EmitMonikerEdge(result, moniker);

        return true;
    }

    // TODO: Could possibly move this into visitFunction.
    //  I'm not sure of what the best way is to do this, since
    //  we don't always need to traverse these if we already know good info?
    override visitParameter(node: ParameterNode): boolean {
      return true;
    }

    private makeMoniker(last: string): string {
        return this.scopeStack.map((value) => value.name).join('.') + '.' + last;
    }

    private emitDefinition(resultSetID: number, rangeID: number) {
        let defResult = this.emitter.EmitDefinitionResult();

        this.emitter.EmitNext(rangeID, resultSetID);
        this.emitter.EmitTextDocumentDefinition(resultSetID, defResult);
        this.emitter.EmitItem(defResult, [range], this.document!);
    }

    // override visitName(node: NameNode): boolean {
    //   console.log("Visiting Node:", node);
    //   return true;
    // }
}
