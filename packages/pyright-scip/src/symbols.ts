import { Declaration } from 'pyright-internal/analyzer/declaration';
import { TypeEvaluator } from 'pyright-internal/analyzer/typeEvaluatorTypes';
import { NameNode, ParseNode, ParseNodeType } from 'pyright-internal/parser/parseNodes';
import { Counter } from './lsif-typescript/Counter';
import { metaDescriptor, packageDescriptor, typeDescriptor } from './lsif-typescript/Descriptor';
import { ScipSymbol } from './ScipSymbol';
import { TreeVisitor } from './treeVisitor';
import PythonPackage from './virtualenv/PythonPackage';

export function pythonModule(visitor: TreeVisitor, node: ParseNode, moduleName: string): ScipSymbol {
    let pythonPackage = visitor.getPackageInfo(node, moduleName);
    if (pythonPackage) {
        return ScipSymbol.global(
            ScipSymbol.global(
                ScipSymbol.package(pythonPackage.name, pythonPackage.version),
                packageDescriptor(moduleName)
            ),
            metaDescriptor('__init__')
        );
    } else {
        throw 'could not find package information';
    }
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

export function makeModuleName(node: NameNode, decl: Declaration, evaluator: TypeEvaluator): ScipSymbol | undefined {
    if (node.parent!.nodeType !== ParseNodeType.ModuleName) {
        throw 'Expected ModuleName';
    }

    // const resolved = evaluator.resolveAliasDeclaration(decl, true);
    // console.log(node.token.value, decl, resolved);

    // return LsifSymbol.global(
    //     LsifSymbol.global(
    //         LsifSymbol.package(pythonPackage.name, pythonPackage.version),
    //         packageDescriptor(node.nameParts.map((namePart) => namePart.value).join('.'))
    //     ),
    //     metaDescriptor('__init__')
    // );
    return undefined;
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
