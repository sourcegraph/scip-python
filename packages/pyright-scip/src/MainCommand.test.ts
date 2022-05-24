import assert from 'assert';
import { DEFAULT_OUTPUT_FILE, IndexOptions, mainCommand } from './MainCommand';

function checkIndexParser(args: string[], expectedOptions: Partial<IndexOptions>): void {
    test(args.join(' '), () => {
        let isAssertionTriggered = false;
        const actualArguments = ['node', 'index.js', 'index', '--project-name', 'snapshot-util', ...args];
        mainCommand(
            (options) => {
                assert.deepEqual(options, { ...options, ...expectedOptions });
                isAssertionTriggered = true;
            },
            () => {}
        ).parse(actualArguments);
        assert.ok(isAssertionTriggered);
    });
}

// defaults
checkIndexParser([], {
    progressBar: true,
    cwd: process.cwd(),
    output: DEFAULT_OUTPUT_FILE,
    projectName: 'snapshot-util',
});

checkIndexParser(['--cwd', 'qux'], { cwd: 'qux' });
checkIndexParser(['--no-progress-bar'], { progressBar: false });
