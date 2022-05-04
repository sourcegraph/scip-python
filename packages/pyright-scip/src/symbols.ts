import { Declaration } from 'pyright-internal/analyzer/declaration';
import { TypeEvaluator } from 'pyright-internal/analyzer/typeEvaluatorTypes';
import { NameNode, ParseNode, ParseNodeType } from 'pyright-internal/parser/parseNodes';
import { Counter } from './lsif-typescript/Counter';
import { metaDescriptor, packageDescriptor } from './lsif-typescript/Descriptor';
import { LsifSymbol } from './LsifSymbol';
import { TreeVisitor } from './treeVisitor';
import PythonPackage from './virtualenv/PythonPackage';

export function pythonModule(visitor: TreeVisitor, node: ParseNode, moduleName: string): LsifSymbol {
    let pythonPackage = visitor.getPackageInfo(node, moduleName);
    if (pythonPackage) {
        return LsifSymbol.global(
            LsifSymbol.global(
                LsifSymbol.package(pythonPackage.name, pythonPackage.version),
                packageDescriptor(moduleName)
            ),
            metaDescriptor('__init__')
        );
    } else {
        throw 'could not find package information';
    }
}

export function makePackage(pythonPackage: PythonPackage): LsifSymbol {
    return LsifSymbol.package(pythonPackage.name, pythonPackage.version);
}

export function makeModule(moduleName: string, pythonPackage: PythonPackage): LsifSymbol {
    return LsifSymbol.global(
        LsifSymbol.global(makePackage(pythonPackage), packageDescriptor(moduleName)),
        metaDescriptor('__init__')
    );
}

export function makeModuleName(node: NameNode, decl: Declaration, evaluator: TypeEvaluator): LsifSymbol | undefined {
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

export function make(node: ParseNode, counter: Counter): LsifSymbol {
    return LsifSymbol.local(counter.next());
}
