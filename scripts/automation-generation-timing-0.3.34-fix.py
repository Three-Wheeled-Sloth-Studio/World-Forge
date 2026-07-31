from pathlib import Path

path = Path('apps/desktop/src/generation/generationTiming.ts')
text = path.read_text(encoding='utf-8')
old = "    totalElapsedMs: Math.max(0, input.totalElapsedMs),"
new = "    totalElapsedMs: Number.isFinite(input.totalElapsedMs) ? Math.max(0, input.totalElapsedMs) : 0,"
if text.count(old) != 1:
    raise SystemExit(f'Expected one totalElapsedMs guard, found {text.count(old)}')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
