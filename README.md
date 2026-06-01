# LKP Parduli Rasa

Monorepo npm workspaces with a React + Vite frontend in `apps/web`, a Node/Express backend in `apps/api`, and a shared domain package in `packages/domain`.

## Core Commands

- `npm run dev` runs the web app and API together.
- `npm run dev:web` starts the Vite frontend only.
- `npm run dev:api` starts the Express backend only.
- `npm run build` builds the frontend bundle into `apps/web/dist`.
- `npm run lint` runs ESLint across the repo.
- `npm run smoke:dev` starts a finite automation smoke test for the web/API dev servers.
- `npm run db:generate`, `npm run db:migrate`, and `npm run db:seed` operate on the API schema in `apps/api`.

## Windows Harness Notes

Windows PowerShell 5.1 can resolve bare `npm` to `npm.ps1`, which may be blocked by execution policy. For automation on Windows, prefer `npm.cmd run smoke:dev` or `node scripts/dev-smoke.mjs full`.

The smoke harness avoids PowerShell inline `node -e`, `Start-Process`, and wrapper PID cleanup. It starts the API and Vite directly with Node, waits for bounded health checks, and shuts the child processes down before exiting.

## Graphify Workflow

This repo does not rely on `graphify` or `python` from `PATH`. Use the repo-local wrapper instead:

- `npm run graphify:doctor`
- `npm run graphify:update`
- `npm run graphify:query -- "<question>"`
- `npm run graphify:path -- "<A>" "<B>"`
- `npm run graphify:explain -- "<node>"`

The wrapper lives at [scripts/graphify.ps1](/d:/DATA%20FERRY%20PENTING/LKP%20Parduli%20Rasa/scripts/graphify.ps1) and always bootstraps Graphify from the pinned interpreter in `graphify-out/.graphify_python` or the known-good local fallback. It also moves transient `.graphify_*.json` files out of the repo root so Graphify work state stays inside `graphify-out/`.

More detail is in [docs/graphify.md](/d:/DATA%20FERRY%20PENTING/LKP%20Parduli%20Rasa/docs/graphify.md).
