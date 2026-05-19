# LKP Parduli Rasa

React + Vite frontend with a local Node/Express backend and a repo-local Graphify workflow.

## Core Commands

- `npm run dev` runs the client and server together.
- `npm run build` builds the frontend bundle.
- `npm run lint` runs ESLint across the repo.

## Graphify Workflow

This repo does not rely on `graphify` or `python` from `PATH`. Use the repo-local wrapper instead:

- `npm run graphify:doctor`
- `npm run graphify:update`
- `npm run graphify:query -- "<question>"`
- `npm run graphify:path -- "<A>" "<B>"`
- `npm run graphify:explain -- "<node>"`

The wrapper lives at [scripts/graphify.ps1](/d:/DATA%20FERRY%20PENTING/LKP%20Parduli%20Rasa/scripts/graphify.ps1) and always bootstraps Graphify from the pinned interpreter in `graphify-out/.graphify_python` or the known-good local fallback. It also moves transient `.graphify_*.json` files out of the repo root so Graphify work state stays inside `graphify-out/`.

More detail is in [docs/graphify.md](/d:/DATA%20FERRY%20PENTING/LKP%20Parduli%20Rasa/docs/graphify.md).
