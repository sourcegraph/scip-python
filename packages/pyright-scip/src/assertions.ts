import { normalizePathCase } from 'pyright-internal/common/pathUtils';
import { PyrightFileSystem } from 'pyright-internal/pyrightFileSystem';
import { createFromRealFileSystem } from 'pyright-internal/common/realFileSystem';

const _fs = new PyrightFileSystem(createFromRealFileSystem());
const sometimesResults = new Map<string, Set<boolean>>();

// Only enable assertions in test mode
const isTestMode = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

export function assertNeverNormalized(path: string): void {
    if (!isTestMode) return;

    const normalized = normalizePathCase(_fs, path);
    if (normalized === path) {
        throw new Error(`Path should not be normalized but was: ${path}`);
    }
}

export function assertAlwaysNormalized(path: string): void {
    if (!isTestMode) return;

    const normalized = normalizePathCase(_fs, path);
    if (normalized !== path) {
        throw new Error(`Path should be normalized but was not: ${path} -> ${normalized}`);
    }
}

export function assertSometimesNormalized(path: string, key: string): void {
    if (!isTestMode) return;

    const normalized = normalizePathCase(_fs, path);
    const isNormalized = normalized === path;

    if (!sometimesResults.has(key)) {
        sometimesResults.set(key, new Set());
    }
    sometimesResults.get(key)!.add(isNormalized);
}

export function checkSometimesAssertions(): void {
    if (!isTestMode) return;

    for (const [key, values] of sometimesResults) {
        // We should see both true and false for "sometimes" assertions
        if (values.size <= 1) {
            console.warn(`Assertion '${key}' was not mixed across test contexts`);
        }
    }
    sometimesResults.clear();
}
