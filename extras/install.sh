#!/usr/bin/env bash
# Install the TriglavCode plugin pack into the user's opencode/triglavcode config.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGINS="${HOME}/.opencode/plugins"
AGENTS="${HOME}/.config/opencode/agent"
CONFIG="${HOME}/.config/opencode/opencode.jsonc"

mkdir -p "$PLUGINS" "$AGENTS"

echo "→ installing plugins to $PLUGINS"
for dir in "$ROOT"/triglav-plugins/*; do
  name="$(basename "$dir")"
  rm -rf "$PLUGINS/$name"
  cp -r "$dir" "$PLUGINS/$name"
  echo "  • $name"
done

echo "→ installing agents to $AGENTS"
cp "$ROOT"/triglav-agents/*.md "$AGENTS"/
echo "  • analyst, developer, tester"

echo
echo "Add the plugin entries to $CONFIG (plugin array):"
python3 - "$CONFIG" <<'PY'
import json, os, sys
from pathlib import Path

config = Path(sys.argv[1])
home = Path.home()
names = ["economics","test-data-gen","delegation-control","brigade","event-triggers","calendar","knowledge-base","media-gen","threed","design-ux"]
entries = [f"file://{home}/.opencode/plugins/{n}/index.js" for n in names]

if not config.exists():
    print(json.dumps({"plugin": entries}, indent=2))
    raise SystemExit(0)

text = config.read_text(encoding="utf-8")
# naive JSONC-safe insertion: if no "plugin" key, show snippet
if '"plugin"' not in text:
    print(json.dumps({"plugin": entries}, indent=2))
    raise SystemExit(0)
missing = [e for e in entries if e not in text]
if not missing:
    print("All plugin entries already present.")
else:
    print("Missing entries (add them to the existing \"plugin\" array):")
    for e in missing:
        print(f'  "{e}",')
PY
