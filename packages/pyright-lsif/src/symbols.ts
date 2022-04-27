import { ParseNode } from 'pyright-internal/parser/parseNodes';
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
        throw 'could not find package information'
    }
}

export function make(node: ParseNode, counter: Counter): LsifSymbol {
    return LsifSymbol.local(counter.next());
}
