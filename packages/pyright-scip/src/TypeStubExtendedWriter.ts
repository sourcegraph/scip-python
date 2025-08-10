import { SourceFile } from 'pyright-internal/analyzer/sourceFile';
import { TypeEvaluator } from 'pyright-internal/analyzer/typeEvaluatorTypes';
import {
    ClassType,
    isFunction,
    isInstantiableClass,
    isNever,
    isUnknown,
    removeUnknownFromUnion,
} from 'pyright-internal/analyzer/types';
import { TypeStubWriter } from 'pyright-internal/analyzer/typeStubWriter';
import {
    ArgumentCategory,
    AssignmentNode,
    ClassNode,
    DecoratorNode,
    ExpressionNode,
    FunctionNode,
    ParameterCategory,
    ParameterNode,
    ParseNodeType,
    TypeAnnotationNode,
} from 'pyright-internal/parser/parseNodes';
import * as TypeUtils from 'pyright-internal/analyzer/typeUtils';
import * as ParseTreeUtils from 'pyright-internal/analyzer/parseTreeUtils';

// TypeStubExtendedWriter extends several aspects of the TypeStubWriter from pyright.
// I'm using this primarily to get some pretty-looking, formatted type information to
// display in the hover text for various Python objects.
//
// At some point, we could try and think about how to re-use a bit more code, rather
// than copy several of the different `visit*` methods, but it works pretty well for now.
//
// I have to ignore the private stuff for now -- can reset this later if we want.
//
// @ts-ignore
export class TypeStubExtendedWriter extends TypeStubWriter {
    /// Stores docstrings by node id, so that you only need to calculate them once.
    /// It also allows retrieval of the docstring for various nodes (since visitors
    /// don't return anything except for whether to continue traversing or not).
    public docstrings: Map<number, string[]>;

    constructor(sourceFile: SourceFile, public evaluator: TypeEvaluator) {
        super('', sourceFile, evaluator);

        this.docstrings = new Map<number, string[]>();
    }

    override visitClass(node: ClassNode): boolean {
        const className = node.name.value;

        let line = '';
        line += this._printDecorators(node.decorators);
        line += `class ${className}`;

        // Remove "object" from the list, since it's implied
        const args = node.arguments.filter(
            (arg) =>
                arg.name !== undefined ||
                arg.argumentCategory !== ArgumentCategory.Simple ||
                arg.valueExpression.nodeType !== ParseNodeType.Name ||
                arg.valueExpression.value !== 'object'
        );

        if (args.length > 0) {
            line += `(${args
                .map((arg) => {
                    let argString = '';
                    if (arg.name) {
                        argString = arg.name.value + '=';
                    }
                    argString += this._printExpression(arg.valueExpression);
                    return argString;
                })
                .join(', ')})`;
        }
        line += ':';

        this.docstrings.set(node.id, [line]);

        return false;
    }

    override visitFunction(node: FunctionNode): boolean {
        const functionName = node.name.token.value;
        let line = '';
        line += this._printDecorators(node.decorators);
        line += node.isAsync ? 'async ' : '';
        line += `def ${functionName}`;

        const mappedParameters = node.parameters.map((param, index) => this._printParameter(param, node, index));
        if (mappedParameters.length <= 0) {
            line += `(${mappedParameters.join(', ')})`;
        } else {
            // TODO: I don't really like this, but I also _hate_ the way things
            // are wrapped currently in the hover. So we could come back to this part later.
            line += `(\n  ${mappedParameters.join(',\n  ')}\n)`;
        }

        let returnAnnotation: string | undefined;
        if (node.returnTypeAnnotation) {
            returnAnnotation = this._printExpression(node.returnTypeAnnotation, /* treatStringsAsSymbols */ true);
        } else if (node.functionAnnotationComment) {
            returnAnnotation = this._printExpression(
                node.functionAnnotationComment.returnTypeAnnotation,
                /* treatStringsAsSymbols */ true
            );
        } else {
            // Handle a few common cases where we always know the answer.
            if (node.name.value === '__init__') {
                returnAnnotation = 'None';
            } else if (node.name.value === '__str__') {
                returnAnnotation = 'str';
            } else if (['__int__', '__hash__'].some((name) => name === node.name.value)) {
                returnAnnotation = 'int';
            } else if (
                ['__eq__', '__ne__', '__gt__', '__lt__', '__ge__', '__le__'].some((name) => name === node.name.value)
            ) {
                returnAnnotation = 'bool';
            }
        }

        if (returnAnnotation) {
            line += ' -> ' + returnAnnotation;
        }

        line += ':';

        // If there was not return type annotation, see if we can infer
        // a type that is not unknown and add it as a comment.
        if (!returnAnnotation) {
            const functionType = this.evaluator.getTypeOfFunction(node);
            if (functionType && isFunction(functionType.functionType)) {
                let returnType = this.evaluator.getFunctionInferredReturnType(functionType.functionType);
                returnType = removeUnknownFromUnion(returnType);
                if (!isNever(returnType) && !isUnknown(returnType)) {
                    line += ` # -> ${this.evaluator.printType(returnType, { expandTypeAlias: false })}:`;
                }
            }
        }

        this.docstrings.set(node.id, [line]);

        return true;
    }

    override visitTypeAnnotation(node: TypeAnnotationNode): boolean {
        let isTypeAlias = false;
        let line = '';

        // Handle cases where left expression is a simple name assignment (e.g., "a = 1").
        if (node.valueExpression.nodeType === ParseNodeType.Name && node.parent?.nodeType === ParseNodeType.Assignment) {
            // TODO: Handle "__all__" as a special case.
            // if (leftExpr.value === '__all__') {
            //     if (this._functionNestCount === 0 && this._ifNestCount === 0) {
            //         this._emittedSuite = true;
            //
            //         line = this._printExpression(leftExpr);
            //         line += ' = ';
            //         line += this._printExpression(node.rightExpression);
            //         this._emitLine(line);
            //     }
            //
            //     return false;
            // }

            const valueType = this.evaluator.getType(node.valueExpression);

            if (node.parent.typeAnnotationComment) {
                line += this._printExpression(node.parent.typeAnnotationComment, /* treatStringsAsSymbols */ true);
            } else if (valueType) {
                line += TypeUtils.getFullNameOfType(valueType);
            }

            if (valueType?.typeAliasInfo) {
                isTypeAlias = true;
            } else if (node.parent.rightExpression.nodeType === ParseNodeType.Call) {
                // Special-case TypeVar, TypeVarTuple, ParamSpec and NewType calls.
                // Treat them like type aliases.
                const callBaseType = this.evaluator.getType(node.parent.rightExpression.leftExpression);
                if (
                    callBaseType &&
                    isInstantiableClass(callBaseType) &&
                    ClassType.isBuiltIn(callBaseType, ['TypeVar', 'TypeVarTuple', 'ParamSpec', 'NewType'])
                ) {
                    isTypeAlias = true;
                }
            }

            if (line && isTypeAlias) {
                line += ' = ';
                line += this._printExpression(node.parent.rightExpression);
            }
        }

        if (line) {
            this.docstrings.set(node.id, [line]);
        }

        return true;
    }

    override visitAssignment(node: AssignmentNode): boolean {
        let isTypeAlias = false;
        let line = '';

        if (node.leftExpression.nodeType === ParseNodeType.Name) {
            // TODO: Handle "__all__" as a special case.
            // if (node.leftExpression.value === '__all__') {
            //     if (this._functionNestCount === 0 && this._ifNestCount === 0) {
            //         this._emittedSuite = true;
            //
            //         line = this._printExpression(node.leftExpression);
            //         line += ' = ';
            //         line += this._printExpression(node.rightExpression);
            //         this._emitLine(line);
            //     }
            //
            //     return false;
            // }

            const valueType = this.evaluator.getType(node.leftExpression);

            if (node.typeAnnotationComment) {
                line += this._printExpression(node.typeAnnotationComment, /* treatStringsAsSymbols */ true);
            } else if (valueType) {
                line += TypeUtils.getFullNameOfType(valueType);
            }

            if (valueType?.typeAliasInfo) {
                isTypeAlias = true;
            } else if (node.rightExpression.nodeType === ParseNodeType.Call) {
                // Special-case TypeVar, TypeVarTuple, ParamSpec and NewType calls.
                // Treat them like type aliases.
                const callBaseType = this.evaluator.getType(node.rightExpression.leftExpression);
                if (
                    callBaseType &&
                    isInstantiableClass(callBaseType) &&
                    ClassType.isBuiltIn(callBaseType, ['TypeVar', 'TypeVarTuple', 'ParamSpec', 'NewType'])
                ) {
                    isTypeAlias = true;
                }
            }
        }

        if (line) {
            if (isTypeAlias) {
                line += ' = ';
                line += this._printExpression(node.rightExpression);
            }

            this.docstrings.set(node.id, [line]);
        }

        return true;
    }

    /// Copied from super()._printParameter() except that the defaultValue is displayed in a more useful way for the
    /// docstring. If we were to remove that from the hover, then we could go back to just calling the super() method
    /// here.
    private override _printParameter(paramNode: ParameterNode, functionNode: FunctionNode, paramIndex: number): string {
        let line = '';
        if (paramNode.category === ParameterCategory.VarArgList) {
            line += '*';
        } else if (paramNode.category === ParameterCategory.VarArgDictionary) {
            line += '**';
        }

        if (paramNode.name) {
            line += paramNode.name.value;
        }

        const paramTypeAnnotation = ParseTreeUtils.getTypeAnnotationForParameter(functionNode, paramIndex);

        let paramType = '';
        if (paramTypeAnnotation) {
            paramType = this._printExpression(paramTypeAnnotation, /* treatStringsAsSymbols */ true);
        }

        if (paramType) {
            line += ': ' + paramType;
        }

        if (paramNode.defaultValue) {
            // Follow PEP8 spacing rules. Include spaces if type
            // annotation is present, no space otherwise.
            if (paramType) {
                line += ' = ';
            } else {
                line += '=';
            }
            line += this._printExpression(paramNode.defaultValue!, false, true);
        }

        return line;
    }

    override _printExpression(node: ExpressionNode, isType = false, treatStringsAsSymbols = false): string {
        // @ts-ignore
        return super._printExpression(node, isType, treatStringsAsSymbols);
    }

    private _printDecorators(decorators: DecoratorNode[]) {
        let line = '';
        decorators.forEach((decorator) => {
            line += '@' + this._printExpression(decorator.expression) + '\n';
        });

        return line;
    }
}
