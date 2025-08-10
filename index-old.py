import argparse
import subprocess
from pathlib import Path
import tomllib  # Use tomllib for Python 3.11+, or install toml for older versions


def matches_pattern(package, patterns):
    """Check if a package matches any of the specified patterns."""
    return any(pattern.lower() in package.lower() for pattern in patterns)


def install_package(package_with_constraints):
    """Attempt to install a package with constraints using pip."""
    print(f"Installing package: {package_with_constraints}")
    try:
        subprocess.run(["pip", "install", package_with_constraints], check=True)
    except subprocess.CalledProcessError:
        print(f"Failed to install {package_with_constraints}, continuing...")


def extract_dependencies(data, patterns):
    """Recursively search for dependencies in nested data structures."""
    if isinstance(data, list):
        for item in data:
            # Match package names in a list
            if isinstance(item, str):
                package_name = item.split(" ", 1)[0]
                if matches_pattern(package_name, patterns):
                    yield item
    elif isinstance(data, dict):
        for key, value in data.items():
            # Recurse into dictionaries
            yield from extract_dependencies(value, patterns)


def process_pyproject_file(pyproject_file, patterns):
    """Process a pyproject.toml file and install matching packages."""
    print(f"Processing pyproject.toml: {pyproject_file}")
    with open(pyproject_file, "rb") as file:
        pyproject_data = tomllib.load(file)

    # Extract all dependencies recursively
    for dependency in extract_dependencies(pyproject_data, patterns):
        install_package(dependency)


def process_requirements_file(req_file, patterns):
    """Process a requirements file and install matching packages."""
    print(f"Processing file: {req_file}")
    with open(req_file, "r") as file:
        for line in file:
            package = line.strip()
            # Ignore comments and empty lines
            if not package or package.startswith("#"):
                continue
            # Install only if package matches any of the patterns
            if matches_pattern(package, patterns):
                install_package(package)


def main(index_name, patterns):
    """Main function to process files and run SCIP indexing command."""
    # Process requirements-like files
    for req_file in Path(".").rglob("requirements*.txt"):
        process_requirements_file(req_file, patterns)

    # Process pyproject.toml files
    for pyproject_file in Path(".").rglob("pyproject.toml"):
        process_pyproject_file(pyproject_file, patterns)

    # Run the SCIP indexing command
    print("Running SCIP indexing command...")
    subprocess.run(["node", "/package/index.js", "index", ".", 
                    "--project-version=0.1.0", f"--output={index_name}"], check=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Install specific packages from requirements and pyproject.toml files")
    parser.add_argument("index_name", help="The index name for SCIP indexing command")
    parser.add_argument("patterns", nargs="+", help="Patterns to match package names (e.g., 'flask')")
    args = parser.parse_args()

    # Run main with index name and patterns
    main(args.index_name, args.patterns)
