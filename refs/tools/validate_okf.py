#!/usr/bin/env python3
"""Validate the Agent Academy OKF profile without replacing repository-specific refs validation."""

from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError as exc:
    raise SystemExit("PyYAML is required: python -m pip install -r requirements-dev.txt") from exc

try:
    from generate_okf_indexes import expected_indexes
except ImportError as exc:
    raise SystemExit("refs/tools/generate_okf_indexes.py is required") from exc

ROOT = Path(__file__).resolve().parents[2]
REFS = ROOT / "refs"
PROFILE = REFS / "okfProfile.yaml"
RESERVED = {"index.md", "log.md"}
OKF_STATUSES = {"draft", "stable", "deprecated"}
TIMESTAMP_RE = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$"
)


def text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def add_error(errors: list[str], path: Path | str, message: str) -> None:
    label = path if isinstance(path, str) else rel(path)
    errors.append(f"{label}: {message}")


def parse_frontmatter(path: Path, errors: list[str]) -> dict[str, Any] | None:
    contents = text(path)
    if not contents.startswith("---\n"):
        add_error(errors, path, "OKF concept is missing YAML frontmatter")
        return None
    end = contents.find("\n---\n", 4)
    if end < 0:
        add_error(errors, path, "OKF frontmatter is not closed")
        return None
    raw = contents[4:end]
    try:
        data = yaml.load(raw, Loader=yaml.BaseLoader) or {}
    except yaml.YAMLError as exc:
        add_error(errors, path, f"invalid OKF frontmatter: {exc}")
        return None
    if not isinstance(data, dict):
        add_error(errors, path, "OKF frontmatter must be a mapping")
        return None
    return data


def validate_timestamp(value: Any, path: Path, field: str, errors: list[str]) -> None:
    if not isinstance(value, str) or not TIMESTAMP_RE.match(value):
        add_error(
            errors,
            path,
            f"`{field}` must be an ISO 8601 datetime with an explicit UTC offset",
        )


def as_records(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    if isinstance(value, dict):
        return [value]
    return []


def validate_metadata(path: Path, data: dict[str, Any], errors: list[str]) -> None:
    concept_type = data.get("type")
    if not isinstance(concept_type, str) or not concept_type.strip():
        add_error(errors, path, "frontmatter must contain a non-empty `type`")

    status = data.get("status")
    if status is not None and status not in OKF_STATUSES:
        add_error(errors, path, f"OKF status `{status}` is not supported")

    generated = data.get("generated")
    if generated is not None:
        if not isinstance(generated, dict) or not generated.get("by"):
            add_error(errors, path, "`generated` must contain non-empty `by`")
        elif generated.get("at") is not None:
            validate_timestamp(generated.get("at"), path, "generated.at", errors)

    verified = data.get("verified")
    if verified is not None:
        records = as_records(verified)
        if not records:
            add_error(errors, path, "`verified` must be a mapping or list of mappings")
        for index, record in enumerate(records):
            if not isinstance(record, dict) or not record.get("by") or not record.get("at"):
                add_error(
                    errors,
                    path,
                    f"`verified[{index}]` must contain `by` and `at`",
                )
                continue
            validate_timestamp(record.get("at"), path, f"verified[{index}].at", errors)

    stale_after = data.get("stale_after")
    if stale_after is not None:
        validate_timestamp(stale_after, path, "stale_after", errors)

    sources = data.get("sources")
    if sources is not None:
        if not isinstance(sources, list):
            add_error(errors, path, "`sources` must be a list")
        else:
            for index, source in enumerate(sources):
                if not isinstance(source, dict) or not source.get("resource"):
                    add_error(
                        errors,
                        path,
                        f"`sources[{index}]` must contain `resource`",
                    )
                    continue
                if source.get("last_modified") is not None:
                    validate_timestamp(
                        source.get("last_modified"),
                        path,
                        f"sources[{index}].last_modified",
                        errors,
                    )
                usage_window = source.get("usage_window")
                if isinstance(usage_window, dict):
                    for key in ("from", "to"):
                        if usage_window.get(key) is not None:
                            validate_timestamp(
                                usage_window.get(key),
                                path,
                                f"sources[{index}].usage_window.{key}",
                                errors,
                            )


def validate_profile(errors: list[str]) -> dict[str, Any] | None:
    if not PROFILE.is_file():
        add_error(errors, PROFILE, "OKF profile is missing")
        return None
    try:
        profile = yaml.safe_load(text(PROFILE)) or {}
    except yaml.YAMLError as exc:
        add_error(errors, PROFILE, f"invalid YAML: {exc}")
        return None
    if not isinstance(profile, dict):
        add_error(errors, PROFILE, "OKF profile must be a mapping")
        return None

    okf = profile.get("okf")
    bundle = profile.get("bundle")
    if not isinstance(okf, dict) or not okf.get("version"):
        add_error(errors, PROFILE, "missing `okf.version`")
    if not isinstance(bundle, dict) or bundle.get("root") != "refs":
        add_error(errors, PROFILE, "`bundle.root` must be `refs`")

    baseline = okf.get("baseline_commit") if isinstance(okf, dict) else None
    if not isinstance(baseline, str) or not re.fullmatch(r"[0-9a-f]{40}", baseline):
        add_error(errors, PROFILE, "`okf.baseline_commit` must be a full commit SHA")

    source = (
        profile.get("agent_academy", {})
        .get("profile_source", {})
        if isinstance(profile.get("agent_academy"), dict)
        else {}
    )
    source_commit = source.get("commit") if isinstance(source, dict) else None
    if not isinstance(source_commit, str) or not re.fullmatch(r"[0-9a-f]{40}", source_commit):
        add_error(
            errors,
            PROFILE,
            "`agent_academy.profile_source.commit` must be a full commit SHA",
        )
    return profile


def validate_concepts(errors: list[str]) -> None:
    for path in REFS.rglob("*.md"):
        if "__pycache__" in path.parts or path.name in RESERVED:
            continue
        data = parse_frontmatter(path, errors)
        if data is not None:
            validate_metadata(path, data, errors)


def validate_indexes(profile: dict[str, Any] | None, errors: list[str]) -> None:
    root_index = REFS / "index.md"
    if not root_index.is_file():
        add_error(errors, root_index, "OKF bundle root index is missing")
    else:
        data = parse_frontmatter(root_index, errors)
        if data is not None:
            if set(data) != {"okf_version"}:
                add_error(
                    errors,
                    root_index,
                    "root index frontmatter may contain only `okf_version`",
                )
            expected_version = str((profile or {}).get("okf", {}).get("version") or "")
            if data.get("okf_version") != expected_version:
                add_error(
                    errors,
                    root_index,
                    "`okf_version` does not match refs/okfProfile.yaml",
                )

    for path in REFS.rglob("index.md"):
        if path != root_index and text(path).startswith("---\n"):
            add_error(
                errors,
                path,
                "non-root OKF index files must not contain frontmatter",
            )

    try:
        expected = expected_indexes()
    except SystemExit as exc:
        add_error(errors, "refs/index.md", f"could not generate OKF indexes: {exc}")
        return

    expected_paths = set(expected)
    existing_paths = {
        path for path in REFS.rglob("index.md") if "__pycache__" not in path.parts
    }
    for path, wanted in expected.items():
        if not path.is_file():
            add_error(errors, path, "generated OKF index is missing")
        elif text(path) != wanted:
            add_error(errors, path, "generated OKF index is stale")

    for path in existing_paths - expected_paths:
        add_error(errors, path, "unexpected generated OKF index")


def main() -> int:
    errors: list[str] = []
    profile = validate_profile(errors)
    validate_concepts(errors)
    validate_indexes(profile, errors)

    if errors:
        print("OKF profile validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    count = sum(
        1
        for path in REFS.rglob("*.md")
        if path.name not in RESERVED and "__pycache__" not in path.parts
    )
    index_count = sum(
        1 for path in REFS.rglob("index.md") if "__pycache__" not in path.parts
    )
    print(
        f"OKF profile validation passed ({count} concepts, {index_count} indexes)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
