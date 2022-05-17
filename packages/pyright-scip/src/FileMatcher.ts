import { ConfigOptions } from 'pyright-internal/common/configOptions';
import { FileSystem } from 'pyright-internal/common/fileSystem';
import { combinePaths, FileSpec, getFileSystemEntries, tryRealpath, tryStat } from 'pyright-internal/common/pathUtils';

const _includeFileRegex = /\.pyi?$/;

// FileMatcher is a (mostly) copy & paste from the resolve that can be found in `analyzer.ts`
//  I couldn't find anywhere that this was extracted to (perhaps later we can do that, but for now this works just fine)
export class FileMatcher {
    private _console: any;

    constructor(private _configOptions: ConfigOptions, private _fs: FileSystem) {
        this._console = console;
    }

    public matchFiles(include: FileSpec[], exclude: FileSpec[]): string[] {
        const envMarkers = [['bin', 'activate'], ['Scripts', 'activate'], ['pyvenv.cfg']];
        const results: string[] = [];
        const startTime = Date.now();
        const longOperationLimitInSec = 10;
        let loggedLongOperationError = false;

        const visitDirectoryUnchecked = (absolutePath: string, includeRegExp: RegExp) => {
            if (!loggedLongOperationError) {
                const secondsSinceStart = (Date.now() - startTime) * 0.001;

                // If this is taking a long time, log an error to help the user
                // diagnose and mitigate the problem.
                if (secondsSinceStart >= longOperationLimitInSec) {
                    this._console.error(
                        `Enumeration of workspace source files is taking longer than ${longOperationLimitInSec} seconds.\n` +
                            'This may be because:\n' +
                            '* You have opened your home directory or entire hard drive as a workspace\n' +
                            '* Your workspace contains a very large number of directories and files\n' +
                            '* Your workspace contains a symlink to a directory with many files\n' +
                            '* Your workspace is remote, and file enumeration is slow\n' +
                            'To reduce this time, open a workspace directory with fewer files ' +
                            'or add a pyrightconfig.json configuration file with an "exclude" section to exclude ' +
                            'subdirectories from your workspace. For more details, refer to ' +
                            'https://github.com/microsoft/pyright/blob/main/docs/configuration.md.'
                    );
                    loggedLongOperationError = true;
                }
            }

            if (this._configOptions.autoExcludeVenv) {
                if (envMarkers.some((f) => this._fs.existsSync(combinePaths(absolutePath, ...f)))) {
                    this._console.info(`Auto-excluding ${absolutePath}`);
                    return;
                }
            }

            const { files, directories } = getFileSystemEntries(this._fs, absolutePath);

            for (const file of files) {
                const filePath = combinePaths(absolutePath, file);

                if (this._matchIncludeFileSpec(includeRegExp, exclude, filePath)) {
                    results.push(filePath);
                }
            }

            for (const directory of directories) {
                const dirPath = combinePaths(absolutePath, directory);
                if (includeRegExp.test(dirPath)) {
                    if (!this._isInExcludePath(dirPath, exclude)) {
                        visitDirectory(dirPath, includeRegExp);
                    }
                }
            }
        };

        const seenDirs = new Set<string>();
        const visitDirectory = (absolutePath: string, includeRegExp: RegExp) => {
            const realDirPath = tryRealpath(this._fs, absolutePath);
            if (!realDirPath) {
                this._console.warn(`Skipping broken link "${absolutePath}"`);
                return;
            }

            if (seenDirs.has(realDirPath)) {
                this._console.warn(`Skipping recursive symlink "${absolutePath}" -> "${realDirPath}"`);
                return;
            }
            seenDirs.add(realDirPath);

            try {
                visitDirectoryUnchecked(absolutePath, includeRegExp);
            } finally {
                seenDirs.delete(realDirPath);
            }
        };

        include.forEach((includeSpec) => {
            if (!this._isInExcludePath(includeSpec.wildcardRoot, exclude)) {
                let foundFileSpec = false;

                const stat = tryStat(this._fs, includeSpec.wildcardRoot);
                if (stat?.isFile()) {
                    if (this._shouldIncludeFile(includeSpec.wildcardRoot)) {
                        results.push(includeSpec.wildcardRoot);
                        foundFileSpec = true;
                    }
                } else if (stat?.isDirectory()) {
                    visitDirectory(includeSpec.wildcardRoot, includeSpec.regExp);
                    foundFileSpec = true;
                }

                if (!foundFileSpec) {
                    this._console.error(`File or directory "${includeSpec.wildcardRoot}" does not exist.`);
                }
            }
        });

        return results;
    }

    private _matchIncludeFileSpec(includeRegExp: RegExp, exclude: FileSpec[], filePath: string) {
        if (includeRegExp.test(filePath)) {
            if (!this._isInExcludePath(filePath, exclude) && this._shouldIncludeFile(filePath)) {
                return true;
            }
        }

        return false;
    }

    private _shouldIncludeFile(filePath: string) {
        return _includeFileRegex.test(filePath);
    }

    private _isInExcludePath(path: string, excludePaths: FileSpec[]) {
        return !!excludePaths.find((excl) => excl.regExp.test(path));
    }
}
