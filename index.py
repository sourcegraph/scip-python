import argparse
import subprocess
import os
import shutil
import venv
from pathlib import Path
import tomllib  # Use tomllib for Python 3.11+, or install toml for older versions
import ast
import configparser


def matches_pattern(package, patterns):
    """Check if a package matches any of the specified patterns."""
    return any(pattern.lower() in package.lower() for pattern in patterns)


def setup_virtual_environment(project_path):
    """Create a virtual environment in the specified directory."""
    venv_path = project_path / '.venv'
    if os.path.exists(venv_path):
        print(".venv directory already exists. Deleting it...")
        shutil.rmtree(venv_path)
    print(f"Creating virtual environment at: {venv_path}")
    venv.create(venv_path, with_pip=True)
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
            if isinstance(item, str):
                if matches_pattern(item, patterns):
                    yield item
    elif isinstance(data, dict):
        for key, value in data.items():
            yield from extract_dependencies(key, patterns)
            yield from extract_dependencies(value, patterns)
    elif isinstance(data, str):
        if matches_pattern(data, patterns):
            yield data


def process_pyproject_file(pyproject_file, patterns, venv_python):
    """Process a pyproject.toml file and install matching packages."""
    print(f"Processing pyproject.toml: {pyproject_file}")
    with open(pyproject_file, "rb") as file:
        pyproject_data = tomllib.load(file)

    for dependency in extract_dependencies(pyproject_data, patterns):
        install_package(dependency, venv_python)


def _iter_requirements_lines(req_file: Path, visited: set[Path]):
    req_file = req_file.resolve()
    if req_file in visited:
        return
    visited.add(req_file)

    print(f"Processing file: {req_file}")

    try:
        # Try UTF-8 first, fallback to latin-1 to avoid crash
        try:
            data = req_file.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            print(f"⚠️ {req_file} is not UTF-8. Falling back to latin-1.")
            data = req_file.read_text(encoding="latin-1")

        for raw in data.splitlines():
            line = raw.strip()
            if not line or line.startswith("#"):
                continue

            # Remove inline comments unless it's part of a URL
            if "#" in line and not line.lower().startswith(("http://", "https://")):
                line = line.split("#", 1)[0].strip()
                if not line:
                    continue

            # -r / --requirement include
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

            # Skip constraints
            if line.startswith("-c ") or line.startswith("--constraint "):
                continue

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


def process_setup_cfg_file(setup_cfg_file: Path, patterns, venv_python):
    """
    Process a setup.cfg file:
    - Reads [options]/install_requires
    - Treats each entry like requirements.txt
    """
    print(f"Processing setup.cfg: {setup_cfg_file}")
    config = configparser.ConfigParser()

    try:
        with setup_cfg_file.open("r", encoding="utf-8") as f:
            config.read_file(f)
    except UnicodeDecodeError:
        print(f"⚠️ {setup_cfg_file} is not UTF-8. Falling back to latin-1.")
        with setup_cfg_file.open("r", encoding="latin-1") as f:
            config.read_file(f)

    if not config.has_section("options") or not config.has_option("options", "install_requires"):
        print(f"No [options]/install_requires found in {setup_cfg_file}")
        return

    raw_value = config.get("options", "install_requires")
    specs: list[str] = []

    for raw in raw_value.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue

        if "#" in line and not line.lower().startswith(("http://", "https://")):
            line = line.split("#", 1)[0].strip()
            if not line:
                continue

        specs.append(line)

    if not specs:
        print(f"No usable install_requires entries in {setup_cfg_file}")
        return

    for spec in specs:
        if matches_pattern(spec, patterns):
            install_package(spec, venv_python)


def _extract_install_requires_from_setup_py(setup_py_file: Path) -> list[str]:
    """
    Heuristically parse setup.py and extract literal install_requires lists.

    Only handles simple cases where install_requires is a list/tuple of string
    literals passed directly to setup(...).
    """
    print(f"Processing setup.py for install_requires: {setup_py_file}")

    try:
        try:
            text = setup_py_file.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            print(f"⚠️ {setup_py_file} is not UTF-8. Falling back to latin-1.")
            text = setup_py_file.read_text(encoding="latin-1")
    except FileNotFoundError:
        print(f"⚠️ setup.py not found: {setup_py_file}")
        return []

    try:
        tree = ast.parse(text, filename=str(setup_py_file))
    except SyntaxError as e:
        print(f"⚠️ Could not parse {setup_py_file}: {e}")
        return []

    specs: list[str] = []

    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            func = node.func
            func_name = None
            if isinstance(func, ast.Name):
                func_name = func.id
            elif isinstance(func, ast.Attribute):
                func_name = func.attr

            if func_name != "setup":
                continue

            for kw in node.keywords:
                if kw.arg != "install_requires":
                    continue

                value = kw.value
                if isinstance(value, (ast.List, ast.Tuple)):
                    for elt in value.elts:
                        if isinstance(elt, ast.Constant) and isinstance(elt.value, str):
                            specs.append(elt.value)
                        elif isinstance(elt, ast.Str):  # older Python
                            specs.append(elt.s)

    return specs


def process_setup_py_file(setup_py_file: Path, patterns, venv_python):
    """Process a setup.py file and install matching install_requires."""
    specs = _extract_install_requires_from_setup_py(setup_py_file)
    if not specs:
        print(f"No literal install_requires found in {setup_py_file}")
        return

    for spec in specs:
        if matches_pattern(spec, patterns):
            install_package(spec, venv_python)


def _nearest_ancestor(path: Path, ancestors: list[Path]) -> Path | None:
    """
    Given a file path and a list of ancestor dirs ordered from closest->farthest,
    return the closest ancestor that contains the file.
    """
    for anc in ancestors:
        try:
            path.relative_to(anc)
            return anc
        except ValueError:
            continue
    return None


def collect_dependency_files(project_path: Path):
    """
    Collect all dependency files (requirements*.txt, pyproject.toml,
    setup.cfg with install_requires, setup.py with install_requires)
    from project_path up to the topmost 'repo' directory (or filesystem root).

    Returns:
      ancestors: [closest -> farthest]
      dep_map: {ancestor_dir: {"requirements": [...],
                               "pyproject": [...],
                               "setup_cfg": [...],
                               "setup_py": [...]} }
    """
    project_path = project_path.resolve()

    # Build ancestor chain: closest (project_path) -> farthest
    ancestors: list[Path] = []
    current = project_path
    while True:
        ancestors.append(current)
        if current.name == "repo" and current.parent.name != "repo":
            break
        if current.parent == current:
            break
        current = current.parent

    print("Ancestor chain (closest -> farthest):")
    for a in ancestors:
        print(f"  {a}")

    search_root = ancestors[-1]  # farthest ancestor
    print(f"Searching for dependency files under: {search_root}")

    # Initialize mapping
    dep_map: dict[Path, dict[str, list[Path]]] = {
        anc: {"requirements": [], "pyproject": [], "setup_cfg": [], "setup_py": []}
        for anc in ancestors
    }

    # Discover all candidate dependency files under search_root
    for req_file in search_root.rglob("requirements*.txt"):
        owner = _nearest_ancestor(req_file, ancestors)
        if owner:
            dep_map[owner]["requirements"].append(req_file)

    for py_file in search_root.rglob("pyproject.toml"):
        owner = _nearest_ancestor(py_file, ancestors)
        if owner:
            dep_map[owner]["pyproject"].append(py_file)

    for cfg_file in search_root.rglob("setup.cfg"):
        owner = _nearest_ancestor(cfg_file, ancestors)
        if owner:
            dep_map[owner]["setup_cfg"].append(cfg_file)

    for setup_py in search_root.rglob("setup.py"):
        owner = _nearest_ancestor(setup_py, ancestors)
        if owner:
            dep_map[owner]["setup_py"].append(setup_py)

    return ancestors, dep_map


def process_project(path, patterns):
    """Process the project: set up venv, install packages, and run Node.js script."""
    project_path = Path(path).resolve()
    venv_path = setup_virtual_environment(project_path)
    venv_python = activate_virtual_environment(venv_path)

    env = os.environ.copy()

    try:
        # Verify pip in venv
        print("Verifying pip functionality in the virtual environment...")
        subprocess.run(
            [venv_python, "-m", "pip", "--version"],
            check=True,
            capture_output=True,
            env=env,
        )

        # Collect dependency files, ranked by closeness
        ancestors, dep_map = collect_dependency_files(project_path)

        # Install from farthest ancestor -> closest
        print("\nInstalling dependencies (outer -> inner)...")
        for root in reversed(ancestors):
            files = dep_map[root]
            if not any(files.values()):
                continue

            print(f"\n=== Processing dependency files owned by {root} ===")

            # requirements*.txt
            for req_file in files["requirements"]:
                print(f"- requirements file: {req_file}")
                process_requirements_file(req_file, patterns, venv_python)

            # pyproject.toml
            for pyproject_file in files["pyproject"]:
                print(f"- pyproject.toml: {pyproject_file}")
                process_pyproject_file(pyproject_file, patterns, venv_python)

            # setup.cfg (only effective if it has install_requires)
            for setup_cfg_file in files["setup_cfg"]:
                print(f"- setup.cfg: {setup_cfg_file}")
                process_setup_cfg_file(setup_cfg_file, patterns, venv_python)

            # setup.py (only effective if it has install_requires)
            for setup_py_file in files["setup_py"]:
                print(f"- setup.py: {setup_py_file}")
                process_setup_py_file(setup_py_file, patterns, venv_python)

        # Run the indexer in the *original* project path
        print("\nRunning SCIP indexing command...")
        result = subprocess.run(
            ["node", "/package/index.js", "index", ".", "--project-version=0.1.0", "--output=python.scip"],
            cwd=project_path,
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

    process_project(args.path, args.patterns)
