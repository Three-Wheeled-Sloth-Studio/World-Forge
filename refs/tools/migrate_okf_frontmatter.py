#!/usr/bin/env python3
"""One-time non-destructive migration of this refs corpus to the Agent Academy OKF profile."""

from __future__ import annotations

import json
from pathlib import Path

try:
    import yaml
except ImportError as exc:
    raise SystemExit("PyYAML is required: python -m pip install -r requirements-dev.txt") from exc

ROOT = Path(__file__).resolve().parents[2]
REFS = ROOT / "refs"
SLUG = 'world-forge'
TYPE_MAP = {'README.md': 'Project Memory Guide', 'decisions': 'Decision Record', 'engineering': 'Engineering Reference', 'handoffs': 'Handoff Record', 'planning': 'Planning Reference', 'research': 'Research Reference', 'testing': 'Testing Reference'}
PROJECT_REPLACEMENTS = [('  validation_commands: refs/testing/validationCommands.yaml\n  ci_workflow: .github/workflows/validate.yml\n', '  validation_commands: refs/testing/validationCommands.yaml\n  okf_profile: refs/okfProfile.yaml\n  okf_discovery_index: refs/index.md\n  ci_workflow: .github/workflows/validate.yml\n'), ('    status: selective\n    application: Use project-memory and agent-orientation patterns where they add retrieval or automation value; do not import the blank template wholesale.\n', "    status: active-profile\n    application: Use the Agent Academy OKF-compatible profile for discovery, provenance, and interoperability while preserving World Forge's mature project-specific refs taxonomy and deterministic YAML state.\n")]


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")


def replace_once(path: Path, old: str, new: str) -> None:
    content = read(path)
    if new in content:
        return
    if old not in content:
        raise SystemExit(f"Expected migration anchor not found in {path.relative_to(ROOT)}")
    write(path, content.replace(old, new, 1))


def append_once(path: Path, marker: str, block: str) -> None:
    content = read(path)
    if marker in content:
        return
    if not content.endswith("\n"):
        content += "\n"
    write(path, content + block)


def first_heading(content: str) -> str:
    body = content
    if content.startswith("---\n"):
        end = content.find("\n---\n", 4)
        if end >= 0:
            body = content[end + 5:]
    for line in body.splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return "Project Memory Reference"


def concept_type(path: Path) -> str:
    relative = path.relative_to(REFS)
    if len(relative.parts) == 1:
        return TYPE_MAP.get(relative.name, "Project Memory Reference")
    return TYPE_MAP.get(relative.parts[0], "Project Memory Reference")


def tag_for(path: Path) -> str:
    relative = path.relative_to(REFS)
    return relative.parts[0] if len(relative.parts) > 1 else "project-memory"


def migrate_markdown() -> int:
    changed = 0
    for path in sorted(REFS.rglob("*.md")):
        if path.name in {"index.md", "log.md"} or "__pycache__" in path.parts:
            continue
        content = read(path)
        ctype = concept_type(path)
        if content.startswith("---\n"):
            end = content.find("\n---\n", 4)
            if end < 0:
                raise SystemExit(f"Unclosed frontmatter in {path.relative_to(ROOT)}")
            raw = content[4:end]
            data = yaml.load(raw, Loader=yaml.BaseLoader) or {}
            if not isinstance(data, dict):
                raise SystemExit(f"Frontmatter must be a mapping in {path.relative_to(ROOT)}")
            if data.get("type"):
                continue
            insertion = f"type: {json.dumps(ctype)}\n"
            write(path, "---\n" + insertion + content[4:])
            changed += 1
            continue

        title = first_heading(content)
        frontmatter = (
            "---\n"
            f"type: {json.dumps(ctype)}\n"
            f"title: {json.dumps(title)}\n"
            "tags:\n"
            f"- {SLUG}\n"
            f"- {tag_for(path)}\n"
            "---\n"
        )
        write(path, frontmatter + content)
        changed += 1
    return changed


def update_gitignore() -> None:
    path = ROOT / ".gitignore"
    content = read(path)
    additions = []
    if "__pycache__/" not in content:
        additions.append("__pycache__/")
    if "*.py[cod]" not in content:
        additions.append("*.py[cod]")
    if additions:
        if not content.endswith("\n"):
            content += "\n"
        write(path, content + "\n".join(additions) + "\n")


def update_package() -> None:
    path = ROOT / "package.json"
    data = json.loads(read(path))
    scripts = data.setdefault("scripts", {})
    scripts["validate:okf"] = "python refs/tools/validate_okf.py"
    if 'world' == "world":
        scripts["validate"] = (
            "npm run validate:okf && npm run typecheck && npm test && "
            "npm run test:production-page-harness && npm run test:production-rerank"
        )
    else:
        scripts["validate:refs"] = "python refs/tools/validate_refs.py && npm run validate:okf"
    write(path, json.dumps(data, indent=2) + "\n")


def update_project_memory() -> None:
    project = REFS / "project.yaml"
    replace_once(project, "updated: 2026-08-07\n", "updated: 2026-09-03\n")
    for old, new in PROJECT_REPLACEMENTS:
        replace_once(project, old, new)

    validation = REFS / "testing" / "validationCommands.yaml"
    replace_once(validation, "updated: 2026-09-02\n", "updated: 2026-09-03\n")
    replace_once(validation, '  - id: case-collisions\n    command: npm run check:case-collisions\n    purpose: Fail on tracked paths that collide after case-folding.\n    use_when: Any file is added, renamed, moved, or an import path changes; also runs automatically before typecheck and build.\n', '  - id: case-collisions\n    command: npm run check:case-collisions\n    purpose: Fail on tracked paths that collide after case-folding.\n    use_when: Any file is added, renamed, moved, or an import path changes; also runs automatically before typecheck and build.\n  - id: okf-profile\n    command: npm run validate:okf\n    purpose: Validate OKF v0.2 concept frontmatter, the pinned Agent Academy profile, and deterministic discovery indexes.\n    use_when: Any refs Markdown, OKF profile, index generator, or studio-knowledge interoperability surface changes; ordinary repository validation runs it automatically.\n')
    replace_once(validation, '  - Ordinary dev/release validation is one job: npm ci, npm run verify, and the production page-harness smoke.', '  - Ordinary dev/release validation is one job: refs dependencies, npm ci, npm run verify, and the production page-harness smoke. npm run verify includes the OKF profile check.')

    append_once(
        REFS / "README.md",
        "## OKF-compatible discovery",
        '\n## OKF-compatible discovery\n\nWorld Forge exposes this mature project-memory corpus through the Agent Academy OKF-compatible profile without replacing its established taxonomy or deterministic YAML state.\n\n- Start generic OKF traversal at `refs/index.md`.\n- Profile semantics and the pinned OKF baseline are in `refs/okfProfile.yaml`.\n- Markdown knowledge files are OKF concepts; YAML files remain authoritative structured resources where exact state matters.\n- Generated `index.md` files are committed for zero-setup discovery. Regenerate with `python refs/tools/generate_okf_indexes.py` and validate with `npm run validate:okf`.\n- OKF `verified` is a factual trust claim. Passing repository tests or refs validation does not create that claim.\n',
    )
    append_once(
        REFS / "handoffs" / "currentHandoff.md",
        "## Agent Academy OKF compatibility",
        '\n## Agent Academy OKF compatibility\n\nOn 2026-09-03, World Forge adopted the Agent Academy `agent-academy-okf-v1` compatibility profile pinned to OKF v0.2 and Agent Academy commit `16691651776151a7eb1ebf13d99a92658e0684e6`.\n\nThis is an interoperability and discovery increment only. The existing World Forge `refs/` taxonomy, project-specific reading order, deterministic YAML state, scientific validation contracts, and exact-SHA promotion model remain authoritative. Markdown knowledge is exposed as OKF concepts and deterministic committed indexes provide generic traversal for future studio-wide cataloging.\n',
    )

    agents = ROOT / "AGENTS.md"
    replace_once(agents, 'Start project-memory work at `refs/README.md`. See `refs/engineering/studio-principles-application.md` for the current application/deferment record.\n', 'Start project-memory work at `refs/README.md`. See `refs/engineering/studio-principles-application.md` for the current application/deferment record.\nGeneric OKF-compatible discovery begins at `refs/index.md`; `refs/okfProfile.yaml` defines the interoperability boundary without replacing the project-specific reading order.\n')
    replace_once(REFS / 'engineering' / 'studio-principles-application.md', "### Full Agent Academy schema/template validation\n\nNot adopted now. World Forge predates the template and has a large established `refs/` taxonomy. Importing `templatePolicy.yaml`, the full schema registry, blank integration files, and template validator would add maintenance surface without a current consumer.\n\nRevisit if cross-project tooling begins reading standardized refs metadata programmatically.\n", "### Full Agent Academy schema/template validation\n\nThe blank Agent Academy schema/template remains intentionally not adopted. World Forge predates that template and has a large established `refs/` taxonomy; importing `templatePolicy.yaml`, the full schema registry, and blank template resources would still create duplicate maintenance surface.\n\nThe OKF-compatible Agent Academy profile is now adopted because cross-project discovery is a real consumer. `refs/okfProfile.yaml`, OKF Markdown frontmatter, deterministic committed indexes, and the focused OKF validator provide interoperability without replacing World Forge's taxonomy or deterministic YAML contracts.\n")


def update_workflow() -> None:
    replace_once(ROOT / '.github/workflows/validate.yml', "      - name: Checkout\n        uses: actions/checkout@v6\n\n      - name: Set up Node\n", "      - name: Checkout\n        uses: actions/checkout@v6\n\n      - name: Set up Python\n        uses: actions/setup-python@v6\n        with:\n          python-version: '3.11'\n\n      - name: Install refs dependencies\n        run: python -m pip install -r requirements-dev.txt\n\n      - name: Set up Node\n")


def main() -> int:
    changed = migrate_markdown()
    update_gitignore()
    update_package()
    update_project_memory()
    update_workflow()
    print(f"Added or completed OKF frontmatter on {changed} Markdown concepts.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
