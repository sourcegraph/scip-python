import * as TOML from '@iarna/toml';
import * as JSONC from 'jsonc-parser';
import { findPythonSearchPaths, getTypeShedFallbackPath } from 'pyright-internal/analyzer/pythonPathUtils';

import { CommandLineOptions } from 'pyright-internal/common/commandLineOptions';
import { ConfigOptions } from 'pyright-internal/common/configOptions';
import { FullAccessHost } from 'pyright-internal/common/fullAccessHost';
import { Host } from 'pyright-internal/common/host';
import { defaultStubsDirectory } from 'pyright-internal/common/pathConsts';
import {
    forEachAncestorDirectory,
    combinePaths,
    getDirectoryPath,
    normalizePath,
    isDirectory,
    getFileSpec,
} from 'pyright-internal/common/pathUtils';
import { PyrightFileSystem } from 'pyright-internal/pyrightFileSystem';
import { ScipConfig } from './lib';

const configFileNames = ['scip-pyrightconfig.json', 'pyrightconfig.json'];
const pyprojectTomlName = 'pyproject.toml';

export class ScipPyrightConfig {
    fs: PyrightFileSystem;
    _configFilePath: string | undefined;
    _configOptions: ConfigOptions;

    _console: Console = console;
    _typeCheckingMode = 'basic';

    constructor(scipConfig: ScipConfig, fs: PyrightFileSystem) {
        this.fs = fs;

        this._configOptions = new ConfigOptions(scipConfig.projectRoot);
        this._configOptions.checkOnlyOpenFiles = false;
        this._configOptions.indexing = true;
        this._configOptions.useLibraryCodeForTypes = true;
    }

    getConfigOptions(): ConfigOptions {
        const host = new FullAccessHost(this.fs);

        // TODO: This probably should be ScipConfig.workspaceroot or similar?
        const options = new CommandLineOptions(process.cwd(), false);

        let config = this._getConfigOptions(host, options);
        config.checkOnlyOpenFiles = false;
        config.indexing = true;
        config.useLibraryCodeForTypes = true;
        config.typeshedPath = this._configOptions.typeshedPath || getTypeShedFallbackPath(this.fs);

        return config;
    }

    // EVERYTHING BELOW HERE IS COPIED FROM:
    // - packages/pyright-internal/src/analyzer/service.ts
    //
    // These are not exposed and too coupled to the analysis service,
    // it doesn't make sense to try and connect them at this time.
    private _getConfigOptions(host: Host, commandLineOptions: CommandLineOptions): ConfigOptions {
        let projectRoot = commandLineOptions.executionRoot;
        let configFilePath: string | undefined;
        let pyprojectFilePath: string | undefined;

        if (commandLineOptions.configFilePath) {
            // If the config file path was specified, determine whether it's
            // a directory (in which case the default config file name is assumed)
            // or a file.
            configFilePath = combinePaths(
                commandLineOptions.executionRoot,
                normalizePath(commandLineOptions.configFilePath)
            );
            if (!this.fs.existsSync(configFilePath)) {
                this._console.info(`Configuration file not found at ${configFilePath}.`);
                configFilePath = commandLineOptions.executionRoot;
            } else {
                if (configFilePath.toLowerCase().endsWith('.json')) {
                    projectRoot = getDirectoryPath(configFilePath);
                } else {
                    projectRoot = configFilePath;
                    configFilePath = this._findConfigFile(configFilePath);
                    if (!configFilePath) {
                        this._console.info(`Configuration file not found at ${projectRoot}.`);
                    }
                }
            }
        } else if (projectRoot) {
            // In a project-based IDE like VS Code, we should assume that the
            // project root directory contains the config file.
            configFilePath = this._findConfigFile(projectRoot);

            // If pyright is being executed from the command line, the working
            // directory may be deep within a project, and we need to walk up the
            // directory hierarchy to find the project root.
            if (!configFilePath && !commandLineOptions.fromVsCodeExtension) {
                configFilePath = this._findConfigFileHereOrUp(projectRoot);
            }

            if (configFilePath) {
                projectRoot = getDirectoryPath(configFilePath);
            } else {
                this._console.log(`No configuration file found.`);
                configFilePath = undefined;
            }
        }

        if (!configFilePath) {
            // See if we can find a pyproject.toml file in this directory.
            pyprojectFilePath = this._findPyprojectTomlFile(projectRoot);

            if (!pyprojectFilePath && !commandLineOptions.fromVsCodeExtension) {
                pyprojectFilePath = this._findPyprojectTomlFileHereOrUp(projectRoot);
            }

            if (pyprojectFilePath) {
                projectRoot = getDirectoryPath(pyprojectFilePath);
                this._console.log(`pyproject.toml file found at ${projectRoot}.`);
            } else {
                this._console.log(`No pyproject.toml file found.`);
            }
        }

        const configOptions = new ConfigOptions(projectRoot, this._typeCheckingMode);
        const defaultExcludes = ['**/node_modules', '**/__pycache__', '**/.*'];

        if (commandLineOptions.pythonPath) {
            configOptions.pythonPath = commandLineOptions.pythonPath;
        }

        // The pythonPlatform and pythonVersion from the command-line can be overridden
        // by the config file, so initialize them upfront.
        configOptions.defaultPythonPlatform = commandLineOptions.pythonPlatform;
        configOptions.defaultPythonVersion = commandLineOptions.pythonVersion;
        configOptions.ensureDefaultExtraPaths(
            this.fs,
            commandLineOptions.autoSearchPaths || false,
            commandLineOptions.extraPaths
        );

        if (commandLineOptions.fileSpecs.length > 0) {
            commandLineOptions.fileSpecs.forEach((fileSpec) => {
                configOptions.include.push(getFileSpec(this.fs, projectRoot, fileSpec));
            });
        }

        if (commandLineOptions.excludeFileSpecs.length > 0) {
            commandLineOptions.excludeFileSpecs.forEach((fileSpec) => {
                configOptions.exclude.push(getFileSpec(this.fs, projectRoot, fileSpec));
            });
        }

        if (commandLineOptions.ignoreFileSpecs.length > 0) {
            commandLineOptions.ignoreFileSpecs.forEach((fileSpec) => {
                configOptions.ignore.push(getFileSpec(this.fs, projectRoot, fileSpec));
            });
        }

        if (!configFilePath && commandLineOptions.executionRoot) {
            if (commandLineOptions.fileSpecs.length === 0) {
                // If no config file was found and there are no explicit include
                // paths specified, assume the caller wants to include all source
                // files under the execution root path.
                configOptions.include.push(getFileSpec(this.fs, commandLineOptions.executionRoot, '.'));
            }

            if (commandLineOptions.excludeFileSpecs.length === 0) {
                // Add a few common excludes to avoid long scan times.
                defaultExcludes.forEach((exclude) => {
                    configOptions.exclude.push(getFileSpec(this.fs, commandLineOptions.executionRoot, exclude));
                });
            }
        }

        this._configFilePath = configFilePath || pyprojectFilePath;

        // If we found a config file, parse it to compute the effective options.
        let configJsonObj: object | undefined;
        if (configFilePath) {
            this._console.info(`Loading configuration file at ${configFilePath}`);
            configJsonObj = this._parseJsonConfigFile(configFilePath);
        } else if (pyprojectFilePath) {
            this._console.info(`Loading pyproject.toml file at ${pyprojectFilePath}`);
            configJsonObj = this._parsePyprojectTomlFile(pyprojectFilePath);
        }

        if (configJsonObj) {
            configOptions.initializeFromJson(
                configJsonObj,
                this._typeCheckingMode,
                this._console,
                this.fs,
                host,
                commandLineOptions.diagnosticSeverityOverrides,
                commandLineOptions.fileSpecs.length > 0
            );

            const configFileDir = getDirectoryPath(this._configFilePath!);

            // If no include paths were provided, assume that all files within
            // the project should be included.
            if (configOptions.include.length === 0) {
                this._console.info(`No include entries specified; assuming ${configFileDir}`);
                configOptions.include.push(getFileSpec(this.fs, configFileDir, '.'));
            }

            // If there was no explicit set of excludes, add a few common ones to avoid long scan times.
            if (configOptions.exclude.length === 0) {
                defaultExcludes.forEach((exclude) => {
                    this._console.info(`Auto-excluding ${exclude}`);
                    configOptions.exclude.push(getFileSpec(this.fs, configFileDir, exclude));
                });

                if (configOptions.autoExcludeVenv === undefined) {
                    configOptions.autoExcludeVenv = true;
                }
            }
        } else {
            configOptions.autoExcludeVenv = true;
            configOptions.applyDiagnosticOverrides(commandLineOptions.diagnosticSeverityOverrides);
        }

        // Override the analyzeUnannotatedFunctions setting based on the command-line setting.
        if (commandLineOptions.analyzeUnannotatedFunctions !== undefined) {
            configOptions.diagnosticRuleSet.analyzeUnannotatedFunctions =
                commandLineOptions.analyzeUnannotatedFunctions;
        }

        const reportDuplicateSetting = (settingName: string, configValue: number | string | boolean) => {
            const settingSource = commandLineOptions.fromVsCodeExtension
                ? 'the client settings'
                : 'a command-line option';
            this._console.warn(
                `The ${settingName} has been specified in both the config file and ` +
                    `${settingSource}. The value in the config file (${configValue}) ` +
                    `will take precedence`
            );
        };

        // Apply the command-line options if the corresponding
        // item wasn't already set in the config file. Report any
        // duplicates.
        if (commandLineOptions.venvPath) {
            if (!configOptions.venvPath) {
                configOptions.venvPath = commandLineOptions.venvPath;
            } else {
                reportDuplicateSetting('venvPath', configOptions.venvPath);
            }
        }

        if (commandLineOptions.typeshedPath) {
            if (!configOptions.typeshedPath) {
                configOptions.typeshedPath = commandLineOptions.typeshedPath;
            } else {
                reportDuplicateSetting('typeshedPath', configOptions.typeshedPath);
            }
        }

        configOptions.verboseOutput = commandLineOptions.verboseOutput ?? configOptions.verboseOutput;
        configOptions.checkOnlyOpenFiles = !!commandLineOptions.checkOnlyOpenFiles;
        configOptions.autoImportCompletions = !!commandLineOptions.autoImportCompletions;
        configOptions.indexing = !!commandLineOptions.indexing;
        configOptions.taskListTokens = commandLineOptions.taskListTokens;
        configOptions.logTypeEvaluationTime = !!commandLineOptions.logTypeEvaluationTime;
        configOptions.typeEvaluationTimeThreshold = commandLineOptions.typeEvaluationTimeThreshold;

        // If useLibraryCodeForTypes was not specified in the config, allow the settings
        // or command line to override it.
        if (configOptions.useLibraryCodeForTypes === undefined) {
            configOptions.useLibraryCodeForTypes = !!commandLineOptions.useLibraryCodeForTypes;
        } else if (commandLineOptions.useLibraryCodeForTypes !== undefined) {
            reportDuplicateSetting('useLibraryCodeForTypes', configOptions.useLibraryCodeForTypes);
        }

        if (commandLineOptions.stubPath) {
            if (!configOptions.stubPath) {
                configOptions.stubPath = commandLineOptions.stubPath;
            } else {
                reportDuplicateSetting('stubPath', configOptions.stubPath);
            }
        }

        if (configOptions.stubPath) {
            // If there was a stub path specified, validate it.
            if (!this.fs.existsSync(configOptions.stubPath) || !isDirectory(this.fs, configOptions.stubPath)) {
                this._console.warn(`stubPath ${configOptions.stubPath} is not a valid directory.`);
            }
        } else {
            // If no stub path was specified, use a default path.
            configOptions.stubPath = normalizePath(combinePaths(configOptions.projectRoot, defaultStubsDirectory));
        }

        // Do some sanity checks on the specified settings and report missing
        // or inconsistent information.
        if (configOptions.venvPath) {
            if (!this.fs.existsSync(configOptions.venvPath) || !isDirectory(this.fs, configOptions.venvPath)) {
                this._console.error(`venvPath ${configOptions.venvPath} is not a valid directory.`);
            }

            // venvPath without venv means it won't do anything while resolveImport.
            // so first, try to set venv from existing configOption if it is null. if both are null,
            // then, resolveImport won't consider venv
            configOptions.venv = configOptions.venv ?? this._configOptions.venv;
            if (configOptions.venv) {
                const fullVenvPath = combinePaths(configOptions.venvPath, configOptions.venv);

                if (!this.fs.existsSync(fullVenvPath) || !isDirectory(this.fs, fullVenvPath)) {
                    this._console.error(
                        `venv ${configOptions.venv} subdirectory not found in venv path ${configOptions.venvPath}.`
                    );
                } else {
                    const importFailureInfo: string[] = [];
                    if (findPythonSearchPaths(this.fs, configOptions, host, importFailureInfo) === undefined) {
                        this._console.error(
                            `site-packages directory cannot be located for venvPath ` +
                                `${configOptions.venvPath} and venv ${configOptions.venv}.`
                        );

                        if (configOptions.verboseOutput) {
                            importFailureInfo.forEach((diag) => {
                                this._console.error(`  ${diag}`);
                            });
                        }
                    }
                }
            }
        }

        // Is there a reference to a venv? If so, there needs to be a valid venvPath.
        if (configOptions.venv) {
            if (!configOptions.venvPath) {
                this._console.warn(`venvPath not specified, so venv settings will be ignored.`);
            }
        }

        if (configOptions.typeshedPath) {
            if (!this.fs.existsSync(configOptions.typeshedPath) || !isDirectory(this.fs, configOptions.typeshedPath)) {
                this._console.error(`typeshedPath ${configOptions.typeshedPath} is not a valid directory.`);
            }
        }

        return configOptions;
    }

    private _findConfigFile(searchPath: string): string | undefined {
        for (const name of configFileNames) {
            const fileName = combinePaths(searchPath, name);
            if (this.fs.existsSync(fileName)) {
                return fileName;
            }
        }
        return undefined;
    }

    private _findConfigFileHereOrUp(searchPath: string): string | undefined {
        return forEachAncestorDirectory(searchPath, (ancestor) => this._findConfigFile(ancestor));
    }

    private _findPyprojectTomlFile(searchPath: string) {
        const fileName = combinePaths(searchPath, pyprojectTomlName);
        if (this.fs.existsSync(fileName)) {
            return fileName;
        }
        return undefined;
    }

    private _findPyprojectTomlFileHereOrUp(searchPath: string): string | undefined {
        return forEachAncestorDirectory(searchPath, (ancestor) => this._findPyprojectTomlFile(ancestor));
    }

    private _parseJsonConfigFile(configPath: string): object | undefined {
        return this._attemptParseFile(configPath, (fileContents) => {
            const errors: JSONC.ParseError[] = [];
            const result = JSONC.parse(fileContents, errors, { allowTrailingComma: true });
            if (errors.length > 0) {
                throw new Error('Errors parsing JSON file');
            }

            return result;
        });
    }

    private _attemptParseFile(
        filePath: string,
        parseCallback: (contents: string, attempt: number) => object | undefined
    ): object | undefined {
        let fileContents = '';
        let parseAttemptCount = 0;

        while (true) {
            // Attempt to read the file contents.
            try {
                fileContents = this.fs.readFileSync(filePath, 'utf8');
            } catch {
                this._console.error(`Config file "${filePath}" could not be read.`);
                return undefined;
            }

            // Attempt to parse the file.
            let parseFailed = false;
            try {
                return parseCallback(fileContents, parseAttemptCount + 1);
            } catch (e: any) {
                parseFailed = true;
            }

            if (!parseFailed) {
                break;
            }

            // If we attempt to read the file immediately after it was saved, it
            // may have been partially written when we read it, resulting in parse
            // errors. We'll give it a little more time and try again.
            if (parseAttemptCount++ >= 5) {
                this._console.error(`Config file "${filePath}" could not be parsed. Verify that format is correct.`);
                return undefined;
            }
        }

        return undefined;
    }

    private _parsePyprojectTomlFile(pyprojectPath: string): object | undefined {
        return this._attemptParseFile(pyprojectPath, (fileContents, attemptCount) => {
            try {
                // First, try and load tool.scip section
                const configObj = TOML.parse(fileContents);
                if (configObj && configObj.tool && (configObj.tool as TOML.JsonMap).scip) {
                    return (configObj.tool as TOML.JsonMap).scip as object;
                }

                // Fall back to tool.pyright section
                if (configObj && configObj.tool && (configObj.tool as TOML.JsonMap).pyright) {
                    return (configObj.tool as TOML.JsonMap).pyright as object;
                }
            } catch (e: any) {
                this._console.error(`Pyproject file parse attempt ${attemptCount} error: ${JSON.stringify(e)}`);
                throw e;
            }

            this._console.error(`Pyproject file "${pyprojectPath}" is missing "[tool.pyright]" section.`);
            return undefined;
        });
    }
}
