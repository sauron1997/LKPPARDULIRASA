## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `npm run graphify:query -- "<question>"`, `npm run graphify:path -- "<A>" "<B>"`, or `npm run graphify:explain -- "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `npm run graphify:update` to keep the graph current (AST-only, no API cost)
