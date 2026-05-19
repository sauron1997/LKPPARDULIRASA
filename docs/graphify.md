# Graphify Workflow

This repo uses a repo-local PowerShell wrapper so Graphify works consistently on Windows without depending on `graphify`, `python`, or `python3` from `PATH`.

## Canonical Commands

- `npm run graphify:doctor`
- `npm run graphify:update`
- `npm run graphify:query -- "<question>"`
- `npm run graphify:path -- "<A>" "<B>"`
- `npm run graphify:explain -- "<node>"`

## How It Resolves Python

The wrapper resolves Graphify in this order:

1. `graphify-out/.graphify_python`
2. `$env:GRAPHIFY_PYTHON`
3. `C:\Program Files\PostgreSQL\18\pgAdmin 4\python\python.exe`
4. `py -3` if available
5. `python3` and `python` only when they are not WindowsApps shims

All successful runs execute `python -m graphify ...` and refresh `graphify-out/.graphify_python` with the working interpreter path.

## Repo Hygiene

- `.graphifyignore` keeps `.graphify-site/`, `graphify-out/`, `.graphify_*.json`, `.codex/`, `node_modules/`, `dist/`, and log files out of the graph corpus.
- The wrapper deletes legacy root-level `.graphify_*.json` files after successful Graphify commands.
- `graphify-out/` remains the canonical output location for `graph.json`, `GRAPH_REPORT.md`, and related generated files.

## Hook Behavior

The Codex hook now calls the repo-local wrapper:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\graphify.ps1 hook-check
```

This preserves Graphify's no-op `hook-check` behavior while avoiding the broken bare `graphify` invocation.

## Troubleshooting

- Run `npm run graphify:doctor` first if Graphify stops working.
- If the pinned interpreter is missing or unhealthy, the wrapper fails with a message that points back to `graphify-out/.graphify_python`.
- If `manifest.json` still mentions `.graphify-site/` or root `.graphify_*.json`, rerun `npm run graphify:update -- --force`.
