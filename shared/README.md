# `shared/`

This directory holds all TypeScript that can be shared between all JS runtimes
where our TypeScript can run.

- **Deno**: Supabase edge functions (`supabase/functions`) run on Deno
- **Node**: Scripts (`scripts/`) run in Node. They use `vite-node` to run,
  which loads `.env.development` and allows Node scripts to access both Vite's
  `import.meta` and Node's `process.env`.
- Frontend code (`src/`) uses Vite and runs in the browser.

**IMPORTANT**: Deno resolves imports differently from other environments, so
anything in this directory should use as few 3rd party libraries as possible.
This will make interoperability between these runtimes as smooth as possible.
