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

import * as ModifiedTypeUtils from './ModifiedTypeUtils';
import { scip } from './scip';
import * as Symbols from './symbols';
import { ScipSymbol } from './ScipSymbol';
import { Position } from './lsif-typescript/Position';
import { Range } from './lsif-typescript/Range';
import { ScipConfig } from './lib';
import * as ParseTreeUtils from 'pyright-internal/analyzer/parseTreeUtils';
import { ClassType, Type, TypeCategory } from 'pyright-internal/analyzer/types';
import * as Types from 'pyright-internal/analyzer/types';
import { TypeStubExtendedWriter } from './TypeStubExtendedWriter';
import { SourceFile } from 'pyright-internal/analyzer/sourceFile';
import { extractParameterDocumentation } from 'pyright-internal/analyzer/docStringUtils';
import {
    Declaration,
    DeclarationType,
    isAliasDeclaration,
    isIntrinsicDeclaration,
} from 'pyright-internal/analyzer/declaration';
import { ConfigOptions, ExecutionEnvironment } from 'pyright-internal/common/configOptions';
import { versionToString } from 'pyright-internal/common/pythonVersion';
import { Program } from 'pyright-internal/analyzer/program';
import PythonEnvironment from './virtualenv/PythonEnvironment';
import { Counter } from './lsif-typescript/Counter';
import PythonPackage from './virtualenv/PythonPackage';
import * as Hardcoded from './hardcoded';
import { Event } from 'vscode-languageserver';
import { HoverResults } from 'pyright-internal/languageService/hoverProvider';
import { convertDocStringToMarkdown } from 'pyright-internal/analyzer/docStringConversion';
import { assert } from 'pyright-internal/common/debug';
import { getClassFieldsRecursive } from 'pyright-internal/analyzer/typeUtils';

//  Useful functions for later, but haven't gotten far enough yet to use them.
//      extractParameterDocumentation
//      import { getModuleDocString } from 'pyright-internal/analyzer/typeDocStringUtils';
//      this.evaluator.printType(...)

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

// const _printer = createTracePrinter([process.cwd()]);
const _msgs = new Set<string>();
const _transform = function (exprs: any[]): any[] {
    const result: any[] = [];
    for (let i = 0; i < exprs.length; i++) {
        let val = exprs[i];
        if (typeof val === 'function') {
            result.push(val(...exprs.slice(i + 1)));
            break;
        } else {
            result.push(val);
        }
    }
    return result;
};

// log is just cheap shorthand logging library
// for debugging in --dev mode.
//
// If you pass a function, all the rest of the arguments will
// be curried into that function if the logging function is called
// (this makes it cheap to skip more expensive debugging information)
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
            console.log(..._transform(exprs));
        }
    },

    info: (...exprs: any[]) => {
        if (errorLevel >= 1) {
            console.log(..._transform(exprs));
        }
    },
};

const _cancellationToken = {
    isCancellationRequested: false,
    onCancellationRequested: Event.None,
};

function parseNodeToRange(name: ParseNode, lines: TextRangeCollection<TextRange>): Range {
    const posStart = convertOffsetToPosition(name.start, lines);
    const start = new Position(posStart.line, posStart.character);

    const posEnd = convertOffsetToPosition(name.start + name.length, lines);
    const end = new Position(posEnd.line, posEnd.character);

    return new Range(start, end);
}

export interface TreeVisitorConfig {
    document: scip.Document;
    externalSymbols: Map<string, scip.SymbolInformation>;
    sourceFile: SourceFile;
    evaluator: TypeEvaluator;
    program: Program;
    pyrightConfig: ConfigOptions;
    scipConfig: ScipConfig;
    pythonEnvironment: PythonEnvironment;
    globalSymbols: Map<number, ScipSymbol>;
}

interface ScipSymbolOptions {
    moduleName: string;
    pythonPackage: PythonPackage | undefined;
}

export class TreeVisitor extends ParseTreeWalker {
    private fileInfo: AnalyzerFileInfo | undefined;
    private symbolInformationForNode: Set<string>;

    /// maps node.id -> ScipSymbol, for document local symbols
    private documentSymbols: Map<number, ScipSymbol>;
    /// maps node.id: ScipSymbol, for globally accesible symbols
    private globalSymbols: Map<number, ScipSymbol>;
    /// maps symbol.value: SymbolInformation, for externally defined symbols
    public externalSymbols: Map<string, scip.SymbolInformation>;

    private _docstringWriter: TypeStubExtendedWriter;

    private execEnv: ExecutionEnvironment;
    private cwd: string;
    private projectPackage: PythonPackage;
    private stdlibPackage: PythonPackage;
    private counter: Counter;

    public document: scip.Document;
    public evaluator: TypeEvaluator;
    public program: Program;

    constructor(public config: TreeVisitorConfig) {
        super();

        // In dev mode, we error instead of just warn
        if (this.config.scipConfig.dev) {
            errorLevel = 2;
        }

        log.info('=> Working file:', config.sourceFile.getFilePath(), '<==');

        this.evaluator = config.evaluator;
        this.program = config.program;
        this.document = config.document;
        this.externalSymbols = config.externalSymbols;
        this.counter = new Counter();

        this.documentSymbols = new Map();
        this.globalSymbols = this.config.globalSymbols;
        this.symbolInformationForNode = new Set();

        this.execEnv = this.config.pyrightConfig.getExecutionEnvironments()[0];
        this.stdlibPackage = new PythonPackage('python-stdlib', versionToString(this.execEnv.pythonVersion), []);
        this.projectPackage = new PythonPackage(
            this.config.scipConfig.projectName,
            this.config.scipConfig.projectVersion,
            []
        );

        this.cwd = path.resolve(process.cwd());

        this._docstringWriter = new TypeStubExtendedWriter(this.config.sourceFile, this.evaluator);
    }

    // We have to do this in visitModule because there won't necessarily be a name
    // associated with the module. So this is where we can declare the definition
    // site of a module (which we can use in imports or usages)
    override visitModule(node: ModuleNode): boolean {
        const fileInfo = getFileInfo(node);
        this.fileInfo = fileInfo;

        // Insert definition at the top of the file
        const pythonPackage = this.getPackageInfo(node, fileInfo.moduleName);
        if (pythonPackage) {
            if (softAssert(pythonPackage === this.projectPackage, 'expected pythonPackage to be this.projectPackage')) {
                const symbol = Symbols.makeModuleInit(pythonPackage, fileInfo.moduleName);

                this.document.occurrences.push(
                    new scip.Occurrence({
                        symbol_roles: scip.SymbolRole.Definition,
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
                    new scip.SymbolInformation({
                        symbol: symbol.value,
                        documentation,
                    })
                );
            }
        } else {
            // TODO: We could put a symbol here, but just as a readaccess, not as a definition
            //       But I'm not sure that's the correct thing -- this is only when we _visit_
            //       a module, so I don't think we should have to do that.
            softAssert(false, 'Unable to find module for node');
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
            const hoverResult = this.program.getHoverForPosition(
                this.fileInfo!.filePath,
                convertOffsetToPosition(node.start, this.fileInfo!.lines),
                'markdown',
                _cancellationToken
            );

            this.document.symbols.push(
                new scip.SymbolInformation({
                    symbol: this.getScipSymbol(node).value,
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
                        new scip.SymbolInformation({
                            symbol: this.getScipSymbol(dec.node).value,
                            documentation,
                        })
                    );
                }
            }
        }

        return true;
    }

    private getFunctionRelationships(node: FunctionNode): scip.Relationship[] | undefined {
        // Skip all dunder methods. They all implement stuff but it's not helpful to see
        // at this point in scip-python
        if (node.name.value.startsWith('__')) {
            return undefined;
        }

        let functionType = this.evaluator.getTypeOfFunction(node)!;
        let enclosingClass = ParseTreeUtils.getEnclosingClass(node, true);
        if (!enclosingClass) {
            return undefined;
        }

        // methodAlwaysRaisesNotImplemented <- this is a good one for implemtnations, but maybe we don't need that
        const enclosingClassType = this.evaluator.getTypeOfClass(enclosingClass);
        if (!enclosingClassType) {
            return undefined;
        }

        let relationshipMap: Map<string, scip.Relationship> = new Map();
        let classType = enclosingClassType.classType;

        // Use: getClassMemberIterator
        //  Could use this to handle each of the fields with the same name
        //  but it's a bit weird if you have A -> B -> C, and then you say
        //  that C implements A's & B's... that seems perhaps a bit too verbose.
        //
        // See: https://github.com/sourcegraph/scip-python/issues/50
        for (const base of classType.details.baseClasses) {
            if (base.category !== TypeCategory.Class) {
                continue;
            }

            let parentMethod = base.details.fields.get(node.name.value);
            if (!parentMethod) {
                let fieldLookup = getClassFieldsRecursive(base).get(node.name.value);
                if (fieldLookup && fieldLookup.classType.category !== TypeCategory.Unknown) {
                    parentMethod = fieldLookup.classType.details.fields.get(node.name.value)!;
                } else {
                    continue;
                }
            }

            let parentMethodType = this.evaluator.getEffectiveTypeOfSymbol(parentMethod);
            if (parentMethodType.category !== TypeCategory.Function) {
                continue;
            }

            if (
                !ModifiedTypeUtils.isTypeImplementable(
                    functionType.functionType,
                    parentMethodType,
                    false,
                    true,
                    0,
                    true
                )
            ) {
                continue;
            }

            let decl = parentMethodType.details.declaration!;
            let symbol = this.typeToSymbol(decl.node.name, decl.node, parentMethodType);
            relationshipMap.set(
                symbol.value,
                new scip.Relationship({
                    symbol: symbol.value,
                    is_implementation: true,
                })
            );
        }

        let relationships = Array.from(relationshipMap.values());
        return relationships.length > 0 ? relationships : undefined;
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

        let relationships: scip.Relationship[] | undefined = this.getFunctionRelationships(node);
        this.document.symbols.push(
            new scip.SymbolInformation({
                symbol: this.getScipSymbol(node).value,
                documentation,
                relationships,
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
            const symbol = this.getScipSymbol(paramNode);

            // This pulls documentation of various styles from function docstring
            const paramDocstring = paramNode.name
                ? extractParameterDocumentation(functionDoc || '', paramNode.name!.value)
                : undefined;

            const paramDocumentation = paramDocstring ? [paramDocstring] : undefined;

            this.document.symbols.push(
                new scip.SymbolInformation({
                    symbol: symbol.value,
                    documentation: paramDocumentation,
                })
            );

            // Walk the parameter child nodes
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
        node.list.forEach((child) => this.walk(child));

        return false;
    }

    // from foo.bar import baz, bat
    //      ^^^^^^^ node.module (one single token)
    //                     ^^^  ^^^ node.imports (individual tokens)
    //
    // We don't want to walk each individual name part for the node.module,
    // because that leads to some confusing behavior. Instead, walk only the imports
    // and then declare the new symbol for the entire module. This gives us better
    // clicking for goto-def in Sourcegraph
    override visitImportFrom(node: ImportFromNode): boolean {
        const symbol = this.getScipSymbol(node);
        this.document.occurrences.push(
            new scip.Occurrence({
                symbol_roles: scip.SymbolRole.ReadAccess,
                symbol: symbol.value,
                range: parseNodeToRange(node.module, this.fileInfo!.lines).toLsif(),
            })
        );
        const symbolPackage = this.moduleNameNodeToPythonPackage(node.module);
        if (symbolPackage === this.stdlibPackage) {
            this.emitExternalSymbolInformation(node.module, symbol, []);
        }

        node.imports.forEach((imp) => this.walk(imp));
        return false;
    }

    override visitImportFromAs(node: ImportFromAsNode): boolean {
        this.pushNewOccurrence(node, this.getScipSymbol(node));
        return false;
    }

    // import aliased as A
    //        ^^^^^^^ node.module (create new reference)
    //                   ^ node.alias (create new local definition)
    override visitImportAs(node: ImportAsNode): boolean {
        const moduleName = _formatModuleName(node.module);
        const importInfo = getImportInfo(node.module);
        if (
            importInfo &&
            importInfo.resolvedPaths[0] &&
            path.resolve(importInfo.resolvedPaths[0]).startsWith(this.cwd)
        ) {
            const symbol = Symbols.makeModuleInit(this.projectPackage, moduleName);
            this.pushNewOccurrence(node.module, symbol);
        } else {
            const pythonPackage = this.moduleNameNodeToPythonPackage(node.module);

            if (pythonPackage) {
                const symbol = Symbols.makeModuleInit(pythonPackage, moduleName);
                this.pushNewOccurrence(node.module, symbol);
            } else {
                // For python packages & modules that we cannot resolve,
                // we'll just make a local for the file and note that we could not resolve this module.
                //
                // This should be pretty helpful when debugging (and for giving users feedback when they are
                // interacting with sourcegraph).
                //
                // TODO: The only other question would be what we should do about references to items from this module
                const symbol = this.getLocalForDeclaration(node, [
                    `(module): ${moduleName} [unable to resolve module]`,
                ]);
                this.pushNewOccurrence(node.module, symbol);
            }
        }

        if (node.alias) {
            this.pushNewOccurrence(node.alias, this.getLocalForDeclaration(node.alias));
        }

        return false;
    }

    private emitDeclarationWithoutNode(node: NameNode, _decl: Declaration): boolean {
        const parent = node.parent!;
        switch (parent.nodeType) {
            // `ModuleName`s do not have nodes for definitions
            // because they aren't a syntax node, they are basically
            // a file location node.
            //
            // (as far as I know, they are the only thing to have something
            // like this)
            case ParseNodeType.ModuleName: {
                const symbol = this.getScipSymbol(parent);

                if (symbol) {
                    if (hasAncestor(node, ParseNodeType.ImportAs, ParseNodeType.ImportFrom)) {
                        softAssert(false, 'Should never see ImportAs or ImportFrom in visitName');
                        return true;
                    }

                    this.pushNewOccurrence(node, symbol);
                    return true;
                }
            }
            default: {
                softAssert(false, 'unhandled missing node for declaration');
                return true;
            }
        }
    }

    private emitDeclaration(node: NameNode, decl: Declaration): boolean {
        const parent = node.parent!;

        if (!decl.node) {
            return this.emitDeclarationWithoutNode(node, decl);
        }

        const existingSymbol = this.rawGetLsifSymbol(decl.node);
        if (existingSymbol) {
            if (decl.node.id === parent.id || decl.node.id === node.id) {
                switch (decl.node.nodeType) {
                    case ParseNodeType.Function:
                    case ParseNodeType.Class:
                        this.pushNewOccurrence(node, existingSymbol, scip.SymbolRole.Definition, decl.node);
                        break;
                    default:
                        this.pushNewOccurrence(node, existingSymbol, scip.SymbolRole.Definition);
                }
            } else {
                this.pushNewOccurrence(node, existingSymbol);
            }
            return true;
        }

        const isDefinition = decl.node.id === parent.id;

        const builtinType = this.evaluator.getBuiltInType(node, node.value);
        if (this.isStdlib(decl, builtinType)) {
            this.emitBuiltinScipSymbol(node, builtinType, decl);
            return true;
        }

        const declNode = decl.node;
        switch (declNode.nodeType) {
            case ParseNodeType.ImportAs: {
                // If we see that the declaration is for an alias, then we want to just use the
                // imported alias local definition. This prevents these from leaking out (which
                // I think is the desired behavior)
                if (declNode.alias) {
                    this.pushNewOccurrence(node, this.getScipSymbol(declNode.alias));
                    return true;
                }

                const moduleName = _formatModuleName(declNode.module);
                const symbol = this.getSymbolOnce(declNode, () => {
                    const pythonPackage = this.moduleNameNodeToPythonPackage(declNode.module, decl);
                    if (!pythonPackage) {
                        return this.getLocalForDeclaration(node);
                    }

                    assert(declNode != node.parent, 'Must not be the definition');
                    assert(pythonPackage, 'Must have a python package: ' + moduleName);

                    return Symbols.makeModuleInit(pythonPackage, moduleName);
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
            }
            case ParseNodeType.Function: {
                // Only push an occurrence directly if it's a reference,
                // otherwise handle below.
                if (isDefinition) {
                    break;
                }

                this.pushNewOccurrence(node, this.getScipSymbol(declNode));
                return true;
            }
            case ParseNodeType.Name: {
                // Don't allow scope to leak from list/dict comprehensions
                //  (dict comprehensions are also considered ListComprehensionFor)
                //
                // TODO: hasAncestor should perhaps also contain the ability to quit when hitting certain nodes
                //  I don't know that it's great to loop all the way back up for this all the time
                //  We could provide a list of items that have their own scope that would be OK to be leaked
                //  because they aren't statements
                if (hasAncestor(declNode, ParseNodeType.ListComprehensionFor)) {
                    this.getLocalForDeclaration(declNode);
                }

                break;
            }
            default:
                break;
        }

        if (isIntrinsicDeclaration(decl)) {
            this.pushNewOccurrence(node, this.getIntrinsicSymbol(node));
            return true;
        }

        const typeInfo = this.evaluator.getTypeForDeclaration(decl);
        if (isAliasDeclaration(decl)) {
            const resolved = this.evaluator.resolveAliasDeclaration(decl, true, true);
            const resolvedType = resolved ? this.evaluator.getTypeForDeclaration(resolved) : undefined;

            if (!resolved) {
                log.info('Missing dependency for:', node);
            }

            if (typeInfo.type) {
                this.pushTypeReference(node, decl.node, typeInfo.type);
                return true;
            }

            if (resolved && resolvedType && resolvedType.type) {
                const isDefinition = node.id === resolved?.node.id;
                const resolvedInfo = getFileInfo(node);
                const hoverResult = this.program.getHoverForPosition(
                    resolvedInfo.filePath,
                    convertOffsetToPosition(node.start, resolvedInfo.lines),
                    'markdown',
                    _cancellationToken
                );

                if (hoverResult) {
                    const symbol = this.typeToSymbol(node, declNode, resolvedType.type);
                    this.rawSetLsifSymbol(declNode, symbol, symbol.isLocal());

                    if (isDefinition) {
                        this.emitSymbolInformationOnce(node, symbol, _formatHover(hoverResult));
                    }
                }

                this.pushTypeReference(node, resolved.node, resolvedType.type);
                return true;
            }

            this.pushNewOccurrence(node, this.getScipSymbol(decl.node));
            return true;
        }

        if (isDefinition) {
            // In this case, decl.node == node.parent
            switch (decl.node.nodeType) {
                case ParseNodeType.Class: {
                    const symbol = this.getScipSymbol(parent);

                    const documentation = [];
                    const stub = this._docstringWriter.docstrings.get(parent.id)!;
                    if (stub) {
                        documentation.push('```python\n' + stub.join('\n') + '\n```');
                    }

                    const doc = ParseTreeUtils.getDocString(decl.node.suite.statements)?.trim();
                    if (doc) {
                        documentation.push(convertDocStringToMarkdown(doc));
                    }

                    let type = typeInfo.type;

                    let relationships: scip.Relationship[] | undefined = undefined;
                    if (type && type.category === TypeCategory.Class) {
                        // TODO: Add Protocol support with:
                        //          base.compatibleProtocols
                        relationships = type.details.baseClasses
                            .filter((base) => {
                                if (base.category !== TypeCategory.Class) {
                                    return false;
                                }

                                // Don't show implementations for `object` cause that's pretty useless
                                if (base.details.moduleName === 'builtins' && base.details.name == 'object') {
                                    return false;
                                }

                                const pythonPackage = this.guessPackage(base.details.moduleName, base.details.filePath);
                                if (!pythonPackage) {
                                    return false;
                                }

                                return true;
                            })
                            .map((base) => {
                                // Filtered out in previous filter
                                assert(base.category === TypeCategory.Class);
                                const pythonPackage = this.guessPackage(
                                    base.details.moduleName,
                                    base.details.filePath
                                )!;

                                const symbol = Symbols.makeClass(
                                    pythonPackage,
                                    base.details.moduleName,
                                    base.details.name
                                ).value;

                                return new scip.Relationship({
                                    symbol,
                                    is_implementation: true,
                                });
                            });
                    }

                    this.document.symbols.push(
                        new scip.SymbolInformation({
                            symbol: symbol.value,
                            documentation,
                            relationships,
                        })
                    );

                    this.pushNewOccurrence(node, this.getScipSymbol(decl.node), scip.SymbolRole.Definition, decl.node);
                    break;
                }
                default: {
                    this.pushNewOccurrence(node, this.getScipSymbol(decl.node), scip.SymbolRole.Definition);
                }
            }

            return true;
        }

        if (decl.node.id == node.id) {
            const symbol = this.getScipSymbol(decl.node);
            this.pushNewOccurrence(node, symbol, scip.SymbolRole.Definition);
            return true;
        }

        const existingLsifSymbol = this.rawGetLsifSymbol(decl.node);
        if (existingLsifSymbol) {
            this.pushNewOccurrence(node, existingLsifSymbol, scip.SymbolRole.ReadAccess);
            return true;
        }

        const symbol = this.getScipSymbol(decl.node);
        this.pushNewOccurrence(node, symbol);
        return true;
    }

    private isStdlib(decl: Declaration, builtinType: Type): boolean {
        if (Types.isUnknown(builtinType)) {
            return false;
        }

        switch (builtinType.category) {
            case TypeCategory.Class:
                return ClassType.isBuiltIn(builtinType) || ClassType.isSpecialBuiltIn(builtinType);
            case TypeCategory.Module:
                return isBuiltinModuleName(builtinType.moduleName);
            case TypeCategory.Function:
                return isBuiltinModuleName(decl.moduleName);
            case TypeCategory.OverloadedFunction:
                return this.isStdlib(decl, builtinType.overloads[0]);
            case TypeCategory.Union:
                return builtinType.subtypes.find((subtype) => this.isStdlib(decl, subtype)) !== undefined;
        }

        softAssert(false, 'Unhandled builtin category:', builtinType);
        return false;
    }

    private emitNameWithoutDeclaration(node: NameNode): boolean {
        let parent = node.parent!;
        switch (parent.nodeType) {
            case ParseNodeType.ModuleName:
                softAssert(false, "I don't think that this should be possible");
                break;

            // Without a declaration, it doesn't seem useful to try and add member accesses
            // with locals. You'll just get a new local for every reference because we can't construct
            // what these are.
            //
            // In the future, it could be possible that we could store what locals we have generated for a file
            // (for example `unknown_module.access`, and then use the same local for all of them, but it would be quite
            // difficult in my mind).
            case ParseNodeType.MemberAccess:
                return true;
        }

        log.debug('    NO DECL:', ParseTreeUtils.printParseNodeType, parent.nodeType);
        this.pushNewOccurrence(node, this.getLocalForDeclaration(node));
        return true;
    }

    override visitName(node: NameNode): boolean {
        if (!node.parent) {
            throw `No parent for named node: ${node.token.value}`;
        }

        if (node.token.value === '_') {
            return true;
        }

        const decls = this.evaluator.getDeclarationsForNameNode(node) || [];

        if (decls.length === 0) {
            return this.emitNameWithoutDeclaration(node);
        }

        // TODO: Consider what to do with additional declarations
        //  Currently, the only ones that I know that can have multiple declarations are overloaded functions.
        //  Not sure if there are others.
        //  At this point, it is acceptable to pick the first one as the definition for what you'd want to do
        //  with Sourcegraph.
        const decl = decls[0];
        return this.emitDeclaration(node, decl);
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

    private getScipSymbol(node: ParseNode, opts: ScipSymbolOptions | undefined = undefined): ScipSymbol {
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

        let moduleName: string | undefined = undefined;
        let pythonPackage: PythonPackage | undefined = undefined;
        if (opts) {
            moduleName = opts.moduleName;
            pythonPackage = opts.pythonPackage;
        }

        if (moduleName === undefined) {
            const nodeFileInfo = getFileInfo(node);
            if (!nodeFileInfo) {
                throw 'no file info';
            }

            moduleName = nodeFileInfo.moduleName;
            if (moduleName == 'builtins') {
                return this.emitBuiltinScipSymbol(node);
            } else if (Hardcoded.stdlib_module_names.has(moduleName)) {
                const symbol = this.makeScipSymbol(this.stdlibPackage, moduleName, node);
                this.emitExternalSymbolInformation(node, symbol, []);
                return symbol;
            }
        }

        if (pythonPackage === undefined) {
            pythonPackage = this.getPackageInfo(node, moduleName);
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
        }

        let newSymbol = this.makeScipSymbol(pythonPackage, moduleName, node);
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

    private emitBuiltinScipSymbol(
        builtinNode: ParseNode,
        builtinType: Type | undefined = undefined,
        decl: Declaration | undefined = undefined
    ): ScipSymbol {
        const node = builtinNode as NameNode;
        if (builtinType === undefined) {
            builtinType = this.evaluator.getBuiltInType(node, node.value);
        }

        if (!Types.isUnknown(builtinType)) {
            switch (builtinType.category) {
                case TypeCategory.Function: {
                    const symbol = this.getIntrinsicSymbol(node);
                    this.pushNewOccurrence(node, symbol);

                    const doc = builtinType.details.docString;
                    this.emitExternalSymbolInformation(node, symbol, doc ? [doc] : []);
                    return symbol;
                }
                case TypeCategory.OverloadedFunction: {
                    if (!decl) {
                        break;
                    }

                    const overloadedSymbol = this.getScipSymbol(decl.node);
                    this.pushNewOccurrence(node, overloadedSymbol);

                    const doc = builtinType.overloads.filter((overload) => overload.details.docString);
                    const docstring = [];
                    if (doc.length > 0 && doc[1].details.docString) {
                        docstring.push(doc[1].details.docString);
                    }

                    this.emitExternalSymbolInformation(node, overloadedSymbol, docstring);
                    return overloadedSymbol;
                }
                case TypeCategory.Class: {
                    const symbol = Symbols.makeClass(this.stdlibPackage, 'builtins', node.value);
                    this.pushNewOccurrence(node, symbol);

                    const doc = builtinType.details.docString;
                    this.emitExternalSymbolInformation(node, symbol, doc ? [doc] : []);
                    return symbol;
                }
                case TypeCategory.Module: {
                    const symbol = Symbols.makeModuleInit(this.stdlibPackage, builtinType.moduleName);
                    this.pushNewOccurrence(node, symbol);

                    this.emitExternalSymbolInformation(node, symbol, []);
                    return symbol;
                }
                case TypeCategory.None: {
                    return ScipSymbol.empty();
                }
                case TypeCategory.Union: {
                    const subType = builtinType.subtypes[0];
                    return this.emitBuiltinScipSymbol(builtinNode, subType, decl);
                }

                // Not sure what to do with TypeVars to be honeest, so fail in dev mode.
                //  We will do our best with makeScipSymbol later
                case TypeCategory.TypeVar: {
                    softAssert(false, 'unexpected TypeVar', builtinNode, builtinType, decl);
                    break;
                }

                // `Any` can be for things like __spec__ or other builtins that don't have a required type
                // (or that pyright doesn't recognize). In this case, we'll follow the default behavior.
                case TypeCategory.Any:
                    break;

                case TypeCategory.Never:
                case TypeCategory.Unbound:
                    return ScipSymbol.local(this.counter.next());
            }
        }

        return this.makeScipSymbol(this.stdlibPackage, 'builtins', node);
    }

    private makeScipSymbol(pythonPackage: PythonPackage, moduleName: string, node: ParseNode): ScipSymbol {
        switch (node.nodeType) {
            case ParseNodeType.Module: {
                moduleName = getFileInfo(node).moduleName;
                if (moduleName === 'builtins') {
                    return Symbols.makeModule(this.stdlibPackage, 'builtins');
                } else {
                    return Symbols.makeModule(pythonPackage, moduleName);
                }
            }
            case ParseNodeType.ModuleName: {
                // from .modulename import X
                //      ^^^^^^^^^^^ -> modulename/__init__

                if (node.nameParts.length === 0) {
                    if (node.leadingDots > 0) {
                        return ScipSymbol.local(this.counter.next());
                    }

                    softAssert(false, 'Unknown ModuleNamer to handle', node);
                    return ScipSymbol.local(this.counter.next());
                }

                const namePart = node.nameParts[0];
                if (Hardcoded.stdlib_module_names.has(namePart.value)) {
                    pythonPackage = this.stdlibPackage;
                }

                return Symbols.makeModuleInit(
                    pythonPackage,
                    node.nameParts.map((namePart) => namePart.value).join('.')
                );
            }
            case ParseNodeType.MemberAccess: {
                softAssert(false, 'Not supposed to get a member access');
                return ScipSymbol.empty();
            }
            case ParseNodeType.Parameter: {
                if (!node.name) {
                    log.debug('Paramerter with no name', node);
                    return ScipSymbol.local(this.counter.next());
                }
                // If the parent is a lambda, we can't generate a legal symbol
                // by appending a descriptor; the parameter needs to be a local
                // too.
                const parentSymbol = this.getScipSymbol(node.parent!);
                if (parentSymbol.isLocal()) {
                    return ScipSymbol.local(this.counter.next());
                }

                return Symbols.makeParameter(parentSymbol, node.name.value);
            }
            case ParseNodeType.Class: {
                return Symbols.makeType(this.getScipSymbol(node.parent!), (node as ClassNode).name.value);
            }
            case ParseNodeType.Function: {
                let cls = ParseTreeUtils.getEnclosingClass(node, false);
                if (cls) {
                    return Symbols.makeMethod(this.getScipSymbol(cls), (node as FunctionNode).name!.value);
                }

                return Symbols.makeMethod(this.getScipSymbol(node.parent!), (node as FunctionNode).name!.value);
            }
            case ParseNodeType.Suite: {
                if (node.parent) {
                    return this.getScipSymbol(node.parent!);
                }

                // TODO: Not sure what to do about this...
                //  I don't know if we ever need to include this at all.
                return Symbols.makeMeta(this.getScipSymbol(node.parent!), '#');
            }
            case ParseNodeType.Name: {
                const parent = node.parent;
                if (!parent) {
                    throw 'must have parent';
                }

                switch (parent.nodeType) {
                    case ParseNodeType.MemberAccess: {
                        const type = this.evaluator.getTypeOfExpression(parent.leftExpression);
                        switch (type.type.category) {
                            case TypeCategory.TypeVar: {
                                const typeVar = type.type;
                                const bound = typeVar.details.boundType! as ClassType;

                                return this.getSymbolOnce(node, () => {
                                    const pythonPackage = this.getPackageInfo(node, bound.details.moduleName)!;
                                    let symbol = Symbols.makeTerm(
                                        Symbols.makeType(
                                            Symbols.makeModule(pythonPackage, bound.details.moduleName),
                                            bound.details.name
                                        ),
                                        node.value
                                    );

                                    // TODO: We might not want to do this if it's not the definition?
                                    this.emitSymbolInformationOnce(node, symbol);
                                    return symbol;
                                });
                            }
                            default:
                        }
                    }
                }

                const enclosingSuite = ParseTreeUtils.getEnclosingSuite(node);
                if (enclosingSuite) {
                    // Certain enclosing suites contain their scope completely.
                    //
                    // For example, functions do not leak local variables.
                    // However, if statements and for loops do leak local variables.
                    //
                    // Note:
                    // It's possible we could have a performance improvement by
                    // only walking these functions if the
                    // enclosingSuite.parent is a certain nodetype, but for now
                    // I don't want to do that because it's easy to miss a
                    // case.
                    if (ParseTreeUtils.getEnclosingFunction(node) || ParseTreeUtils.getEnclosingLambda(node)) {
                        return ScipSymbol.local(this.counter.next());
                    }
                }

                return Symbols.makeTerm(this.getScipSymbol(enclosingSuite || parent), (node as NameNode).value);
            }
            case ParseNodeType.TypeAnnotation: {
                switch (node.valueExpression.nodeType) {
                    case ParseNodeType.Name: {
                        return Symbols.makeTerm(
                            this.getScipSymbol(ParseTreeUtils.getEnclosingSuite(node) || node.parent!),
                            node.valueExpression.value
                        );
                    }
                    default: {
                        softAssert(false, 'Unhandled type annotation');
                        return ScipSymbol.local(this.counter.next());
                    }
                }
            }
            case ParseNodeType.FunctionAnnotation: {
                return Symbols.makeTerm(
                    this.getScipSymbol(node.parent!),
                    // Descriptor.term((node as TypeAnnotationNode).typeAnnotation)
                    'FuncAnnotation'
                );
            }
            case ParseNodeType.Decorator: {
                softAssert(false, 'Should not handle decorators directly');
                return ScipSymbol.local(this.counter.next());
            }
            case ParseNodeType.Assignment: {
                // TODO: Check if we have more information
                //  Might even want to use enclosingModule
                const enclosing = ParseTreeUtils.getEnclosingClassOrFunction(node);
                if (enclosing) {
                    if (pythonPackage.version) {
                        return this.getScipSymbol(node.parent!);
                    } else {
                        return ScipSymbol.local(this.counter.next());
                    }
                }

                return this.getScipSymbol(node.parent!);
            }
            case ParseNodeType.ImportAs: {
                return Symbols.makeModuleInit(pythonPackage, moduleName);
            }
            case ParseNodeType.ImportFrom: {
                const importPackage = this.moduleNameNodeToPythonPackage(node.module);
                if (!importPackage) {
                    return this.getScipSymbol(node.module);
                }

                return this.makeScipSymbol(importPackage, _formatModuleName(node.module), node.module);
            }
            case ParseNodeType.ImportFromAs: {
                // TODO(0.2): Resolve all these weird import things.
                const decls = this.evaluator.getDeclarationsForNameNode(node.name);
                if (decls) {
                    const decl = decls[0];

                    const resolved = this.evaluator.resolveAliasDeclaration(decl, true);
                    if (!resolved) {
                        log.info('Interesting not getting the resolved:', decl);
                        return ScipSymbol.local(this.counter.next());
                    }

                    if (resolved.node && resolved.node.id != node.id) {
                        return this.getScipSymbol(resolved.node);
                    }
                }

                const type = this.getAliasedSymbolTypeForName(node, node.name.value);
                if (type) {
                    switch (type.category) {
                        case TypeCategory.Module: {
                            const parent = node.parent;
                            assert(parent);

                            switch (parent.nodeType) {
                                case ParseNodeType.ImportFrom: {
                                    const pythonPackage =
                                        this.moduleNameNodeToPythonPackage(parent.module) || this.projectPackage;

                                    return Symbols.makeModuleInit(
                                        pythonPackage,
                                        [...parent.module.nameParts, node.name].map((part) => part.value).join('.')
                                    );
                                }
                            }
                        }
                    }
                }

                return ScipSymbol.local(this.counter.next());
            }
            case ParseNodeType.Lambda: {
                return ScipSymbol.local(this.counter.next());
            }
            case ParseNodeType.ListComprehensionFor: {
                return ScipSymbol.local(this.counter.next());
            }
            case ParseNodeType.ListComprehension: {
                softAssert(false, 'Should never enter ListComprehension directly');
                return ScipSymbol.empty();
            }

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
                return this.getScipSymbol(node.parent!);

            default: {
                softAssert(
                    false,
                    `Unhandled: ${node.nodeType}: ${ParseTreeUtils.printParseNodeType(node.nodeType)}`,
                    ParseTreeUtils.getFileInfoFromNode(node)!.filePath
                );

                if (!node.parent) {
                    return ScipSymbol.local(this.counter.next());
                }
                return this.getScipSymbol(node.parent!);
            }
        }
    }

    // Take a `Type` from pyright and turn that into an LSIF symbol.
    private typeToSymbol(node: NameNode, declNode: ParseNode, typeObj: Type): ScipSymbol {
        if (Types.isFunction(typeObj)) {
            // TODO: Possibly worth checking for parent declarations.
            //  I'm not sure if that will actually work though for types.

            const decl = typeObj.details.declaration;
            if (!decl) {
                // throw 'Unhandled missing declaration for type: function';
                // console.warn('Missing Function Decl:', node.token.value, typeObj);
                return ScipSymbol.local(this.counter.next());
            }

            const declModuleName = decl.moduleName;
            let pythonPackage = this.guessPackage(declModuleName, decl.path);
            if (!pythonPackage) {
                return ScipSymbol.local(this.counter.next());
            }

            const enclosingClass = ParseTreeUtils.getEnclosingClass(declNode);
            if (enclosingClass) {
                const enclosingClassType = this.evaluator.getTypeOfClass(enclosingClass);
                if (enclosingClassType) {
                    let classType = enclosingClassType.classType;
                    const pythonPackage = this.guessPackage(classType.details.moduleName, classType.details.filePath)!;
                    const symbol = Symbols.makeClass(
                        pythonPackage,
                        classType.details.moduleName,
                        classType.details.name
                    );

                    return Symbols.makeMethod(symbol, node.value);
                }

                return ScipSymbol.local(this.counter.next());
            } else {
                return Symbols.makeMethod(Symbols.makeModule(pythonPackage, typeObj.details.moduleName), node.value);
            }
        } else if (Types.isClass(typeObj)) {
            const pythonPackage = this.getPackageInfo(node, typeObj.details.moduleName)!;
            return Symbols.makeClass(pythonPackage, typeObj.details.moduleName, node.value);
        } else if (Types.isClassInstance(typeObj)) {
            typeObj = typeObj as ClassType;
            throw 'oh yayaya';
            // return LsifSymbol.global(this.getLsifSymbol(decl.node), Descriptor.term(node.value)).value;
        } else if (Types.isTypeVar(typeObj)) {
            throw 'typevar';
        } else if (Types.isModule(typeObj)) {
            const pythonPackage = this.getPackageInfo(node, typeObj.moduleName)!;
            return Symbols.makeModuleInit(pythonPackage, typeObj.moduleName);
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

    // TODO: Investigate why I said we could remove this
    private pushTypeReference(node: NameNode, declNode: ParseNode, typeObj: Type): void {
        let symbol = this.rawGetLsifSymbol(declNode);
        if (!symbol) {
            symbol = this.typeToSymbol(node, declNode, typeObj);
            this.rawSetLsifSymbol(declNode, symbol, symbol.isLocal());
        }

        this.pushNewOccurrence(node, symbol);
    }

    private getLocalForDeclaration(node: ParseNode, documentation: string[] | undefined = undefined): ScipSymbol {
        const existing = this.rawGetLsifSymbol(node);
        if (existing) {
            return existing;
        }

        const symbol = ScipSymbol.local(this.counter.next());
        this.rawSetLsifSymbol(node, symbol, true);
        this.emitSymbolInformationOnce(node, symbol, documentation);
        return symbol;
    }

    // Might be the only way we can add new occurrences?
    private pushNewOccurrence(
        node: ParseNode,
        symbol: ScipSymbol,
        role: number = scip.SymbolRole.ReadAccess,
        // TODO(issue: https://github.com/sourcegraph/scip-python/issues/134)
        decl?: FunctionNode | ClassNode
    ): void {
        softAssert(symbol.value.trim() == symbol.value, `Invalid symbol ${node} -> ${symbol.value}`);

        this.document.occurrences.push(
            new scip.Occurrence({
                symbol_roles: role,
                symbol: symbol.value,
                range: parseNodeToRange(node, this.fileInfo!.lines).toLsif(),
                enclosing_range: decl && parseNodeToRange(decl, this.fileInfo!.lines).toLsif(),
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

    private emitExternalSymbolInformation(node: ParseNode, symbol: ScipSymbol, documentation: string[]) {
        if (this.externalSymbols.has(symbol.value)) {
            return;
        }

        if (documentation.length === 0) {
            const nodeFileInfo = getFileInfo(node)!;
            const hoverResult = this.program.getHoverForPosition(
                nodeFileInfo.filePath,
                convertOffsetToPosition(node.start, nodeFileInfo.lines),
                'markdown',
                _cancellationToken
            );

            if (hoverResult) {
                documentation = _formatHover(hoverResult!);
            }
        }

        if (documentation.length === 0) {
            return;
        }

        // TODO: Could consider adding the documentation finder stuff
        // from emitSymbolInformationOnce, but at this point we don't
        // need that.
        this.externalSymbols.set(
            symbol.value,
            new scip.SymbolInformation({
                symbol: symbol.value,
                documentation: documentation,
            })
        );
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
                new scip.SymbolInformation({
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
            _cancellationToken
        );

        if (hoverResult) {
            this.document.symbols.push(
                new scip.SymbolInformation({
                    symbol: symbol.value,
                    documentation: _formatHover(hoverResult!),
                })
            );

            return;
        }

        this._docstringWriter.walk(node);
        const docstringFromWriter = this._docstringWriter.docstrings.get(node.id);

        // Only write a new symbol if we actually have any useful documentation
        // (which is not a guarantee from docstringWriter)
        if (docstringFromWriter === undefined) {
            return;
        }

        const docs = '```python\n' + docstringFromWriter.join('\n') + '\n```';
        this.document.symbols.push(
            new scip.SymbolInformation({
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

    private moduleNameNodeToPythonPackage(
        node: ModuleNameNode,
        decl: Declaration | undefined = undefined
    ): PythonPackage | undefined {
        // If it has leading dots, then we know it's from this package
        if (node.leadingDots > 0) {
            return this.projectPackage;
        }

        if (node.nameParts.length === 0) {
            softAssert(false, 'how can this be?', node);
        }

        const declModuleName = _formatModuleName(node);
        return this.guessPackage(declModuleName, decl ? decl.path : undefined);
    }

    public guessPackage(moduleName: string, declPath: string | undefined = undefined): PythonPackage | undefined {
        if (moduleName === 'builtins') {
            return this.stdlibPackage;
        }

        if (moduleName.startsWith('.')) {
            return this.projectPackage;
        }

        if (declPath && declPath.length !== 0) {
            const p = path.resolve(declPath);

            if (p.startsWith(this.cwd)) {
                return this.projectPackage;
            }
        }

        let pythonPackage = this.config.pythonEnvironment.getPackageForModule(moduleName);
        if (pythonPackage) {
            return pythonPackage;
        }

        pythonPackage = this.config.pythonEnvironment.guessPackage(moduleName);
        if (pythonPackage) {
            return pythonPackage;
        }

        let nameParts = moduleName.split('.');
        let firstPart = nameParts[0];
        if (Hardcoded.stdlib_module_names.has(firstPart)) {
            return this.stdlibPackage;
        }

        return undefined;
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

function hasAncestor(node: ParseNode, ...types: ParseNodeType[]): boolean {
    let type = new Set(types);

    let ancestor: ParseNode | undefined = node;
    while (ancestor) {
        if (type.has(ancestor.nodeType)) {
            return true;
        }

        ancestor = ancestor.parent;
    }

    return false;
}

function isBuiltinModuleName(moduleName: string): boolean {
    if (moduleName == 'builtins') {
        return true;
    }

    if (Hardcoded.stdlib_module_names.has(moduleName)) {
        return true;
    }

    return false;
}
