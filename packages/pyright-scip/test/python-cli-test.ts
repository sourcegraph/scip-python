import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import assert from 'assert';
import { execSync } from 'child_process';
import { gatherPackageData } from '../src/virtualenv/environment';

interface FileSpec {
    relativePath: string;
    content: string;
}

/**
 * Utility function to create files in a declarative way
 */
function writeFS(rootPath: string, files: FileSpec[]): void {
    for (const file of files) {
        const fullPath = path.join(rootPath, file.relativePath);
        const dir = path.dirname(fullPath);

        // Create directory if it doesn't exist
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(fullPath, file.content);
    }
}

export function pythonCLITests(): void {
    console.log('Running Python CLI tests...');

    // Override console.warn to suppress warnings during tests
    const originalWarn = console.warn;
    console.warn = () => {};

    let packageTempDir: string | undefined;
    let venvRootDir: string | undefined;

    try {
        // Create temporary directory for fake Python package
        packageTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scip-python-test-pkg-'));

        // Create fake package structure using writeFS
        const packageName = 'test-scip-package';
        const packageFiles: FileSpec[] = [
            {
                relativePath: 'setup.py',
                content: `
from setuptools import setup, find_packages

setup(
    name="${packageName}",
    version="1.0.0",
    packages=find_packages(),
    python_requires=">=3.6",
)
`,
            },
            {
                relativePath: `${packageName}/__init__.py`,
                content: '# Test package\n',
            },
            {
                relativePath: `${packageName}/module.py`,
                content: 'def test_function():\n    pass\n',
            },
        ];

        writeFS(packageTempDir, packageFiles);

        venvRootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scip-python-test-venv-'));

        // Set up virtual environment
        // We modify PATH to simulate activating the venv. The venv's bin/ (or Scripts/ on Windows)
        // directory contains Python and pip executables that are configured to use the venv context:
        // - venv/bin/python: has sys.path configured to include venv's site-packages first
        // - venv/bin/pip: script that uses venv's Python, so it sees venv + system packages
        // By prepending venvBinDir to PATH, any Python/pip calls will use these venv-aware versions
        // instead of system ones, ensuring gatherPackageData can discover our installed fake package.
        const venvDir = path.join(venvRootDir, 'venv');
        execSync(`python3 -m venv "${venvDir}"`, { stdio: 'pipe' });
        const venvBinDir = path.join(venvDir, process.platform === 'win32' ? 'Scripts' : 'bin');
        const pipPath = path.join(venvBinDir, 'pip');
        // Install the fake package in the virtual environment
        execSync(`"${pipPath}" install -e "${packageTempDir}"`, { stdio: 'pipe' });
        // Simulate `source venv/bin/activate` by modifying PATH so that it propagates
        // down to calls inside gatherPackageData.
        const originalPath = process.env.PATH;
        process.env.PATH = `${venvBinDir}${path.delimiter}${originalPath}`;

        try {
            // Test gatherPackageData with mix of existing and nonexistent packages
            const packages = gatherPackageData([packageName, 'pip', 'nonexistent-package-12345']);

            assert.ok(packages.length > 0, 'Expected to find at least one package');

            // Check that we found the existing packages but not the nonexistent one
            const packageNames = packages.map((p) => p.name);

            assert.ok(
                packageNames.includes(packageName),
                `Expected to find fake package '${packageName}', got: ${packageNames.join(', ')}`
            );

            assert.ok(packageNames.includes('pip'), `Expected to find 'pip' package, got: ${packageNames.join(', ')}`);

            assert.ok(
                !packageNames.includes('nonexistent-package-12345'),
                'Should not include nonexistent package in results'
            );

            // Find our fake package specifically
            const fakePackage = packages.find((p) => p.name === packageName);
            assert.ok(fakePackage, `Could not find fake package '${packageName}' in results`);

            // Verify that our fake package contains the files we created
            const expectedFiles = ['__init__.py', 'module.py'];
            for (const expectedFile of expectedFiles) {
                const foundFile = fakePackage.files.some((file) => file.endsWith(expectedFile));
                assert.ok(
                    foundFile,
                    `Expected to find '${expectedFile}' in fake package files: ${fakePackage.files.join(', ')}`
                );
            }

            // Verify structure of returned packages
            for (const pkg of packages) {
                assert.ok(pkg.name && pkg.version, `Package missing name or version: ${JSON.stringify(pkg)}`);
                assert.ok(Array.isArray(pkg.files), `Package files should be an array: ${JSON.stringify(pkg)}`);

                // Verify all files are .py or .pyi
                for (const file of pkg.files) {
                    assert.ok(
                        file.endsWith('.py') || file.endsWith('.pyi'),
                        `Unexpected file extension in ${pkg.name}: ${file}`
                    );

                    // Verify no __pycache__ files
                    assert.ok(!file.includes('__pycache__'), `Should not include __pycache__ files: ${file}`);
                }
            }

            console.log(`✓ Package discovery test passed`);
        } finally {
            // Restore original PATH
            if (originalPath) {
                process.env.PATH = originalPath;
            }
        }
    } catch (error) {
        console.error(`✗ Python CLI test failed: ${error}`);
        throw error;
    } finally {
        // Restore console.warn
        console.warn = originalWarn;

        // Clean up temporary directories
        if (packageTempDir && fs.existsSync(packageTempDir)) {
            fs.rmSync(packageTempDir, { recursive: true, force: true });
        }
        if (venvRootDir && fs.existsSync(venvRootDir)) {
            fs.rmSync(venvRootDir, { recursive: true, force: true });
        }
    }

    console.log('Python CLI tests passed!');
}
