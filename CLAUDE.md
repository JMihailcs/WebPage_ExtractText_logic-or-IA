# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Extractor de Conclusiones" — a web app that takes `.docx` uploads and extracts the *Conclusiones* section from each one, via two competing strategies exposed as separate endpoints:

- **lógica** — regex/heuristic extraction over the raw text (`backend/services/docService.js`)
- **IA** — a local LLM through Ollama (`backend/services/IAService.js`)

The whole point of the project is comparing the two, so keep both paths working when changing shared code.

Code, identifiers, comments, and log output are in Spanish. Match that when adding code.

## Commands

Yarn workspaces are *not* configured; each package installs separately.

```bash
yarn --cwd backend install
yarn --cwd frontend install

yarn dev                  # both at once (root script — see gotcha below)
yarn --cwd backend dev    # nodemon server.js  -> http://localhost:4000
yarn --cwd frontend dev   # next dev           -> http://localhost:3000

ollama serve              # required for the /ia endpoint
```

There are no tests. The frontend also has `build` / `start` / `lint`; the backend has only `dev`.

The `/ia` endpoint additionally needs an Ollama model from `IAService.js`'s preference list — e.g. `ollama pull gemma3:1b`. Without one it fails with "Ningún modelo compatible encontrado".

## Architecture

Two independent processes; the frontend talks to the backend over a hardcoded `http://localhost:4000` URL in `frontend/app/page.tsx`. There is no env-var/proxy indirection — changing the backend port means editing that fetch call.

**Request flow** (`POST /procesarTexto/logica` or `/procesarTexto/ia`, multipart field `archivos`, max 10 files):

1. `middlewares/upload.js` — multer writes to `uploads/` with a uuid-suffixed name.
2. `controllers/procesarTextoController.js` → `procesarArchivosSeguros(files, fn, tipo)` is the shared engine for both endpoints. The only difference between `procesar` and `procesarIA` is which extractor function gets passed in.
3. Per request it mkdirs `uploads/temp/<uuid>/`, copies each upload twice (a `_work` copy and a `_processing` copy) and runs the extractor against the `_processing` copy. Files are processed **sequentially**, not in parallel — this is deliberate, to avoid the file collisions the naming scheme is guarding against.
4. Per-file failures are caught and returned as a result row with `error: true` rather than failing the whole request; the response is always `{ resultados, totalProcesados, timestamp }`.
5. A `finally` block unlinks the original uploads and removes the temp dir. Any new early return must not bypass it.

`uploads/` and `uploads/temp/` are resolved **relative to the process CWD**, so the backend must be started from `backend/`.

**Extraction strategies:**

- `docService.js` matches ordered regex patterns for a `CONCLUSIONES` heading, bounded by the next section heading (RECOMENDACIONES/BIBLIOGRAFÍA/etc.), requires a >30-char match, then falls back to 400 chars from the first case-insensitive `conclusion` occurrence. Returns `null` if nothing matches.
- `IAService.js` lazily initializes a singleton Ollama client at `localhost:11434`, truncates input to 6000 chars, then picks the first *installed* model matching its preference list (`gemma3:1b`, `gemma:2b`, `llama3.2:1b`, `llama3.2`, `llama2`) — it does not pull models. Chat calls are wrapped in a 45s timeout with 3 retries and backoff, and `ECONNREFUSED`/`EOF`/model errors are translated into actionable Spanish messages.

Both services re-extract text with `mammoth` themselves; there is no shared text-extraction step.

**Frontend** is a single client component (`frontend/app/page.tsx`) holding all state — file list, results, loading, drag state. It filters by `.docx` extension and dedupes by filename before upload. Tailwind v4 is used via `@import "tailwindcss"` in `app/globals.css` with the `@tailwindcss/postcss` plugin; there is no `tailwind.config`.

## Gotchas

- There are lockfiles at both the root and in `frontend/`, so Turbopack infers the wrong workspace root. `frontend/next.config.ts` pins `turbopack.root` to the frontend directory to fix this. **Changing `turbopack.root` invalidates the `.next` cache in a way Next does not detect** — the dev server keeps running but every request 500s with "Could not find the module ... in the React Client Manifest". Stop the server, `rm -rf frontend/.next`, and restart.
- `verificarEstadoTemporal` and `diagnosticarDuplicados` are exported from the controller but never mounted in `routes/procesarTextoRoutes.js`. `diagnosticarDuplicados` also calls `filtrarArchivosDuplicados`, which is not defined anywhere — it would throw if wired up.
- `next-env.d.ts` and `tsconfig.json` (`jsx: react-jsx`, the `.next/dev/types` include) are rewritten by `next dev`. Don't hand-edit them.
