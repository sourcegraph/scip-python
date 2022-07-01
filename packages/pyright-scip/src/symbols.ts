import { Declaration } from 'pyright-internal/analyzer/declaration';
import { TypeEvaluator } from 'pyright-internal/analyzer/typeEvaluatorTypes';
import { NameNode, ParseNode, ParseNodeType } from 'pyright-internal/parser/parseNodes';
import { Counter } from './lsif-typescript/Counter';
import { metaDescriptor, packageDescriptor, typeDescriptor } from './lsif-typescript/Descriptor';
import { ScipSymbol } from './ScipSymbol';
import { TreeVisitor } from './treeVisitor';
import PythonPackage from './virtualenv/PythonPackage';

export function pythonModule(pythonPackage: PythonPackage, moduleName: string): ScipSymbol {
    return ScipSymbol.global(
        ScipSymbol.global(ScipSymbol.package(pythonPackage.name, pythonPackage.version), packageDescriptor(moduleName)),
        metaDescriptor('__init__')
    );
}

export function makePackage(pythonPackage: PythonPackage): ScipSymbol {
    return ScipSymbol.package(pythonPackage.name, pythonPackage.version);
}

export function makeModule(moduleName: string, pythonPackage: PythonPackage): ScipSymbol {
    return ScipSymbol.global(
        ScipSymbol.global(makePackage(pythonPackage), packageDescriptor(moduleName)),
        metaDescriptor('__init__')
    );
}

export function makeClass(pythonPackage: PythonPackage, moduleName: string, name: string) {
    return ScipSymbol.global(
        ScipSymbol.global(makePackage(pythonPackage), packageDescriptor(moduleName)),
        typeDescriptor(name)
    );
}

export function make(node: ParseNode, counter: Counter): ScipSymbol {
    return ScipSymbol.local(counter.next());
}
