import ora, { Ora } from 'ora';

export const statusConfig = {
    showProgress: true,
};

export function withStatus<T>(msg: string, f: (s: Ora) => T): T {
    const spinner = ora({
        text: msg,
        spinner: 'arc',
        interval: 100,
    });

    if (statusConfig.showProgress) {
        spinner.start();
    }

    let v = f(spinner);

    spinner.succeed();
    return v;
}
