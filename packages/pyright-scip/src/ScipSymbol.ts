import { LsifSymbol as TypescriptScipSymbol } from './lsif-typescript/LsifSymbol';

// @ts-ignore
export class ScipSymbol extends TypescriptScipSymbol {
    constructor(value: string) {
        super(value);
    }

    public static override package(name: string, version: string): TypescriptScipSymbol {
        name = normalizeNameOrVersion(name);
        version = normalizeNameOrVersion(version);

        // @ts-ignore
        return new TypescriptScipSymbol(`scip-python python ${name} ${version} `);
    }
}

// See https://github.com/sourcegraph/scip/blob/main/scip.proto#L118-L121
function normalizeNameOrVersion(s: string): string {
    if (s === '') {
        return '.';
    }
    if (s.indexOf(' ') === -1) {
        return s;
    }
    return s.replace(/ /g, '  ');
}
