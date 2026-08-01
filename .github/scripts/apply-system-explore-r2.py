from pathlib import Path

source_path = Path('/tmp/apply-system-explore.py')
source = source_path.read_text(encoding='utf-8')
cosmetic_block = '''replace_exact(
    'apps/desktop/src/workspace/WorldWorkspace.tsx',
    "                  {showHexes && hexOverlayLabel && <small>{hexOverlayLabel}</small>}",
    "                  {viewMode !== 'system' && showHexes && hexOverlayLabel && <small>{hexOverlayLabel}</small>}"
)
'''
if cosmetic_block not in source:
    raise RuntimeError('Expected cosmetic hex-scale replacement was not found in the staged patch.')
exec(compile(source.replace(cosmetic_block, ''), str(source_path), 'exec'))
