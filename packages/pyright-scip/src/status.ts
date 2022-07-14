const statusConfig = { quiet: true };

class Logger {
    private lastProgressMsg: Date;

    /// Minimum number of seconds between progress messages in the output.
    public showProgressRateLimit: number;

    public depth: number;

    constructor(showProgressRateLimit = 1) {
        this.depth = 0;
        this.showProgressRateLimit = showProgressRateLimit;
        this.lastProgressMsg = new Date();
    }

    private timestamp(): string {
        const now = new Date();
        return `(${now.toLocaleTimeString('default', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        })}) `;
    }

    section(msg: string): void {
        this.write_message(this.depth, msg);

        this.depth += 1;
        this.lastProgressMsg = new Date();
    }

    message(msg: string): void {
        this.write_message(this.depth + 1, msg);
    }

    write_message(depth: number, msg: string): void {
        process.stdout.write(this.timestamp());
        if (depth > 0) {
            process.stdout.write('  '.repeat(this.depth));
        }
        console.log(msg);
    }

    complete(): void {
        this.depth -= 1;
    }

    progress(msg: string): void {
        const now = new Date();
        if (
            this.showProgressRateLimit == 0 ||
            !this.lastProgressMsg ||
            (now.getTime() - this.lastProgressMsg.getTime()) / 1000 > this.showProgressRateLimit
        ) {
            this.lastProgressMsg = now;
            this.write_message(this.depth + 1, '- ' + msg);
        }
    }
}

const logger = new Logger();

export interface StatusUpdater {
    /// Send a message at a certain interval (when enabled).
    /// Use this to send messages that could be sent many times (which will prevent
    /// messages being spammed in the logs)
    progress: (msg: any) => void;

    /// Messasge will always send a message (when enabled).
    /// Do not use within tight loops that could generate thousands of messages,
    /// instead use StatusUpdater.progress
    message: (msg: any) => void;
}

export function setQuiet(quiet: boolean): void {
    statusConfig.quiet = quiet;
}

export function setShowProgressRateLimit(ratelimit: number): void {
    logger.showProgressRateLimit = ratelimit;
}

export function withStatus<T>(msg: string, f: (progress: StatusUpdater) => T): T {
    const progress = statusConfig.quiet
        ? { section: () => {}, complete: () => {}, progress: (_: string) => {}, message: (_: string) => {} }
        : logger;

    progress.section(msg);
    const val = f(progress);
    progress.complete();

    return val;
}

export function sendStatus(msg: string) {
    if (statusConfig.quiet) {
        return;
    }

    logger.write_message(0, msg);
}
