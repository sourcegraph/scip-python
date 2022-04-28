import * as path from 'path';
import { AnalyzerFileInfo } from 'pyright-internal/analyzer/analyzerFileInfo';
import { getFileInfo } from 'pyright-internal/analyzer/analyzerNodeInfo';
import { ParseTreeWalker } from 'pyright-internal/analyzer/parseTreeWalker';
import { TypeEvaluator } from 'pyright-internal/analyzer/typeEvaluatorTypes';
import { convertOffsetToPosition } from 'pyright-internal/common/positionUtils';
import { TextRange } from 'pyright-internal/common/textRange';
import { TextRangeCollection } from 'pyright-internal/common/textRangeCollection';
import {
    AssignmentNode,
    ClassNode,
    ExpressionNode,
    FunctionNode,
    ImportFromAsNode,
    ImportFromNode,
    ImportNode,
    ModuleNameNode,
    ModuleNode,
    NameNode,
    ParameterNode,
    ParseNode,
    ParseNodeType,
    TypeAnnotationNode,
} from 'pyright-internal/parser/parseNodes';

import * as lsif from './lsif';
import * as Symbols from './symbols';
import {
    metaDescriptor,
    methodDescriptor,
    packageDescriptor,
    parameterDescriptor,
    termDescriptor,
    typeDescriptor,
} from './lsif-typescript/Descriptor';
import { LsifSymbol } from './LsifSymbol';
import { Position } from './lsif-typescript/Position';
import { Range } from './lsif-typescript/Range';
import { lsiftyped, LsifConfig } from './lib';
import * as ParseTreeUtils from 'pyright-internal/analyzer/parseTreeUtils';
import {
    ClassType,
    isClass,
    isClassInstance,
    isFunction,
    isModule,
    isTypeVar,
    isUnknown,
    Type,
} from 'pyright-internal/analyzer/types';
import { TypeStubExtendedWriter } from './TypeStubExtendedWriter';
import { SourceFile } from 'pyright-internal/analyzer/sourceFile';
import { extractParameterDocumentation } from 'pyright-internal/analyzer/docStringUtils';
import { isAliasDeclaration, isIntrinsicDeclaration } from 'pyright-internal/analyzer/declaration';
import { ConfigOptions, ExecutionEnvironment } from 'pyright-internal/common/configOptions';
import { versionToString } from 'pyright-internal/common/pythonVersion';
import { Program } from 'pyright-internal/analyzer/program';
import PythonEnvironment from './virtualenv/PythonEnvironment';
import { Counter } from './lsif-typescript/Counter';
import PythonPackage from './virtualenv/PythonPackage';
import { getFunctionOrClassDeclDocString } from 'pyright-internal/analyzer/typeDocStringUtils';
import * as Hardcoded from './hardcoded';
import { Event } from 'vscode-languageserver';
import { HoverResults } from 'pyright-internal/languageService/hoverProvider';

//  Useful functions for later, but haven't gotten far enough yet to use them.
//      extractParameterDocumentation
//      import { getModuleDocString } from 'pyright-internal/analyzer/typeDocStringUtils';

const token = {
    isCancellationRequested: false,
    onCancellationRequested: Event.None,
};

function parseNodeToRange(name: ParseNode, lines: TextRangeCollection<TextRange>): Range {
    const _start = convertOffsetToPosition(name.start, lines);
    const start = new Position(_start.line, _start.character);

    const _end = convertOffsetToPosition(name.start + name.length, lines);
    const end = new Position(_end.line, _end.character);

    return new Range(start, end);
}

export interface TreeVisitorConfig {
    document: lsif.lib.codeintel.lsiftyped.Document;
    sourceFile: SourceFile;
    evaluator: TypeEvaluator;
    program: Program;
    pyrightConfig: ConfigOptions;
    lsifConfig: LsifConfig;
    pythonEnvironment: PythonEnvironment;
}

export class TreeVisitor extends ParseTreeWalker {
    private fileInfo: AnalyzerFileInfo | undefined;
    private _imports: Map<number, ParseNode>;
    private _symbols: Map<number, LsifSymbol>;
    private symbolInformationForNode: Map<number, boolean>;

    private _docstringWriter: TypeStubExtendedWriter;

    private execEnv: ExecutionEnvironment;
    private cwd: string;
    private projectPackage: PythonPackage;
    private stdlibPackage: PythonPackage;
    private counter: Counter;

    public document: lsif.lib.codeintel.lsiftyped.Document;
    public evaluator: TypeEvaluator;
    public program: Program;

    constructor(public config: TreeVisitorConfig) {
        super();

        console.log('===== Working file:', config.sourceFile.getFilePath());

        if (!this.config.lsifConfig.projectName) {
            throw 'Must have project name';
        }

        if (!this.config.lsifConfig.projectVersion) {
            throw 'Must have project version';
        }

        this.evaluator = config.evaluator;
        this.program = config.program;
        this.document = config.document;
        this.counter = new Counter();

        // this._filepath = config.sourceFile.getFilePath();

        this.projectPackage = new PythonPackage(
            this.config.lsifConfig.projectName,
            this.config.lsifConfig.projectVersion,
            []
        );
        this._symbols = new Map();
        this._imports = new Map();
        this.symbolInformationForNode = new Map();

        this._docstringWriter = new TypeStubExtendedWriter(this.config.sourceFile, this.evaluator);

        this.execEnv = this.config.pyrightConfig.getExecutionEnvironments()[0];
        this.stdlibPackage = new PythonPackage('python-stdlib', versionToString(this.execEnv.pythonVersion), []);

        this.cwd = path.resolve(process.cwd());
    }

    override visitModule(node: ModuleNode): boolean {
        // TODO: Assert that this is within the project? I don't think
        // that I ever do anything like this _outside_ of the project.

        const fileInfo = getFileInfo(node);
        this.fileInfo = fileInfo;

        // Insert definition at the top of the file
        const pythonPackage = this.getPackageInfo(node, fileInfo.moduleName);
        if (pythonPackage) {
            if (pythonPackage === this.projectPackage) {
                const symbol = Symbols.makeModule(fileInfo.moduleName, pythonPackage);

                this.document.occurrences.push(
                    new lsiftyped.Occurrence({
                        symbol_roles: lsiftyped.SymbolRole.Definition,
                        symbol: symbol.value,
                        range: [0, 0, 1],
                    })
                );

                // TODO(documentation): See if hover can provide more information
                this.document.symbols.push(
                    new lsiftyped.SymbolInformation({
                        symbol: symbol.value,
                        documentation: [`(module) ${fileInfo.moduleName}`],
                    })
                );
            } else {
                throw 'unexpected package';
            }
        } else {
            // TODO: We could put a symbol here, but just as a readaccess, not as a definition
            //       But I'm not sure that's the correct thing -- this is only when we _visit_
            //       a module, so I don't think we should have to do that.
        }

        return true;
    }

    override visitClass(node: ClassNode): boolean {
        this._docstringWriter.visitClass(node);
        return true;
    }

    override visitTypeAnnotation(node: TypeAnnotationNode): boolean {
        // We are close to being able to look up a symbol, which could give us additional information here.
        //  Perhaps we should be using this for additional information for any given name?
        //  We can revisit this in visitName or perhaps when looking up the lsif symbol

        // If we see a type annotation and we are currently inside of a class,
        // that means that we are describing fields of a class (as far as I can tell),
        // so we need to push a new symbol
        const enclosingClass = ParseTreeUtils.getEnclosingClass(node, true);
        if (enclosingClass) {
            // TODO: Should this be typeExpression?
            // const type = this.evaluator.getType(node.valueExpression);
            // const hover = this.program.getHoverForPosition(

            const hoverResult = this.program.getHoverForPosition(
                this.fileInfo!.filePath,
                convertOffsetToPosition(node.start, this.fileInfo!.lines),
                'markdown',
                token
            );

            this.document.symbols.push(
                new lsiftyped.SymbolInformation({
                    symbol: this.getLsifSymbol(node).value,

                    // TODO: Get the documentation for a type annotation
                    documentation: _formatHover(hoverResult!),
                })
            );
        }

        return true;
    }

    override visitAssignment(node: AssignmentNode): boolean {
        // Probably not performant, we should figure out if we can tell that
        // this particular spot is a definition or not, or potentially cache
        // per file or something?
        if (node.leftExpression.nodeType == ParseNodeType.Name) {
            const decls = this.evaluator.getDeclarationsForNameNode(node.leftExpression) || [];
            if (decls.length > 0) {
                let dec = decls[0];
                if (dec.node.parent && dec.node.parent.id == node.id) {
                    this._docstringWriter.visitAssignment(node);

                    let documentation = [];

                    let assignmentDoc = this._docstringWriter.docstrings.get(node.id);
                    if (assignmentDoc) {
                        documentation.push('```python\n' + assignmentDoc.join('\n') + '\n```');
                    }

                    // node.typeAnnotationComment
                    this.document.symbols.push(
                        new lsiftyped.SymbolInformation({
                            symbol: this.getLsifSymbol(dec.node).value,
                            documentation,
                        })
                    );
                }
            }
        }

        return true;
    }

    override visitFunction(node: FunctionNode): boolean {
        this._docstringWriter.visitFunction(node);

        // does this do return types?
        const documentation = [];
        let stubs = this._docstringWriter.docstrings.get(node.id)!;
        documentation.push('```python\n' + stubs.join('\n') + '\n```');

        let functionDoc = ParseTreeUtils.getDocString(node.suite.statements);
        if (functionDoc) {
            documentation.push(functionDoc);
        }

        this.document.symbols.push(
            new lsiftyped.SymbolInformation({
                symbol: this.getLsifSymbol(node).value,
                documentation,
            })
        );

        // Since we are manually handling various aspects, we need to make sure that we handle
        // - decorators
        // - name
        // - return type
        // - parameters
        node.decorators.forEach((decoratorNode) => this.walk(decoratorNode));
        this.visitName(node.name);
        if (node.returnTypeAnnotation) {
            this.walk(node.returnTypeAnnotation);
        }

        // Walk the parameters individually, with additional information about the function
        node.parameters.forEach((paramNode: ParameterNode) => {
            const symbol = this.getLsifSymbol(paramNode);

            // This pulls documentation of various styles from function docstring
            const paramDocstring = paramNode.name
                ? extractParameterDocumentation(functionDoc, paramNode.name!.value)
                : undefined;

            const paramDocumentation = paramDocstring ? [paramDocstring] : undefined;

            this.document.symbols.push(
                new lsiftyped.SymbolInformation({
                    symbol: symbol.value,
                    documentation: paramDocumentation,
                })
            );

            // Walk the parameter child nodes
            // TODO: Consider calling these individually so we can pass more metadata directly
            this.walk(paramNode);
        });

        // Walk the function definition
        this.walk(node.suite);

        return false;
    }

    // `import requests`
    //         ^^^^^^^^  reference requests
    override visitImport(node: ImportNode): boolean {
        this._docstringWriter.visitImport(node);

        // TODO(0.2): Resolve all these weird import things.
        for (const listNode of node.list) {
            let lastName = listNode.module.nameParts[listNode.module.nameParts.length - 1];
            let decls = this.evaluator.getDeclarationsForNameNode(lastName);
            if (!decls || decls.length === 0) {
                continue;
            }

            let decl = decls[0];
            let filepath = path.resolve(decl.path);
            if (filepath.startsWith(this.cwd)) {
                let symbol = LsifSymbol.global(
                    LsifSymbol.global(
                        LsifSymbol.package(this.projectPackage.name, this.projectPackage.version),
                        packageDescriptor(_formatModuleName(listNode.module))
                    ),
                    metaDescriptor('__init__')
                );

                this.document.occurrences.push(
                    new lsiftyped.Occurrence({
                        symbol_roles: lsiftyped.SymbolRole.ReadAccess,
                        symbol: symbol.value,
                        range: parseNodeToRange(listNode, this.fileInfo!.lines).toLsif(),
                    })
                );
            }

            // This isn't correct: gets the current file, not the import file
            // let filepath = getFileInfoFromNode(_node)!.filePath;
            // return this.config.pythonEnvironment.getPackageForModule(moduleName);

            // TODO: This is the same problem as from visitImportFrom,
            //  I can't get this to resolve to a type that is useful for getting
            //  hover information.
            //
            //  So we will have to figure out something else (perhaps we just load the file? and then get the docs?)
            //  Not important enough for now though. Also should make sure we only emit the symbols once
            //
            // let importName = listNode.module.nameParts[listNode.module.nameParts.length - 1];
            // let resolved = this.evaluator.resolveAliasDeclaration(decls[0], true, true);
            // let resolvedInfo = this.evaluator.resolveAliasDeclarationWithInfo(decls[0], true, true);
        }

        return true;
    }

    override visitImportFrom(node: ImportFromNode): boolean {
        // Graveyward of attempts to find docstring.
        //  Maybe someday I'll be smarter.
        // this.pushNewNameNodeOccurence(node.module.nameParts[0], LsifSymbol.local(this.counter.next()));
        // const decl = this.evaluator.getDeclarationsForNameNode(node.module.nameParts[0])![0]
        // const resolvedDecl = this.evaluator.resolveAliasDeclaration(decl, /* resolveLocalNames */ true);
        // const moduleName = node.module.nameParts.map(name => name.value).join('.');
        // const importedModuleType = ModuleType.create(moduleName, decl.path);
        // @ts-ignore
        // getModuleDocString(ModuleType.create(node.module.nameParts[0].value,

        const role = lsiftyped.SymbolRole.ReadAccess;
        const symbol = this.getLsifSymbol(node.module);
        this.document.occurrences.push(
            new lsiftyped.Occurrence({
                symbol_roles: role,
                symbol: symbol.value,
                range: parseNodeToRange(node.module, this.fileInfo!.lines).toLsif(),
            })
        );

        // TODO: Check if we already have this?
        // this.document.symbols.push(
        //     new lsiftyped.SymbolInformation({
        //         symbol: symbol.value,
        //         documentation: ['this is a module'],
        //     })
        // );

        for (const importNode of node.imports) {
            this._imports.set(importNode.id, importNode);
        }

        return true;
    }

    override visitImportFromAs(_node: ImportFromAsNode): boolean {
        // console.log("visitImportFromAs", node.id, node.name.value);
        //
        // const decls = this.evaluator.getDeclarationsForNameNode(node.name);
        // if (!decls) {
        //     return false;
        // }
        // const decl = decls[0];
        // // console.log("ImportFromAs", node.name.token, decls);
        //
        // const resolved = this.evaluator.resolveAliasDeclaration(decl, true);
        // if (!resolved) {
        //     return false;
        // }
        //
        // const type_ = this.evaluator.getTypeForDeclaration(resolved);
        // console.log("  ", type_);

        return true;
    }

    override visitName(node: NameNode): boolean {
        if (!node.parent) {
            // return;
            throw 'No parent for named node';
        }

        if (node.parent.nodeType == ParseNodeType.Class) {
            console.log('==> Inside class name now');
        }

        console.log(node.token.value, ParseTreeUtils.printParseNodeType(node.parent.nodeType));

        const parent = node.parent;
        const decls = this.evaluator.getDeclarationsForNameNode(node) || [];
        if (decls.length > 0) {
            // TOOD: Should probably just loop over the declarations
            const decl = decls[0];
            if (!decl.node) {
                switch (parent.nodeType) {
                    case ParseNodeType.ModuleName:
                        let symbol = Symbols.makeModuleName(node, decl, this.evaluator);
                        if (symbol) {
                            this.pushNewNameNodeOccurence(node, symbol);
                        }

                        return true;
                    default:
                        throw 'unhandled missing node';
                }
            }

            const type = this.evaluator.getTypeForDeclaration(decl);

            const resolved = this.evaluator.resolveAliasDeclaration(decl, true, true);
            const resolvedType = this.evaluator.getTypeForDeclaration(resolved!);

            // TODO: Handle intrinsics more usefully (using declaration probably)
            if (isIntrinsicDeclaration(decl)) {
                this.pushNewNameNodeOccurence(node, this.getIntrinsicSymbol(node));
                return true;
            }

            // Handle aliases differently
            //  (we want to track them down...)
            // Fo
            if (resolved && decl.node !== resolved.node) {
                // TODO: Check this later when I'm not embarassed on twitch
                //       Errored on `sam.py`
                // if (!this._imports.has(decl.node.id)) {
                //     throw 'This should only happen for imports';
                // }

                if (type) {
                    this.pushTypeReference(node, decl.node, type);
                    return true;
                }

                if (resolved && resolvedType) {
                    console.log('  => using resolved');
                    this.pushTypeReference(node, resolved.node, resolvedType);
                    return true;
                }

                // TODO: Handle inferred types here
                console.log('SKIP:', node.token.value, resolvedType);

                this.pushNewNameNodeOccurence(node, this.getLsifSymbol(decl.node));
                return true;
            }

            // if (this._imports.has(decl.node.id)) {
            //     // TODO: ExpressionNode cast is required?
            //     const evalutedType = this.evaluator.getType(decl.node as ExpressionNode);
            //     if (evalutedType) {
            //         this.pushTypeReference(node, decl.node, evalutedType!);
            //     }
            //
            //     return true;
            // }

            // TODO: Write a more rigorous check for if this node is a
            // definition node. Probably some util somewhere already for
            // that (need to explore pyright some more)
            if (decl.node.id == node.parent!.id) {
                if (parent.nodeType == ParseNodeType.Class) {
                    const symbol = this.getLsifSymbol(parent);

                    const documentation = [];
                    const stub = this._docstringWriter.docstrings.get(parent.id)!;
                    if (stub) {
                        documentation.push('```python\n' + stub.join('\n') + '\n```');
                    }

                    const doc = ParseTreeUtils.getDocString(parent.suite.statements)?.trim();
                    if (doc) {
                        documentation.push(doc);
                    }

                    this.document.symbols.push(
                        new lsiftyped.SymbolInformation({
                            symbol: symbol.value,
                            documentation,
                        })
                    );

                    // this.walk(node.name);
                    // this.walk(node.suite);
                }

                this.pushNewNameNodeOccurence(node, this.getLsifSymbol(decl.node), lsiftyped.SymbolRole.Definition);
                return true;
            }

            if (isAliasDeclaration(decl)) {
                this.pushNewNameNodeOccurence(node, this.getLsifSymbol(decl.node));
                return true;
            }

            if (decl.node.id == node.id) {
                const symbol = this.getLsifSymbol(decl.node);
                this.pushNewNameNodeOccurence(node, symbol, lsiftyped.SymbolRole.Definition);
                return true;
            }

            const existingLsifSymbol = this.rawGetLsifSymbol(decl.node);
            if (existingLsifSymbol) {
                this.pushNewNameNodeOccurence(node, existingLsifSymbol, lsiftyped.SymbolRole.ReadAccess);
                return true;
            }

            // TODO: WriteAccess isn't really implemented yet on my side
            // Now this must be a reference, so let's reference the right thing.
            const symbol = this.getLsifSymbol(decl.node);
            this.pushNewNameNodeOccurence(node, symbol);
            return true;
        }

        if (node && (ParseTreeUtils.isImportModuleName(node) || ParseTreeUtils.isFromImportModuleName(node))) {
            return true;
        }

        const builtinType = this.evaluator.getBuiltInType(node, node.value);
        if (!isUnknown(builtinType)) {
            // TODO: We're still missing documentation for builtin functions,
            // so that's a bit of a shame...

            if (isFunction(builtinType)) {
                // TODO: IntrinsicRefactor
                this.document.symbols.push(
                    new lsiftyped.SymbolInformation({
                        symbol: this.getIntrinsicSymbol(node).value,
                        documentation: [builtinType.details.docString || ''],
                    })
                );
            } else {
                // TODO: IntrinsicRefactor
                this.pushNewNameNodeOccurence(node, this.getIntrinsicSymbol(node));
            }

            return true;
        } else {
            // let scope = getScopeForNode(node)!;
            // let builtinScope = getBuiltInScope(scope);
        }

        return true;
    }

    private rawGetLsifSymbol(node: ParseNode): LsifSymbol | undefined {
        return this._symbols.get(node.id);
    }

    private rawSetLsifSymbol(node: ParseNode, sym: LsifSymbol): void {
        this._symbols.set(node.id, sym);
    }

    private getLsifSymbol(node: ParseNode): LsifSymbol {
        const existing = this.rawGetLsifSymbol(node);
        if (existing) {
            return existing;
        }

        // not yet right, but good first approximation
        // const scope = getScopeForNode(node)!;
        // if (false && canBeLocal(node) && scope.type != ScopeType.Builtin) {
        //     // const newSymbol = LsifSymbol.local(this.counter.next());
        //     // this._symbols.set(node.id, newSymbol);
        //     // return newSymbol;
        // }

        const nodeFileInfo = getFileInfo(node);
        if (!nodeFileInfo) {
            throw 'no file info';
        }

        const moduleName = nodeFileInfo.moduleName;
        if (moduleName == 'builtins') {
            return this.makeBuiltinLsifSymbol(node, nodeFileInfo);
        } else if (Hardcoded.stdlib_module_names.has(moduleName)) {
            // return this.makeBuiltinLsifSymbol(node, nodeFileInfo);
            return this.makeLsifSymbol(this.stdlibPackage, moduleName, node);
        }

        const pythonPackage = this.getPackageInfo(node, moduleName);
        if (!pythonPackage) {
            if (this.rawGetLsifSymbol(node)) {
                return this.rawGetLsifSymbol(node)!;
            }

            // console.log(`no package info ${moduleName} ${node.nodeType}`);
            // let newSymbol = this.makeLsifSymbol(this.projectPackage, "_", node);
            const newSymbol = LsifSymbol.local(this.counter.next());
            this.rawSetLsifSymbol(node, newSymbol);
            this.emitSymbolInformationOnce(
                node,
                newSymbol /* () => {
                const hoverResult = this.program.getHoverForPosition(
                    nodeFileInfo.filePath,
                    convertOffsetToPosition(node.start, nodeFileInfo.lines),
                    'markdown',
                    token
                );

                if (!hoverResult) {
                    console.log("OH NO NO NO", nodeFileInfo.filePath)
                    // throw 'asdf';
                    return [];
                }

                return _formatHover(hoverResult);
            } */
            );
            return newSymbol;
        }

        let newSymbol = this.makeLsifSymbol(pythonPackage, moduleName, node);
        this.rawSetLsifSymbol(node, newSymbol);

        return newSymbol;
    }

    // TODO: This isn't good anymore
    private getIntrinsicSymbol(_node: ParseNode): LsifSymbol {
        // return this.makeLsifSymbol(this._stdlibPackage, 'intrinsics', node);

        // TODO: Should these not be locals?
        return LsifSymbol.local(this.counter.next());
    }

    private makeBuiltinLsifSymbol(node: ParseNode, _info: AnalyzerFileInfo): LsifSymbol {
        // TODO: Can handle special cases here if we need to.
        //  Hopefully we will not need any though.

        return this.makeLsifSymbol(this.stdlibPackage, 'builtins', node);
    }

    // the pythonPackage is for the
    private makeLsifSymbol(pythonPackage: PythonPackage, moduleName: string, node: ParseNode): LsifSymbol {
        // const nodeFilePath = path.resolve(nodeFileInfo.filePath);

        switch (node.nodeType) {
            case ParseNodeType.Module:
                // const version = this.getPackageInfo(node, moduleName);
                // if (version) {
                //     return LsifSymbol.package(moduleName, version);
                // } else {
                //     return LsifSymbol.local(this.counter.next());
                // }
                if (moduleName !== 'builtins') {
                    return LsifSymbol.global(
                        LsifSymbol.package(pythonPackage.name, pythonPackage.version),
                        packageDescriptor(moduleName)
                    );
                }

                const version = this.getPackageInfo(node, moduleName);
                return LsifSymbol.global(
                    LsifSymbol.package(pythonPackage.name, pythonPackage.version),
                    packageDescriptor(moduleName)
                );

            case ParseNodeType.ModuleName:
                // from .modulename import X
                //      ^^^^^^^^^^^ -> modulename/__init__

                return LsifSymbol.global(
                    LsifSymbol.global(
                        LsifSymbol.package(pythonPackage.name, pythonPackage.version),
                        packageDescriptor(node.nameParts.map((namePart) => namePart.value).join('.'))
                    ),
                    metaDescriptor('__init__')
                );

            case ParseNodeType.MemberAccess:
                throw 'oh ya';

            case ParseNodeType.Parameter:
                if (!node.name) {
                    console.warn('TODO: Paramerter with no name', node);
                    return LsifSymbol.local(this.counter.next());
                }

                return LsifSymbol.global(this.getLsifSymbol(node.parent!), parameterDescriptor(node.name.value));

            case ParseNodeType.Class:
                return LsifSymbol.global(
                    this.getLsifSymbol(node.parent!),
                    typeDescriptor((node as ClassNode).name.value)
                );

            case ParseNodeType.Function:
                let cls = ParseTreeUtils.getEnclosingClass(node, false);
                if (cls) {
                    return LsifSymbol.global(
                        this.getLsifSymbol(cls),
                        methodDescriptor((node as FunctionNode).name!.value)
                    );
                }

                return LsifSymbol.global(
                    this.getLsifSymbol(node.parent!),
                    methodDescriptor((node as FunctionNode).name!.value)
                );

            case ParseNodeType.Suite:
                if (node.parent) {
                    return this.getLsifSymbol(node.parent!);
                }

                // TODO: Not sure what to do about this...
                //  I don't know if we ever need to include this at all.
                return LsifSymbol.global(this.getLsifSymbol(node.parent!), metaDescriptor('#'));

            case ParseNodeType.Name:
                const enclosingSuite = ParseTreeUtils.getEnclosingSuite(node as ParseNode);
                if (enclosingSuite) {
                    const enclosingParent = enclosingSuite.parent;
                    if (enclosingParent) {
                        switch (enclosingParent.nodeType) {
                            case ParseNodeType.Function:
                            case ParseNodeType.Lambda:
                                return LsifSymbol.local(this.counter.next());
                        }
                    }
                }

                return LsifSymbol.global(
                    this.getLsifSymbol(enclosingSuite || node.parent!),
                    termDescriptor((node as NameNode).value)
                );

            case ParseNodeType.TypeAnnotation:
                switch (node.valueExpression.nodeType) {
                    case ParseNodeType.Name:
                        return LsifSymbol.global(
                            this.getLsifSymbol(ParseTreeUtils.getEnclosingSuite(node) || node.parent!),
                            termDescriptor(node.valueExpression.value)
                        );
                    default:
                        throw 'Unhandled type annotation';
                }

            case ParseNodeType.FunctionAnnotation:
                return LsifSymbol.global(
                    this.getLsifSymbol(node.parent!),
                    // Descriptor.term((node as TypeAnnotationNode).typeAnnotation)
                    termDescriptor('FuncAnnotation')
                );

            case ParseNodeType.Decorator:
                // throw 'Should not handle decorator directly';
                return LsifSymbol.local(this.counter.next());

            case ParseNodeType.Assignment:
                // TODO: Check if we have more information
                //  Might even want to use enclosingModule
                const enclosing = ParseTreeUtils.getEnclosingClassOrFunction(node);
                if (enclosing) {
                    if (pythonPackage.version) {
                        return this.getLsifSymbol(node.parent!);
                    } else {
                        return LsifSymbol.local(this.counter.next());
                    }
                }

                return this.getLsifSymbol(node.parent!);

            // TODO: Handle imports better
            // TODO: `ImportAs` is pretty broken it looks like
            case ParseNodeType.ImportAs:
                // @ts-ignore Pretty sure this always is true
                let info = node.module.importInfo;
                return Symbols.pythonModule(this, node, info.importName);

            case ParseNodeType.ImportFrom:
                // TODO(0.2): Resolve all these weird import things.
                console.log('ImportFrom');
                return LsifSymbol.empty();

            case ParseNodeType.ImportFromAs:
                // TODO(0.2): Resolve all these weird import things.
                const decls = this.evaluator.getDeclarationsForNameNode(node.name);
                if (decls) {
                    const decl = decls[0];
                    const resolved = this.evaluator.resolveAliasDeclaration(decl, true)!;
                    console.log('ImportFromAs', node.name.token, resolved);

                    if (resolved.node) {
                        const symbol = this.getLsifSymbol(resolved.node);
                        this.emitSymbolInformationOnce(resolved.node, symbol);

                        return symbol;
                    }

                    // const type_ = this.evaluator.getTypeForDeclaration(resolved);

                    // console.log("  ", decl)
                    // console.log(type_)

                    // const type_ = this.evaluator.getType
                    // console.log(this.typeToSymbol(decl.node,
                }
                return LsifSymbol.local(this.counter.next());

            case ParseNodeType.Lambda:
                return LsifSymbol.local(this.counter.next());

            // Some nodes, it just makes sense to return whatever their parent is.
            case ParseNodeType.With:
            case ParseNodeType.If:
            case ParseNodeType.For:
            // To explore:
            case ParseNodeType.StatementList:
            case ParseNodeType.Tuple:
            case ParseNodeType.ListComprehension:
            case ParseNodeType.ListComprehensionFor:
            case ParseNodeType.ListComprehensionIf:
            case ParseNodeType.Argument:
            case ParseNodeType.BinaryOperation:
                // There is some confusion for me about whether we should do this
                // vs the other idea...
                // return LsifSymbol.empty();

                return this.getLsifSymbol(node.parent!);

            default:
                // throw `Unhandled: ${node.nodeType}\n`;
                console.warn(`Unhandled: ${node.nodeType}`);
                if (!node.parent) {
                    return LsifSymbol.local(this.counter.next());
                }

                return this.getLsifSymbol(node.parent!);
        }
    }

    // Take a `Type` from pyright and turn that into an LSIF symbol.
    private typeToSymbol(node: NameNode, typeObj: Type): LsifSymbol {
        if (isFunction(typeObj)) {
            const decl = typeObj.details.declaration;
            if (!decl) {
                // throw 'Unhandled missing declaration for type: function';
                console.warn('Missing Function Decl:', node.token.value, typeObj);
                return LsifSymbol.local(this.counter.next());
            }

            // const pythonPackage = this.getPackageInfo(node, decl.moduleName)!;
            return this.getLsifSymbol(decl.node);
            // return LsifSymbol.global(
            //     // LsifSymbol.package(decl.moduleName, pythonPackage.version),
            //     methodDescriptor(node.value)
            // );
        } else if (isClass(typeObj)) {
            const pythonPackage = this.getPackageInfo(node, typeObj.details.moduleName)!;
            return LsifSymbol.global(
                LsifSymbol.global(
                    LsifSymbol.package(pythonPackage.name, pythonPackage.version),
                    packageDescriptor(typeObj.details.moduleName)
                ),
                typeDescriptor(node.value)
            );
        } else if (isClassInstance(typeObj)) {
            typeObj = typeObj as ClassType;
            throw 'oh yayaya';
            // return LsifSymbol.global(this.getLsifSymbol(decl.node), Descriptor.term(node.value)).value;
        } else if (isTypeVar(typeObj)) {
            throw 'typevar';
        } else if (isModule(typeObj)) {
            // throw `module ${typeObj}`;
            const pythonPackage = this.getPackageInfo(node, typeObj.moduleName)!;
            return LsifSymbol.global(
                LsifSymbol.package(typeObj.moduleName, pythonPackage.version),
                metaDescriptor('__init__')
            );
        }

        // throw 'unreachable typeObj';
        // const mod = LsifSymbol.sourceFile(this.getPackageSymbol(), [this.fileInfo!.moduleName]);
        // const mod = LsifSymbol.global(this.getPackageSymbol(), packageDescriptor(this.fileInfo!.moduleName));
        // return LsifSymbol.global(mod, termDescriptor(node.value));
        console.warn(`Unreachable TypeObj: ${node.value}: ${typeObj.category}`);
        return LsifSymbol.local(this.counter.next());
    }

    // TODO: Could maybe just remove this now.
    private pushTypeReference(node: NameNode, declNode: ParseNode, typeObj: Type): void {
        const symbol = this.typeToSymbol(node, typeObj);
        this.rawSetLsifSymbol(declNode, symbol);
        this.pushNewNameNodeOccurence(node, symbol);
    }

    // Might be the only way we can add new occurrences?
    private pushNewNameNodeOccurence(
        node: NameNode,
        symbol: LsifSymbol,
        role: number = lsiftyped.SymbolRole.ReadAccess
    ): void {
        if (symbol.value.trim() != symbol.value) {
            console.trace(`Invalid symbol dude ${node.value} -> ${symbol.value}`);
        }

        this.document.occurrences.push(
            new lsiftyped.Occurrence({
                symbol_roles: role,
                symbol: symbol.value,
                range: parseNodeToRange(node, this.fileInfo!.lines).toLsif(),
            })
        );
    }

    // TODO: Can remove module name? or should I pass more info in...
    public getPackageInfo(node: ParseNode, moduleName: string): PythonPackage | undefined {
        // TODO: Special case stdlib?

        // TODO: This seems really bad performance wise, but we can test that part out later a bit more.
        const nodeFileInfo = getFileInfo(node)!;
        const nodeFilePath = path.resolve(nodeFileInfo.filePath);

        // TODO: Should use files from the package to determine this -- should be able to do that quite easily.
        if (nodeFilePath.startsWith(this.cwd)) {
            return this.projectPackage;
        }

        // This isn't correct: gets the current file, not the import file
        // let filepath = getFileInfoFromNode(_node)!.filePath;
        return this.config.pythonEnvironment.getPackageForModule(moduleName);
    }

    private emitSymbolInformationOnce(node: ParseNode, symbol: LsifSymbol) {
        if (this.symbolInformationForNode.get(node.id)) {
            return;
        }

        this.symbolInformationForNode.set(node.id, true);

        const nodeFileInfo = getFileInfo(node)!;
        const hoverResult = this.program.getHoverForPosition(
            nodeFileInfo.filePath,
            convertOffsetToPosition(node.start, nodeFileInfo.lines),
            'markdown',
            token
        );

        if (hoverResult) {
            this.document.symbols.push(
                new lsiftyped.SymbolInformation({
                    symbol: symbol.value,
                    documentation: _formatHover(hoverResult),
                })
            );

            return;
        }

        // @ts-ignore
        // console.log('Docstring:', getFunctionOrClassDeclDocString(node));

        this._docstringWriter.walk(node);
        const docs = '```python\n' + (this._docstringWriter.docstrings.get(node.id) || []).join('\n') + '\n```';
        this.document.symbols.push(
            new lsiftyped.SymbolInformation({
                symbol: symbol.value,
                documentation: [docs],
            })
        );
    }
}

function _formatModuleName(node: ModuleNameNode): string {
    let moduleName = '';
    for (let i = 0; i < node.leadingDots; i++) {
        moduleName = moduleName + '.';
    }

    moduleName += node.nameParts.map((part) => part.value).join('.');

    return moduleName;
}

// Based off of: convertHoverResults
//  We can do slightly differently because we expected multiple different sections
function _formatHover(hoverResults: HoverResults): string[] {
    return hoverResults.parts.map((part) => {
        if (part.python) {
            return '```python\n' + part.text + '\n```';
        } else {
            return part.text;
        }
    });
}
