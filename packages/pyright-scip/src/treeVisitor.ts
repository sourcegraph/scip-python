import * as path from 'path';
import { AnalyzerFileInfo } from 'pyright-internal/analyzer/analyzerFileInfo';
import { getFileInfo, getImportInfo } from 'pyright-internal/analyzer/analyzerNodeInfo';
import { ParseTreeWalker } from 'pyright-internal/analyzer/parseTreeWalker';
import { TypeEvaluator } from 'pyright-internal/analyzer/typeEvaluatorTypes';
import { convertOffsetToPosition } from 'pyright-internal/common/positionUtils';
import { TextRange } from 'pyright-internal/common/textRange';
import { TextRangeCollection } from 'pyright-internal/common/textRangeCollection';
import {
    AssignmentNode,
    ClassNode,
    FunctionNode,
    ImportAsNode,
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
import { ScipSymbol } from './ScipSymbol';
import { Position } from './lsif-typescript/Position';
import { Range } from './lsif-typescript/Range';
import { lsiftyped, ScipConfig } from './lib';
import * as ParseTreeUtils from 'pyright-internal/analyzer/parseTreeUtils';
import { ClassType, Type, TypeCategory } from 'pyright-internal/analyzer/types';
import * as Types from 'pyright-internal/analyzer/types';
import { TypeStubExtendedWriter } from './TypeStubExtendedWriter';
import { SourceFile } from 'pyright-internal/analyzer/sourceFile';
import { extractParameterDocumentation } from 'pyright-internal/analyzer/docStringUtils';
import { DeclarationType, isAliasDeclaration, isIntrinsicDeclaration } from 'pyright-internal/analyzer/declaration';
import { ConfigOptions, ExecutionEnvironment } from 'pyright-internal/common/configOptions';
import { versionToString } from 'pyright-internal/common/pythonVersion';
import { Program } from 'pyright-internal/analyzer/program';
import PythonEnvironment from './virtualenv/PythonEnvironment';
import { Counter } from './lsif-typescript/Counter';
import PythonPackage from './virtualenv/PythonPackage';
import { getModuleDocString } from 'pyright-internal/analyzer/typeDocStringUtils';
import * as Hardcoded from './hardcoded';
import { Event } from 'vscode-languageserver';
import { HoverResults } from 'pyright-internal/languageService/hoverProvider';
import { convertDocStringToMarkdown } from 'pyright-internal/analyzer/docStringConversion';
import { assert } from 'pyright-internal/common/debug';

//  Useful functions for later, but haven't gotten far enough yet to use them.
//      extractParameterDocumentation
//      import { getModuleDocString } from 'pyright-internal/analyzer/typeDocStringUtils';
//      this.evaluator.printType(...)

// TODO: Make this a command line flag
var errorLevel = 0;
function softAssert(expression: any, message: string, ...exprs: any) {
    if (!expression) {
        if (errorLevel > 1) {
            console.log(message, ...exprs);
            assert(expression, message);
        } else if (errorLevel === 1) {
            console.warn(message, ...exprs);
        }
    }

    return expression;
}

const _msgs = new Set<string>();
const log = {
    once: (msg: string) => {
        if (_msgs.has(msg)) {
            return;
        }

        _msgs.add(msg);

        console.log(msg);
    },

    debug: (...exprs: any[]) => {
        if (errorLevel >= 2) {
            console.log(...exprs);
        }
    },

    info: (...exprs: any[]) => {
        if (errorLevel >= 1) {
            console.log(...exprs);
        }
    },
};

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
    scipConfig: ScipConfig;
    pythonEnvironment: PythonEnvironment;
    globalSymbols: Map<number, ScipSymbol>;
}

export class TreeVisitor extends ParseTreeWalker {
    private fileInfo: AnalyzerFileInfo | undefined;
    private _imports: Map<number, ParseNode>;
    private symbolInformationForNode: Set<string>;

    /// maps node.id -> ScipSymbol, for document local symbols
    private documentSymbols: Map<number, ScipSymbol>;
    /// maps node.id: ScipSymbol, for globally accesible symbols
    private globalSymbols: Map<number, ScipSymbol>;

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

        // In dev mode, we error instead of just warn
        if (this.config.scipConfig.dev) {
            errorLevel = 2;
        }

        log.info('=> Working file:', config.sourceFile.getFilePath(), '<==');

        if (!this.config.scipConfig.projectName) {
            throw 'Must have project name';
        }

        if (!this.config.scipConfig.projectVersion) {
            throw 'Must have project version';
        }

        this.evaluator = config.evaluator;
        this.program = config.program;
        this.document = config.document;
        this.counter = new Counter();

        this.projectPackage = new PythonPackage(
            this.config.scipConfig.projectName,
            this.config.scipConfig.projectVersion,
            []
        );

        this.documentSymbols = new Map();
        this.globalSymbols = this.config.globalSymbols;
        this._imports = new Map();
        this.symbolInformationForNode = new Set();

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
            if (softAssert(pythonPackage === this.projectPackage, 'expected pythonPackage to be this.projectPackage')) {
                const symbol = Symbols.makeModule(fileInfo.moduleName, pythonPackage);

                this.document.occurrences.push(
                    new lsiftyped.Occurrence({
                        symbol_roles: lsiftyped.SymbolRole.Definition,
                        symbol: symbol.value,
                        range: [0, 0, 0],
                    })
                );

                const documentation = [`(module) ${fileInfo.moduleName}`];
                const docstring = ParseTreeUtils.getDocString(node.statements);
                if (docstring) {
                    documentation.push(convertDocStringToMarkdown(docstring.trim()));
                }

                this.document.symbols.push(
                    new lsiftyped.SymbolInformation({
                        symbol: symbol.value,
                        documentation,
                    })
                );
            }
        } else {
            // TODO: We could put a symbol here, but just as a readaccess, not as a definition
            //       But I'm not sure that's the correct thing -- this is only when we _visit_
            //       a module, so I don't think we should have to do that.
            softAssert(false, 'Unhandled edge: read access');
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
                ? extractParameterDocumentation(functionDoc || '', paramNode.name!.value)
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

        for (const listNode of node.list) {
            let symbolNameNode: NameNode;
            if (listNode.alias) {
                // The symbol name is defined by the alias.
                symbolNameNode = listNode.alias;
            } else {
                // There was no alias, so we need to use the first element of
                // the name parts as the symbol.
                symbolNameNode = listNode.module.nameParts[0];
            }

            if (!symbolNameNode) {
                // This can happen in certain cases where there are parse errors.
                continue;
            }

            // Look up the symbol to find the alias declaration.
            let symbolType = this.getAliasedSymbolTypeForName(listNode, symbolNameNode.value);
            if (symbolType) {
                if (symbolType.category == TypeCategory.Unknown) {
                    continue;
                }

                if (symbolType.category !== TypeCategory.Module) {
                    throw 'only modules should be modules' + symbolType.category;
                }

                // TODO: get the right package
                // const pythonPackage = this.getPackageInfo(listNode, symbolType.moduleName);
                let pythonPackage = this.config.pythonEnvironment.getPackageForModule(symbolType.moduleName);
                if (!pythonPackage) {
                    // TODO: Should probably configure this to be disabled if needed
                    pythonPackage = this.config.pythonEnvironment.guessPackage(symbolType.moduleName);
                }

                if (!pythonPackage) {
                    continue;
                }

                let symbol = ScipSymbol.global(
                    ScipSymbol.global(
                        ScipSymbol.package(pythonPackage.name, pythonPackage.version),
                        packageDescriptor(symbolType.moduleName)
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

                // TODO: Probably want to do this some other way, cause
                // I don't like counting on putting information in here
                // (would rather use emitSymbolInformationOnce instead)
                if (this.symbolInformationForNode.has(symbol.value)) {
                    continue;
                }

                const documentation = [`(module) ${symbolType.moduleName}`];
                if (symbolType.docString) {
                    documentation.push('```\n' + symbolType.docString + '```');
                } else {
                    // TODO(multi_decls)
                    let decls = this.evaluator.getDeclarationsForNameNode(symbolNameNode)!;
                    const resolved = this.evaluator.resolveAliasDeclaration(decls[0], true, true);
                    const moduleDoc = getModuleDocString(
                        symbolType,
                        resolved,
                        this.program._createSourceMapper(this.execEnv, true, true)
                    );
                    if (moduleDoc) {
                        documentation.push(moduleDoc);
                    }
                }

                this.emitSymbolInformationOnce(listNode, symbol, documentation);
            }
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

    // import aliased as A
    //        ^^^^^^^ node.module (create new reference)
    //                   ^ node.alias (create new local definition)
    override visitImportAs(node: ImportAsNode): boolean {
        // TODO: Think about how to do this good later in visitName, but for now
        // it does seem like an OK place to declare this
        // console.log(_formatModuleName(node.module))
        const moduleName = _formatModuleName(node.module);

        const importInfo = getImportInfo(node.module);
        if (
            importInfo &&
            importInfo.resolvedPaths[0] &&
            path.resolve(importInfo.resolvedPaths[0]).startsWith(this.cwd)
        ) {
            const symbol = Symbols.makeModule(moduleName, this.projectPackage);
            this.pushNewOccurrence(node.module, symbol);
            this.document.symbols.push(
                new lsiftyped.SymbolInformation({
                    symbol: symbol.value,
                })
            );
        } else {
            const pythonPackage = this.moduleNameNodeToPythonPackage(node.module);

            if (pythonPackage) {
                const symbol = Symbols.makeModule(moduleName, pythonPackage);
                this.pushNewOccurrence(node.module, symbol);
                this.document.symbols.push(
                    new lsiftyped.SymbolInformation({
                        symbol: symbol.value,
                    })
                );
            }
        }

        if (node.alias) {
            this.getLocalForDeclaration(node.alias);
        }

        return true;
    }

    override visitImportFromAs(_node: ImportFromAsNode): boolean {
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
            throw `No parent for named node: ${node.token.value}`;
        }

        const parent = node.parent;
        log.debug(node.token.value, 'parent:', ParseTreeUtils.printParseNodeType(parent.nodeType));

        const decls = this.evaluator.getDeclarationsForNameNode(node) || [];
        if (decls.length > 0) {
            // TODO(multi_decls)

            const decl = decls[0];
            if (!decl.node) {
                switch (parent.nodeType) {
                    case ParseNodeType.ModuleName:
                        let symbol = Symbols.makeModuleName(node, decl, this.evaluator);
                        if (symbol) {
                            this.pushNewOccurrence(node, symbol);
                        }

                        return true;
                    default:
                        softAssert(false, 'unhandled missing node for declaration');
                        return true;
                }
            }

            log.debug('    decl type::', ParseTreeUtils.printParseNodeType(decl.node.nodeType));

            const declNode = decl.node;
            switch (declNode.nodeType) {
                case ParseNodeType.ImportAs:
                    // If we see that the declaration is for an alias, then we want to just use the
                    // imported alias local definition. This prevents these from leaking out (which
                    // I think is the desired behavior)
                    if (declNode.alias) {
                        this.pushNewOccurrence(node, this.getLsifSymbol(declNode.alias));
                        return true;
                    }

                    const moduleName = _formatModuleName(declNode.module);
                    const symbol = this.getSymbolOnce(declNode, () => {
                        const pythonPackage = this.moduleNameNodeToPythonPackage(declNode.module);
                        if (!pythonPackage) {
                            return this.getLocalForDeclaration(node);
                        }

                        assert(declNode != node.parent, 'Must not be the definition');
                        assert(pythonPackage, 'Must have a python package: ' + moduleName);

                        return Symbols.makeModule(moduleName, pythonPackage);
                    });

                    // TODO: We could maybe cache this to not always be asking for these names & decls
                    let nodeForRange: ParseNode = node;
                    while (nodeForRange.parent && nodeForRange.parent.nodeType === ParseNodeType.MemberAccess) {
                        const member = nodeForRange.parent.memberName;
                        const memberDecl = this.evaluator.getDeclarationsForNameNode(member, false);

                        // OK, so I think _only_ Modules won't have a declaration,
                        // so keep going until we find something that _has_ a declaration.
                        //
                        // That seems a bit goofy, but that lets us get the correct range here:
                        //
                        // importlib.resources.read_text('pre_commit.resources', 'filename')
                        // #^^^^^^^^^^^^^^^^^^ reference  python-stdlib 3.10 `importlib.resources`/__init__:
                        // #                   ^^^^^^^^^ reference  snapshot-util 0.1 `importlib.resources`/read_text().
                        if (memberDecl && memberDecl.length > 0) {
                            break;
                        }

                        nodeForRange = nodeForRange.parent;
                    }

                    this.pushNewOccurrence(nodeForRange, symbol);
                    return true;

                case ParseNodeType.Name:
                    const parent = declNode.parent!;
                    if (!parent) {
                        break;
                    }

                    // Don't allow scope to leak from list comprehensions
                    // TODO: Dict comprehensions
                    // TODO: Consider getting scope var and checking with that?
                    if (parent.nodeType === ParseNodeType.ListComprehensionFor) {
                        this.getLocalForDeclaration(declNode);
                        break;
                    }

                    break;
            }

            if (isIntrinsicDeclaration(decl)) {
                this.pushNewOccurrence(node, this.getIntrinsicSymbol(node));
                return true;
            }

            const type = this.evaluator.getTypeForDeclaration(decl);
            if (isAliasDeclaration(decl)) {
                const resolved = this.evaluator.resolveAliasDeclaration(decl, true, true);
                const resolvedType = resolved ? this.evaluator.getTypeForDeclaration(resolved) : undefined;

                if (!resolved) {
                    log.info('Missing dependency for:', node);
                }

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
                    const resolvedInfo = getFileInfo(node);
                    const hoverResult = this.program.getHoverForPosition(
                        resolvedInfo.filePath,
                        convertOffsetToPosition(node.start, resolvedInfo.lines),
                        'markdown',
                        token
                    );

                    if (hoverResult) {
                        const symbol = this.typeToSymbol(node, declNode, resolvedType);
                        this.rawSetLsifSymbol(declNode, symbol, symbol.isLocal());

                        this.emitSymbolInformationOnce(node, symbol, _formatHover(hoverResult));
                    }

                    this.pushTypeReference(node, resolved.node, resolvedType);
                    return true;
                }

                this.pushNewOccurrence(node, this.getLsifSymbol(decl.node));
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
            if (decl.node.id == parent.id) {
                if (parent.nodeType == ParseNodeType.Class) {
                    const symbol = this.getLsifSymbol(parent);

                    const documentation = [];
                    const stub = this._docstringWriter.docstrings.get(parent.id)!;
                    if (stub) {
                        documentation.push('```python\n' + stub.join('\n') + '\n```');
                    }

                    const doc = ParseTreeUtils.getDocString(parent.suite.statements)?.trim();
                    if (doc) {
                        documentation.push(convertDocStringToMarkdown(doc));
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

                this.pushNewOccurrence(node, this.getLsifSymbol(decl.node), lsiftyped.SymbolRole.Definition);
                return true;
            }

            if (decl.node.id == node.id) {
                const symbol = this.getLsifSymbol(decl.node);
                this.pushNewOccurrence(node, symbol, lsiftyped.SymbolRole.Definition);
                return true;
            }

            const existingLsifSymbol = this.rawGetLsifSymbol(decl.node);
            if (existingLsifSymbol) {
                this.pushNewOccurrence(node, existingLsifSymbol, lsiftyped.SymbolRole.ReadAccess);
                return true;
            }

            const builtinType = this.evaluator.getBuiltInType(node, node.value);
            // const pyrightSymbol = this.evaluator.lookUpSymbolRecursive(node, node.value, true);

            if (!Types.isUnknown(builtinType)) {
                // TODO: We could expose this and try to use it, but for now, let's skip that.
                // _getSymbolCategory

                // TODO: We're still missing documentation for builtin functions,
                // so that's a bit of a shame...

                if (Types.isFunction(builtinType)) {
                    const doc = builtinType.details.docString;

                    const symbol = this.getIntrinsicSymbol(node);
                    this.emitSymbolInformationOnce(node, symbol, doc ? [doc] : undefined);
                    this.pushNewOccurrence(node, symbol);
                } else if (Types.isOverloadedFunction(builtinType)) {
                    const overloadedSymbol = this.getLsifSymbol(decl.node);

                    const doc = builtinType.overloads[0].details.docString;
                    this.emitSymbolInformationOnce(node, overloadedSymbol, doc ? [doc] : undefined);
                    this.pushNewOccurrence(node, overloadedSymbol);
                } else if (Types.isClass(builtinType)) {
                    const doc = builtinType.details.docString;

                    const symbol = Symbols.makeClass(this.stdlibPackage, 'builtins', node.value);
                    this.emitSymbolInformationOnce(node, symbol, doc ? [doc] : undefined);
                    this.pushNewOccurrence(node, symbol);
                    return true;
                } else if (Types.isModule(builtinType)) {
                    // const pythonPackage = this.getPackageInfo(node, builtinType.moduleName)!;
                    const symbol = ScipSymbol.global(
                        ScipSymbol.package(builtinType.moduleName, this.stdlibPackage.version),
                        metaDescriptor('__init__')
                    );

                    this.emitSymbolInformationOnce(node, symbol);
                    this.pushNewOccurrence(node, symbol);
                    return true;
                } else {
                    // TODO: IntrinsicRefactor
                    softAssert(false, 'unhandled intrinsic', node);
                    this.pushNewOccurrence(node, this.getIntrinsicSymbol(node));
                }

                return true;
            } else {
                // let scope = getScopeForNode(node)!;
                // let builtinScope = getBuiltInScope(scope);
            }

            // TODO: WriteAccess isn't really implemented yet on my side
            // Now this must be a reference, so let's reference the right thing.
            const symbol = this.getLsifSymbol(decl.node);
            this.pushNewOccurrence(node, symbol);
            return true;
        }

        if (node && (ParseTreeUtils.isImportModuleName(node) || ParseTreeUtils.isFromImportModuleName(node))) {
            return true;
        }

        const builtinType = this.evaluator.getBuiltInType(node, node.value);
        if (!Types.isUnknown(builtinType)) {
            // assert(false, 'This should not be able to happen');
        }

        return true;
    }

    private rawGetLsifSymbol(node: ParseNode): ScipSymbol | undefined {
        return this.globalSymbols.get(node.id) || this.documentSymbols.get(node.id);
    }

    private rawSetLsifSymbol(node: ParseNode, sym: ScipSymbol, isLocal: boolean): void {
        if (isLocal) {
            this.documentSymbols.set(node.id, sym);
        } else {
            this.globalSymbols.set(node.id, sym);
        }
    }

    private getLsifSymbol(node: ParseNode): ScipSymbol {
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

            // let newSymbol = this.makeLsifSymbol(this.projectPackage, "_", node);
            const newSymbol = ScipSymbol.local(this.counter.next());
            this.rawSetLsifSymbol(node, newSymbol, true);
            this.emitSymbolInformationOnce(node, newSymbol);
            return newSymbol;
        }

        let newSymbol = this.makeLsifSymbol(pythonPackage, moduleName, node);
        this.rawSetLsifSymbol(node, newSymbol, true);

        return newSymbol;
    }

    // Intrinsics are things like:
    //      __name__
    //      __all__
    //
    // TODO: This isn't good anymore
    private getIntrinsicSymbol(_node: ParseNode): ScipSymbol {
        // return this.makeLsifSymbol(this._stdlibPackage, 'intrinsics', node);

        // TODO: Should these not be locals?
        return ScipSymbol.local(this.counter.next());
    }

    private makeBuiltinLsifSymbol(node: ParseNode, _info: AnalyzerFileInfo): ScipSymbol {
        // TODO: Can handle special cases here if we need to.
        //  Hopefully we will not need any though.

        return this.makeLsifSymbol(this.stdlibPackage, 'builtins', node);
    }

    // the pythonPackage is for the
    private makeLsifSymbol(pythonPackage: PythonPackage, moduleName: string, node: ParseNode): ScipSymbol {
        // const nodeFilePath = path.resolve(nodeFileInfo.filePath);

        switch (node.nodeType) {
            case ParseNodeType.Module:
                if (moduleName === 'builtins') {
                    return Symbols.makeModule('builtins', this.stdlibPackage);
                }

                // const version = this.getPackageInfo(node, moduleName);
                // if (version) {
                //     return LsifSymbol.package(moduleName, version);
                // } else {
                //     return LsifSymbol.local(this.counter.next());
                // }
                if (moduleName !== 'builtins') {
                    return ScipSymbol.global(
                        ScipSymbol.package(pythonPackage.name, pythonPackage.version),
                        packageDescriptor(moduleName)
                    );
                }

                // const version = this.getPackageInfo(node, moduleName);
                const version = this.config.pythonEnvironment.getPackageForModule(moduleName)!;
                if (!version) {
                    return ScipSymbol.local(this.counter.next());
                }

                return ScipSymbol.global(
                    ScipSymbol.package(version.name, version.version),
                    packageDescriptor(moduleName)
                );

            case ParseNodeType.ModuleName:
                // from .modulename import X
                //      ^^^^^^^^^^^ -> modulename/__init__

                return ScipSymbol.global(
                    ScipSymbol.global(
                        ScipSymbol.package(pythonPackage.name, pythonPackage.version),
                        packageDescriptor(node.nameParts.map((namePart) => namePart.value).join('.'))
                    ),
                    metaDescriptor('__init__')
                );

            case ParseNodeType.MemberAccess:
                // return this.getLsifSymbol(node.parent!);
                log.debug('Member Access:', node.leftExpression.nodeType, node);
                const left = node.leftExpression;

                switch (left.nodeType) {
                    case ParseNodeType.Name:
                    // return this.getLsifSymbol(left);
                }

                softAssert(false, 'Not supposed to get a member access');
                return ScipSymbol.empty();

            case ParseNodeType.Parameter:
                if (!node.name) {
                    log.debug('Paramerter with no name', node);
                    return ScipSymbol.local(this.counter.next());
                }

                return ScipSymbol.global(this.getLsifSymbol(node.parent!), parameterDescriptor(node.name.value));

            case ParseNodeType.Class:
                return ScipSymbol.global(
                    this.getLsifSymbol(node.parent!),
                    typeDescriptor((node as ClassNode).name.value)
                );

            case ParseNodeType.Function:
                let cls = ParseTreeUtils.getEnclosingClass(node, false);
                if (cls) {
                    return ScipSymbol.global(
                        this.getLsifSymbol(cls),
                        methodDescriptor((node as FunctionNode).name!.value)
                    );
                }

                return ScipSymbol.global(
                    this.getLsifSymbol(node.parent!),
                    methodDescriptor((node as FunctionNode).name!.value)
                );

            case ParseNodeType.Suite:
                if (node.parent) {
                    return this.getLsifSymbol(node.parent!);
                }

                // TODO: Not sure what to do about this...
                //  I don't know if we ever need to include this at all.
                return ScipSymbol.global(this.getLsifSymbol(node.parent!), metaDescriptor('#'));

            case ParseNodeType.Name:
                const parent = node.parent;
                if (!parent) {
                    throw 'must have parent';
                }

                switch (parent.nodeType) {
                    case ParseNodeType.MemberAccess:
                        // if (node.id === parent.leftExpression.id) {
                        const type = this.evaluator.getTypeOfExpression(parent.leftExpression);
                        log.debug('Left Expression Type:', type);

                        switch (type.type.category) {
                            case TypeCategory.TypeVar:
                                const typeVar = type.type;
                                const bound = typeVar.details.boundType! as ClassType;

                                return this.getSymbolOnce(node, () => {
                                    // TODO:
                                    const pythonPackage = this.getPackageInfo(node, bound.details.moduleName)!;
                                    let symbol = ScipSymbol.global(
                                        ScipSymbol.global(
                                            ScipSymbol.global(
                                                ScipSymbol.package(pythonPackage.name, pythonPackage.version),
                                                packageDescriptor(bound.details.moduleName)
                                            ),
                                            typeDescriptor(bound.details.name)
                                        ),
                                        termDescriptor(node.value)
                                    );

                                    this.emitSymbolInformationOnce(node, symbol);
                                    return symbol;
                                });
                            default:
                        }
                    // }
                }

                // const enclosingSuite = undefined;
                // switch (parent.nodeType) {
                //     case ParseNodeType.MemberAccess:
                //         break;
                //     default:
                //         enclosingSuite = ParseTreeUtils.getEnclosingSuite(node as ParseNode);
                //         if (enclosingSuite) {
                //             const enclosingParent = enclosingSuite.parent;
                //             if (enclosingParent) {
                //                 switch (enclosingParent.nodeType) {
                //                     case ParseNodeType.Function:
                //                     case ParseNodeType.Lambda:
                //                         return LsifSymbol.local(this.counter.next());
                //                 }
                //             }
                //         }
                // }

                const enclosingSuite = ParseTreeUtils.getEnclosingSuite(node as ParseNode);
                if (enclosingSuite) {
                    const enclosingParent = enclosingSuite.parent;
                    if (enclosingParent) {
                        switch (enclosingParent.nodeType) {
                            case ParseNodeType.Function:
                            case ParseNodeType.Lambda:
                                return ScipSymbol.local(this.counter.next());
                        }
                    }
                }

                return ScipSymbol.global(
                    this.getLsifSymbol(enclosingSuite || node.parent!),
                    termDescriptor((node as NameNode).value)
                );

            case ParseNodeType.TypeAnnotation:
                switch (node.valueExpression.nodeType) {
                    case ParseNodeType.Name:
                        return ScipSymbol.global(
                            this.getLsifSymbol(ParseTreeUtils.getEnclosingSuite(node) || node.parent!),
                            termDescriptor(node.valueExpression.value)
                        );
                    default:
                        softAssert(false, 'Unhandled type annotation');
                        return ScipSymbol.local(this.counter.next());
                }

            case ParseNodeType.FunctionAnnotation:
                return ScipSymbol.global(
                    this.getLsifSymbol(node.parent!),
                    // Descriptor.term((node as TypeAnnotationNode).typeAnnotation)
                    termDescriptor('FuncAnnotation')
                );

            case ParseNodeType.Decorator:
                softAssert(false, 'Should not handle decorators directly');
                return ScipSymbol.local(this.counter.next());

            case ParseNodeType.Assignment:
                // TODO: Check if we have more information
                //  Might even want to use enclosingModule
                const enclosing = ParseTreeUtils.getEnclosingClassOrFunction(node);
                if (enclosing) {
                    if (pythonPackage.version) {
                        return this.getLsifSymbol(node.parent!);
                    } else {
                        return ScipSymbol.local(this.counter.next());
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
                // node
                // TODO(0.2): Resolve all these weird import things.
                log.info('ImportFrom');
                return ScipSymbol.empty();

            case ParseNodeType.ImportFromAs:
                // TODO(0.2): Resolve all these weird import things.
                const decls = this.evaluator.getDeclarationsForNameNode(node.name);
                if (decls) {
                    const decl = decls[0];

                    const resolved = this.evaluator.resolveAliasDeclaration(decl, true);
                    if (!resolved) {
                        log.info('Interesting not getting the resolved:', decl);
                        return ScipSymbol.local(this.counter.next());
                    }

                    if (resolved.node && resolved.node != node) {
                        const symbol = this.getLsifSymbol(resolved.node);
                        this.emitSymbolInformationOnce(resolved.node, symbol);

                        return symbol;
                    }
                }

                const type = this.getAliasedSymbolTypeForName(node, node.name.value);
                if (type) {
                    switch (type.category) {
                        case TypeCategory.Module:
                            const parent = node.parent;
                            assert(parent);

                            switch (parent.nodeType) {
                                case ParseNodeType.ImportFrom:
                                    const pythonPackage =
                                        this.moduleNameNodeToPythonPackage(parent.module) || this.projectPackage;

                                    return Symbols.makeModule(
                                        [...parent.module.nameParts, node.name].map((part) => part.value).join('.'),
                                        pythonPackage
                                    );
                            }
                    }
                }

                return ScipSymbol.local(this.counter.next());

            case ParseNodeType.Lambda:
                return ScipSymbol.local(this.counter.next());

            case ParseNodeType.ListComprehensionFor:
                return ScipSymbol.local(this.counter.next());

            case ParseNodeType.ListComprehension:
                softAssert(false, 'Should never enter ListComprehension directly');
                return ScipSymbol.empty();

            // Some nodes, it just makes sense to return whatever their parent is.
            case ParseNodeType.With:
            case ParseNodeType.WithItem:
            case ParseNodeType.If:
            case ParseNodeType.For:
            case ParseNodeType.Try:
            case ParseNodeType.Except:
            case ParseNodeType.While:
            case ParseNodeType.Call:
            // To explore:
            case ParseNodeType.StatementList:
            case ParseNodeType.Tuple:
            case ParseNodeType.List:
            case ParseNodeType.ListComprehensionIf:
            case ParseNodeType.Argument:
            case ParseNodeType.BinaryOperation:
            // TODO: Not skilled enough to handle yet
            case ParseNodeType.StringList:
                return this.getLsifSymbol(node.parent!);

            default:
                softAssert(
                    false,
                    `Unhandled: ${node.nodeType}: ${ParseTreeUtils.printParseNodeType(node.nodeType)}`,
                    ParseTreeUtils.getFileInfoFromNode(node)!.filePath
                );

                if (!node.parent) {
                    return ScipSymbol.local(this.counter.next());
                }
                return this.getLsifSymbol(node.parent!);
        }
    }

    // Take a `Type` from pyright and turn that into an LSIF symbol.
    private typeToSymbol(node: NameNode, declNode: ParseNode, typeObj: Type): ScipSymbol {
        if (Types.isFunction(typeObj)) {
            const decl = typeObj.details.declaration;
            if (!decl) {
                // throw 'Unhandled missing declaration for type: function';
                // console.warn('Missing Function Decl:', node.token.value, typeObj);
                return ScipSymbol.local(this.counter.next());
            }

            const declModuleName = decl.moduleName;

            // TODO(package)
            let pythonPackage = undefined;
            if (!pythonPackage) {
                pythonPackage = this.config.pythonEnvironment.getPackageForModule(declModuleName);
            }

            if (!pythonPackage) {
                // TODO: Should probably configure this to be disabled if needed
                pythonPackage = this.config.pythonEnvironment.guessPackage(declModuleName);
            }

            if (!pythonPackage) {
                const declPath = path.resolve(decl.path);

                if (declPath.startsWith(this.cwd)) {
                    pythonPackage = this.projectPackage;
                }
            }

            if (!pythonPackage) {
                // throw 'must have pythonPackage: ' + declModuleName;
                return ScipSymbol.local(this.counter.next());
            }

            return ScipSymbol.global(
                ScipSymbol.global(
                    ScipSymbol.package(pythonPackage?.name, pythonPackage?.version),
                    packageDescriptor(typeObj.details.moduleName)
                ),
                methodDescriptor(node.value)
            );
        } else if (Types.isClass(typeObj)) {
            const pythonPackage = this.getPackageInfo(node, typeObj.details.moduleName)!;
            return ScipSymbol.global(
                ScipSymbol.global(
                    ScipSymbol.package(pythonPackage.name, pythonPackage.version),
                    packageDescriptor(typeObj.details.moduleName)
                ),
                typeDescriptor(node.value)
            );
        } else if (Types.isClassInstance(typeObj)) {
            typeObj = typeObj as ClassType;
            throw 'oh yayaya';
            // return LsifSymbol.global(this.getLsifSymbol(decl.node), Descriptor.term(node.value)).value;
        } else if (Types.isTypeVar(typeObj)) {
            throw 'typevar';
        } else if (Types.isModule(typeObj)) {
            const pythonPackage = this.getPackageInfo(node, typeObj.moduleName)!;
            return ScipSymbol.global(
                ScipSymbol.package(typeObj.moduleName, pythonPackage.version),
                metaDescriptor('__init__')
            );
        } else if (Types.isOverloadedFunction(typeObj)) {
            if (!typeObj.overloads) {
                softAssert(false, "Didn't think it would be possible to have overloaded w/ no overloads");
                return ScipSymbol.local(this.counter.next());
            }
            return this.typeToSymbol(node, declNode, typeObj.overloads[0]);
        }

        softAssert(false, `Unreachable TypeObj: ${node.value}: ${typeObj.category}`);
        return ScipSymbol.local(this.counter.next());
    }

    // TODO: Could maybe just remove this now.
    private pushTypeReference(node: NameNode, declNode: ParseNode, typeObj: Type): void {
        let symbol = this.rawGetLsifSymbol(declNode);
        if (!symbol) {
            symbol = this.typeToSymbol(node, declNode, typeObj);
            this.rawSetLsifSymbol(declNode, symbol, symbol.isLocal());
        }

        this.pushNewOccurrence(node, symbol);
    }

    private getLocalForDeclaration(node: NameNode): ScipSymbol {
        const existing = this.rawGetLsifSymbol(node);
        if (existing) {
            return existing;
        }

        const symbol = ScipSymbol.local(this.counter.next());
        this.rawSetLsifSymbol(node, symbol, true);
        return symbol;
    }

    // Might be the only way we can add new occurrences?
    private pushNewOccurrence(
        node: ParseNode,
        symbol: ScipSymbol,
        role: number = lsiftyped.SymbolRole.ReadAccess
    ): void {
        softAssert(symbol.value.trim() == symbol.value, `Invalid symbol ${node} -> ${symbol.value}`);

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

    private emitSymbolInformationOnce(
        node: ParseNode,
        symbol: ScipSymbol,
        documentation: string[] | undefined = undefined
    ) {
        // Only emit symbol info once.
        if (this.symbolInformationForNode.has(symbol.value)) {
            return;
        }
        this.symbolInformationForNode.add(symbol.value);

        if (documentation) {
            this.document.symbols.push(
                new lsiftyped.SymbolInformation({
                    symbol: symbol.value,
                    documentation,
                })
            );

            return;
        }

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

        this._docstringWriter.walk(node);
        const docs = '```python\n' + (this._docstringWriter.docstrings.get(node.id) || []).join('\n') + '\n```';
        this.document.symbols.push(
            new lsiftyped.SymbolInformation({
                symbol: symbol.value,
                documentation: [docs],
            })
        );
    }

    // this is copied from TypeEvaluator -> getAliasedSymbolTypeForName
    //  but it just was not exposed as such.
    private getAliasedSymbolTypeForName(
        node: ImportAsNode | ImportFromAsNode | ImportFromNode,
        name: string
    ): Type | undefined {
        const symbolWithScope = this.evaluator.lookUpSymbolRecursive(node, name, /* honorCodeFlow */ true);
        if (!symbolWithScope) {
            return undefined;
        }

        // Normally there will be at most one decl associated with the import node, but
        // there can be multiple in the case of the "from .X import X" statement. In such
        // case, we want to choose the last declaration.
        const filteredDecls = symbolWithScope.symbol
            .getDeclarations()
            .filter(
                (decl) => ParseTreeUtils.isNodeContainedWithin(node, decl.node) && decl.type === DeclarationType.Alias
            );
        let aliasDecl = filteredDecls.length > 0 ? filteredDecls[filteredDecls.length - 1] : undefined;

        // If we didn't find an exact match, look for any alias associated with
        // this symbol. In cases where we have multiple ImportAs nodes that share
        // the same first-part name (e.g. "import asyncio" and "import asyncio.tasks"),
        // we may not find the declaration associated with this node.
        if (!aliasDecl) {
            aliasDecl = symbolWithScope.symbol.getDeclarations().find((decl) => decl.type === DeclarationType.Alias);
        }

        if (!aliasDecl) {
            return undefined;
        }

        // assert(aliasDecl.type === DeclarationType.Alias);
        const fileInfo = getFileInfo(node);

        // Try to resolve the alias while honoring external visibility.
        const resolvedAliasInfo = this.evaluator.resolveAliasDeclarationWithInfo(
            aliasDecl,
            /* resolveLocalNames */ true,
            /* allowExternallyHiddenAccess */ fileInfo.isStubFile
        );

        if (!resolvedAliasInfo) {
            return undefined;
        }

        if (!resolvedAliasInfo.declaration) {
            // return evaluatorOptions.evaluateUnknownImportsAsAny ? AnyType.create() : UnknownType.create();
            return undefined;
        }

        // if (node.nodeType === ParseNodeType.ImportFromAs) {
        //     if (resolvedAliasInfo.isPrivate) {
        //         addDiagnostic(
        //             fileInfo.diagnosticRuleSet.reportPrivateUsage,
        //             DiagnosticRule.reportPrivateUsage,
        //             Localizer.Diagnostic.privateUsedOutsideOfModule().format({
        //                 name: node.name.value,
        //             }),
        //             node.name
        //         );
        //     }
        //
        //     if (resolvedAliasInfo.privatePyTypedImporter) {
        //         const diag = new DiagnosticAddendum();
        //         if (resolvedAliasInfo.privatePyTypedImported) {
        //             diag.addMessage(
        //                 Localizer.DiagnosticAddendum.privateImportFromPyTypedSource().format({
        //                     module: resolvedAliasInfo.privatePyTypedImported,
        //                 })
        //             );
        //         }
        //         addDiagnostic(
        //             fileInfo.diagnosticRuleSet.reportPrivateImportUsage,
        //             DiagnosticRule.reportPrivateImportUsage,
        //             Localizer.Diagnostic.privateImportFromPyTypedModule().format({
        //                 name: node.name.value,
        //                 module: resolvedAliasInfo.privatePyTypedImporter,
        //             }) + diag.getString(),
        //             node.name
        //         );
        //     }
        // }

        return this.evaluator.getInferredTypeOfDeclaration(symbolWithScope.symbol, aliasDecl);
    }

    private moduleNameNodeToPythonPackage(node: ModuleNameNode): PythonPackage | undefined {
        // If it has leading dots, then we know it's from this package
        if (node.leadingDots > 0) {
            return this.projectPackage;
        }

        if (node.nameParts.length === 0) {
            softAssert(false, 'how can this be?', node);
        }

        const declModuleName = _formatModuleName(node);
        const baseName = node.nameParts[0].value;

        if (declModuleName == 'builtins' || Hardcoded.stdlib_module_names.has(baseName)) {
            return this.stdlibPackage;
        }

        let pythonPackage = this.config.pythonEnvironment.getPackageForModule(declModuleName);
        if (!pythonPackage) {
            // TODO: Should probably configure this to be disabled if needed
            pythonPackage = this.config.pythonEnvironment.guessPackage(declModuleName);
        }

        return pythonPackage;
    }

    // TODO: This could be a global cache perhaps, because multiple files can ask for the same
    // symbol if they have the same declaration.
    private getSymbolOnce<T extends ParseNode>(node: T, finder: () => ScipSymbol): ScipSymbol {
        const existing = this.rawGetLsifSymbol(node);
        if (existing) {
            return existing;
        }

        const symbol = finder();
        this.rawSetLsifSymbol(node, symbol, symbol.isLocal());
        return symbol;
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
