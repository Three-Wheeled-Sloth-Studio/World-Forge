from __future__ import annotations

import json
from pathlib import Path

source_path = Path('/tmp/apply-enrichment-foundation.mjs')
target_path = Path('/tmp/apply-enrichment-foundation.fixed.mjs')
text = source_path.read_text(encoding='utf-8')
lines = text.splitlines(keepends=True)
result: list[str] = []
index = 0


def decode_template(value: str) -> str:
    # The bootstrap file intentionally stores new-file bodies with JavaScript
    # escape sequences. Decode the common escapes, then emit a normal JSON
    # string so TypeScript backticks and ${...} remain literal source text.
    return bytes(value, 'utf-8').decode('unicode_escape')


def rewrite_replace_block(block: str) -> str:
    # This no-op replacement was left in the bootstrap while drafting the
    # graph notice. Drop it rather than parsing its nested escaped template.
    if 'runDisabledReason || (selected ?' in block:
        return ''

    first = block.find('`')
    if first < 0:
        raise RuntimeError(f'Could not identify first replace template: {block[:160]}')

    # Multiline calls use `before`, newline `after`. Inline calls use
    # `before`, `after`. The inline form is only used for simple markers, so
    # finding the literal delimiter is unambiguous there.
    separator = block.find('`,\n', first + 1)
    if separator < 0:
        separator = block.find('`,\r\n', first + 1)
    inline = False
    if separator < 0:
        separator = block.find('`, `', first + 1)
        inline = True
    if separator < 0:
        raise RuntimeError(f'Could not identify replace separator: {block[:160]}')

    second_search_start = separator + (3 if inline else 2)
    second = block.find('`', second_search_start)
    last = block.rfind('`')
    if second < 0 or last <= second:
        raise RuntimeError(f'Could not identify second replace template: {block[:160]}')

    before = decode_template(block[first + 1:separator])
    after = decode_template(block[second + 1:last])
    return (
        block[:first]
        + json.dumps(before)
        + block[separator + 1:second]
        + json.dumps(after)
        + block[last + 1:]
    )


while index < len(lines):
    line = lines[index]
    stripped = line.lstrip()
    if stripped.startswith("write('"):
        block = line
        while not block.rstrip().endswith('`);'):
            index += 1
            block += lines[index]
        first = block.find('`')
        last = block.rfind('`')
        if first < 0 or last <= first:
            raise RuntimeError(f'Could not identify write template: {block[:120]}')
        content = decode_template(block[first + 1:last])
        result.append(block[:first] + json.dumps(content) + block[last + 1:])
    elif stripped.startswith('replaceOnce('):
        block = line
        while not block.rstrip().endswith(');'):
            index += 1
            block += lines[index]
        result.append(rewrite_replace_block(block))
    else:
        result.append(line)
    index += 1

target_path.write_text(''.join(result), encoding='utf-8')
print(f'Repaired temporary patch script: {target_path}')
