import argparse
import subprocess
import os
import venv
from pathlib import Path
import tomllib  # Use tomllib for Python 3.11+, or install toml for older versions


def matches_pattern(package, patterns):
    """Check if a package matches any of the specified patterns."""
    return any(pattern.lower() in package.lower() for pattern in patterns)



def setup_virtual_environment(project_path):
    """Create a virtual environment in the specified directory."""
    venv_path = project_path / '.venv'
    print(f"Creating virtual environment at: {venv_path}")
    venv.create(venv_path, with_pip=True)
    # subprocess.run([sys.executable, '-m', 'venv', str(venv_path)], check=True)
    return venv_path

def activate_virtual_environment(venv_path):
    """Activate the virtual environment by adjusting the environment variables."""
    venv_bin = venv_path / 'bin'
    os.environ['VIRTUAL_ENV'] = str(venv_path)
    os.environ['PATH'] = f"{venv_bin}:{os.environ['PATH']}"
    print(f"Virtual environment activated: {os.environ['VIRTUAL_ENV']}")
    print(f"Updated PATH: {os.environ['PATH']}")
    return venv_bin / 'python'

def install_package(package_with_constraints, venv_python):
    """Attempt to install a package with constraints using pip within the virtual environment."""
    print(f"Installing package: {package_with_constraints}")
    try:
        result = subprocess.run(
            [venv_python, "-m", "pip", "install", package_with_constraints],
            check=True,
            capture_output=True,
            text=True,
        )
        print(result.stdout)
        print(result.stderr)
    except subprocess.CalledProcessError as e:
        print(f"Failed to install {package_with_constraints}. Error: {e.stderr}")


def extract_dependencies(data, patterns):
    """Recursively search for dependencies in nested data structures."""
    if isinstance(data, list):
        for item in data:
            # Match package names in a list
            if isinstance(item, str):
                if matches_pattern(item, patterns):
                    yield item
    elif isinstance(data, dict):
        for key, value in data.items():
            yield from extract_dependencies(key, patterns)
            # Recurse into dictionaries
            yield from extract_dependencies(value, patterns)
    elif isinstance(data, str):
        if matches_pattern(data, patterns):
            yield data


def process_pyproject_file(pyproject_file, patterns, venv_python):
    """Process a pyproject.toml file and install matching packages."""
    print(f"Processing pyproject.toml: {pyproject_file}")
    with open(pyproject_file, "rb") as file:
        pyproject_data = tomllib.load(file)

    # Extract all dependencies recursively
    for dependency in extract_dependencies(pyproject_data, patterns):
        install_package(dependency, venv_python)
        
        
def _iter_requirements_lines(req_file: Path, visited: set[Path]):
    """
    Yield requirement lines from req_file, recursively following -r/--requirement.
    Removes comments and blank lines. Uses a visited set to avoid cycles.
    """
    req_file = req_file.resolve()
    if req_file in visited:
        return
    visited.add(req_file)

    print(f"Processing file: {req_file}")
    try:
        with open(req_file, "r", encoding="utf-8") as f:
            for raw in f:
                # Remove inline comments, but leave URLs with # in them alone by splitting once.
                line = raw.strip()
                if not line or line.startswith("#"):
                    continue
                # If there's a comment, strip everything after the first unescaped '#'
                # Simple heuristic: split at first '#' if present and not part of a URL fragment
                if "#" in line and not line.lower().startswith(("http://", "https://")):
                    line = line.split("#", 1)[0].strip()
                    if not line:
                        continue

                # Handle -r / --requirement includes
                if line.startswith("-r ") or line.startswith("--requirement "):
                    parts = line.split(maxsplit=1)
                    if len(parts) == 2:
                        include_path = parts[1].strip().strip("'\"")
                        include_file = (req_file.parent / include_path).resolve()
                        if include_file.exists():
                            yield from _iter_requirements_lines(include_file, visited)
                        else:
                            print(f"Included file not found: {include_file}")
                    continue

                # (Optional) Ignore constraint includes (-c/--constraint) since they are not packages
                if line.startswith("-c ") or line.startswith("--constraint "):
                    # You could parse and apply constraints if needed, but we skip here.
                    continue

                # All other lines are requirement specs; yield as-is
                yield line
    except FileNotFoundError:
        print(f"⚠️ Requirements file not found: {req_file}")



def process_requirements_file(req_file: Path, patterns, venv_python):
    """
    Process a requirements file, following -r includes recursively.
    Only install specs that match any of the provided patterns.
    """
    visited: set[Path] = set()
    for spec in _iter_requirements_lines(req_file, visited):
        if matches_pattern(spec, patterns):
            install_package(spec, venv_python)
                
    
def process_project(path, patterns):
    """Process the project: set up venv, install packages, and run Node.js script."""
    project_path = Path(path).resolve()
    venv_path = setup_virtual_environment(project_path)
    venv_python = activate_virtual_environment(venv_path)

    # Copy the current environment and update it for the virtual environment
    env = os.environ.copy()

    try:
        # Install a test package or requirement to verify pip functionality
        print("Verifying pip functionality in the virtual environment...")
        subprocess.run(
            [venv_python, "-m", "pip", "--version"],
            check=True,
            capture_output=True,
            env=env,
        )
        
        # Process requirements-like files
        for req_file in Path(path).rglob("requirements*.txt"):
            process_requirements_file(req_file, patterns, venv_python)

        # Process pyproject.toml files
        for pyproject_file in Path(path).rglob("pyproject.toml"):
            process_pyproject_file(pyproject_file, patterns, venv_python)

        # Run the indexer
        print("Running SCIP indexing command...")
        result = subprocess.run(
            ["node", "/package/index.js", "index", ".", "--project-version=0.1.0", "--output=python.scip"],
            cwd=path,
            env=env,
            check=True,
            capture_output=True,
            text=True,
        )
        print("Indexer output:")
        print(result.stdout)
        print(result.stderr)
    except subprocess.CalledProcessError as e:
        print(f"Command '{e.cmd}' failed with exit code {e.returncode}. Error output:\n{e.stderr}\nStandard output:\n{e.stdout}")
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        print("Deactivating virtual environment.")
        os.environ.pop('VIRTUAL_ENV', None)
        os.environ['PATH'] = os.environ['PATH'].split(":", 1)[1]


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Install specific packages from requirements and pyproject.toml files")
    parser.add_argument("path", help="Relative path to project")
    parser.add_argument("patterns", nargs="+", help="Patterns to match package names (e.g., 'flask')")
    args = parser.parse_args()

    # Run main with index name and patterns
    process_project(args.path, args.patterns)
