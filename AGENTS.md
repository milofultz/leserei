# Agent notes

Leserei is a Bun + React EPUB → Markdown/text converter. Prefer Bun over Node/npm/pnpm/vite.

## Commands

```bash
bun install
bun dev
bun test
bun run typecheck
bun run lint
bun run build
```

## Cursor Cloud specific instructions

- Runtime: Bun (installed via `.cursor/Dockerfile`).
- Update/install: `bun install` (see `.cursor/environment.json`).
- Dev server terminal starts with `bun dev`.
- Before finishing work: `bun test` and `bun run typecheck`.
