export const statusConfig = {
    quiet: true,
    dev: false,
};

export interface StatusUpdater {
    progress: (msg: any) => void;
    progressDev: (msg: any) => void;
}

export function withStatus<T>(msg: string, f: () => T): T {
    if (!statusConfig.quiet) {
        console.log(msg, '...');
    }

    return f();
}
