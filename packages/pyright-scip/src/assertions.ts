import { normalizePathCase, isFileSystemCaseSensitive } from 'pyright-internal/common/pathUtils';
import { PyrightFileSystem } from 'pyright-internal/pyrightFileSystem';
import { createFromRealFileSystem } from 'pyright-internal/common/realFileSystem';

export enum SeenCondition {
    AlwaysFalse = 'always-false',
    AlwaysTrue = 'always-true',
    Mixed = 'mixed'
}

export class AssertionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AssertionError';
    }
}

// Private global state - never export directly
let _assertionFlags = {
    pathNormalizationChecks: false,
    otherChecks: false
};
let _context = '';
const _sometimesResults = new Map<string, Map<string, SeenCondition>>();

export function setGlobalAssertionFlags(pathNormalizationChecks: boolean, otherChecks: boolean): void {
    _assertionFlags.pathNormalizationChecks = pathNormalizationChecks;
    _assertionFlags.otherChecks = otherChecks;
}

export function setGlobalContext(context: string): void {
    _context = context;
}

// Internal implementation functions
function assertAlwaysImpl(enableFlag: boolean, check: () => boolean, message: () => string): void {
    if (!enableFlag) return;
    
    if (!check()) {
        throw new AssertionError(message());
    }
}

function assertSometimesImpl(enableFlag: boolean, check: () => boolean, key: string): void {
    if (!enableFlag) return;
    
    const ctx = _context;
    if (ctx === '') {
        throw new AssertionError('Context must be set before calling assertSometimes');
    }
    
    let ctxMap = _sometimesResults.get(key);
    if (!ctxMap) {
        ctxMap = new Map();
        _sometimesResults.set(key, ctxMap);
    }
    
    const result = check() ? SeenCondition.AlwaysTrue : SeenCondition.AlwaysFalse;
    const prev = ctxMap.get(ctx);
    
    if (prev === undefined) {
        ctxMap.set(ctx, result);
    } else if (prev !== result) {
        ctxMap.set(ctx, SeenCondition.Mixed);
    }
}

const _fs = new PyrightFileSystem(createFromRealFileSystem());

export function assertAlways(check: () => boolean, message: () => string): void {
    assertAlwaysImpl(_assertionFlags.otherChecks, check, message);
}

export function assertSometimes(check: () => boolean, key: string): void {
    assertSometimesImpl(_assertionFlags.otherChecks, check, key);
}

export function assertNeverNormalized(path: string): void {
    const normalized = normalizePathCase(_fs, path);
    assertAlwaysImpl(
        _assertionFlags.pathNormalizationChecks,
        () => normalized !== path,
        () => `Path should not be normalized but was: ${path}`
    );
}

export function assertAlwaysNormalized(path: string): void {
    const normalized = normalizePathCase(_fs, path);
    assertAlwaysImpl(
        _assertionFlags.pathNormalizationChecks,
        () => normalized === path,
        () => `Path should be normalized but was not: ${path} -> ${normalized}`
    );
}

export function assertSometimesNormalized(path: string, key: string): void {
    const normalized = normalizePathCase(_fs, path);
    assertSometimesImpl(
        _assertionFlags.pathNormalizationChecks,
        () => normalized === path,
        key
    );
}

// Monoidal combination logic
function combine(a: SeenCondition, b: SeenCondition): SeenCondition {
    if (a === b) return a;
    if (a === SeenCondition.Mixed || b === SeenCondition.Mixed) {
        return SeenCondition.Mixed;
    }
    // AlwaysTrue + AlwaysFalse = Mixed
    return SeenCondition.Mixed;
}

export function checkSometimesAssertions(): Map<string, SeenCondition> {
    const summary = new Map<string, SeenCondition>();
    
    for (const [key, ctxMap] of _sometimesResults) {
        let agg: SeenCondition | undefined;
        for (const state of ctxMap.values()) {
            agg = agg === undefined ? state : combine(agg, state);
            if (agg === SeenCondition.Mixed) break;
        }
        if (agg !== undefined) {
            summary.set(key, agg);
        }
    }
    
    return summary;
}
