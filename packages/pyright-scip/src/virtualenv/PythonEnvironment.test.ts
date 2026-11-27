import PythonEnvironment from './PythonEnvironment';
import PythonPackage from './PythonPackage';

test('resolves module paths with Windows and POSIX separators', () => {
    const packageInfo = new PythonPackage('example', '1.0.0', ['example\\windows.py', 'example/posix.py']);
    const environment = new PythonEnvironment(new Set(packageInfo.files), '1.0.0', [packageInfo]);

    expect(environment.getPackageForModule('example.windows')).toBe(packageInfo);
    expect(environment.getPackageForModule('example.posix')).toBe(packageInfo);
});
