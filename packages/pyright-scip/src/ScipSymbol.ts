import { LsifSymbol as TypescriptScipSymbol } from './lsif-typescript/LsifSymbol';

// @ts-ignore
export class ScipSymbol extends TypescriptScipSymbol {
    constructor(value: string) {
        super(value);
    }

    public static override package(name: string, version: string): TypescriptScipSymbol {
        name = name.replace(/\./, '/');
        name = name.trim();

        if (name === '.' || name === '/') {
            throw new Error('Package name cannot be "." or "/"');
        }

        // @ts-ignore
        return new TypescriptScipSymbol(`scip-python python ${name} ${version} `);
    }
}
