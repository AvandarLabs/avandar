# Avandar

[Avandar](https://www.avandarlabs.com/) is the data management platform for the
social sector. We provide a suite of tools for mission-driven organizations to
unify their data, programs, and reporting in one streamlined platform.

Whether it's data cleanup, visualization, analytics, or reporting, Avandar's
goal is to be the go-to platform that the social sector can rely on to solve
any data-related problem.

Anyone can sign up for Avandar, but the platform is optimized for
resource-constrained teams that have too much data to manage comfortably
in spreadsheets, but too little data to make the expense and complexity of
Big Data software worth it. This is far from a niche data scale and is actually
where 80% of organizations in the social sector fit. Avandar is built to fill
that gap.

If you have questions, comments, bug reports, or feature requests, join our
Discord server and we'll help you! Discord link: <https://discord.gg/8u8FHAbuw7>

The platform is still in beta so your feedback is vital to helping shape
the product into something that truly serves your mission.

## Local development

### Prerequisites

1. Node.js
2. Bun (the repo pins this in `.bun-version`)
3. Docker Desktop
4. Supabase CLI (`brew install supabase/tap/supabase`)
5. ngrok (`brew install ngrok`)

### Set up

1. Clone this repo and install dependencies

   ```bash
   pnpm install
   pnpm build:ava-cli
   ```

   `pnpm` remains the package manager for the monorepo. Some app scripts run
   with Bun, and the expected Bun version is pinned in `.bun-version`.

   `pnpm install` also points your git hooks at the repo's `.githooks/`
   directory (via the `prepare` script). A `pre-push` hook then runs
   `prettier`, `eslint --fix`, and `stylelint --fix` on files changed on
   the current branch before letting a push through, and blocks the push if
   any files were reformatted so you can review and commit the changes. If
   you ever need to bypass it for a one-off, `git push --no-verify` skips
   the hook.

2. Initiate a local instance of Supabase (you need to have installed Supabase
   CLI for this)

   ```bash
   supabase start
   ```

   You should be able to access your local Supabase Studio at a URL provided
   in the output (most likely `http://localhost:54323`)

3. Set up your environment variables

   ```bash
   pnpm env:reset
   ```

   This will create `.env.development` and `.env.development.edge` files which
   you will need to fill out.

   Next, fill in the necessary environment variables. For the Supabase
   variables, you should use the values you get from the output of running
   `supabase start` locally. If your local Supabase is already running, run
   `supabase status` to see your Supabase environment variables again.

4. Set up your local database

   ```bash
   pnpm db:reset
   ```

   This loads `.env.development` for the seed step, resets your Supabase
   database, applies all local migrations from the `supabase/migrations`
   directory, and then adds the seed data from `seed/SeedConfig.ts`.

5. Start the development server

   ```bash
   pnpm dev
   ```

### End-to-end tests (Playwright)

Playwright runs against the app URL in `playwright.config.ts` (default
`http://127.0.0.1:5173`). The config can start Vite automatically unless a
server is already running.

**Install browsers once** (and again after upgrading `@playwright/test`):

```bash
pnpm exec playwright install chromium
```

Without this step, e2e tests fail with `browserType.launch: Executable doesn't
exist`. Browsers are stored under `~/Library/Caches/ms-playwright/` on macOS
(not in the repo).

Playwright's web server enables `enable-shared-with-me` in
`VITE_FEATURE_FLAGS`. If you reuse an existing dev server on port 5173, add
that flag to your `.env.development` or stop the dev server so Playwright can
start one with the correct flags.

E2E tests expect a **full local Supabase stack**: `supabase start`, seeded DB
(`pnpm db:reset` or equivalent), **Edge Functions served** (e.g. `pnpm fns:serve`
after `pnpm fns:update-env`), and `.env.development` filled in (including
`SUPABASE_SERVICE_ROLE_KEY` for global setup). Tests call real RPCs and function
routes; they do not stub Supabase APIs.

| Command                | What it does                                                                      |
| ---------------------- | --------------------------------------------------------------------------------- |
| `pnpm test`            | Full suite (unit + integration + e2e). Use `pnpm test -- --quick` to skip e2e. |
| `pnpm test:e2e`        | **Headless** run: no browser window, best for CI and quick passes.                |
| `pnpm test:e2e:headed` | Same tests with a **visible** browser; useful to watch flows and failures.        |
| `pnpm test:e2e:ui`     | **Playwright UI mode**: pick tests, debug with time travel, live DOM, and traces. |

## Stack

- React
- Vite
- TypeScript
- Mantine
- TailwindCSS (this is on v3 because `eslint-plugin-tailwindcss` does not support
  v4 yet)
- React Query
- React Router
- Supabase

## Reference documentation

The [`docs/`](docs/) directory holds long-lived Markdown notes:
architectural decisions, design decisions, and change checklists. Start there
when touching cross-cutting areas (for example, dataset source types).

## Creating new CRUD models

### 1. DB schema changes

1. Create a SQL DB schema in `supabase/schemas`
2. Generate a new migration with `pnpm db:new-migration your_migration_name`
3. Review that the generated migration makes sense and does what you need to.
4. Apply the new migration with `pnpm db:apply-migrations`

### 2. Set up the TypeScript models

1. Generate the new types with `pnpm db:gen-types`
2. Run `pnpm new:model YourModel your_db_table_name` to create your new model
   with CRUD variants.

   This will create a new directory in `src/models/[YourModel]/` with the following
   files:
   - `types.ts`: All TypeScript types for this model. Only types should exist here,
     no actual runtime-executable code.
   - `parsers.ts`: All Zod schemas for this model. This file also includes
     Type-level tests to ensure the Zod schemas are consistent with the model types
     from the `types.ts` file.
   - `[YourModel]Client.ts`: API client for this model.

3. Update your model types in the `types.ts`. Make sure your frontend model's
   `Read`, `Insert`, and `Update` variants are correctly specified.
   - For `Insert`, our convention is to wrap the `Read` variant in
     `SetOptional<Required<ModelRead>, requiredFields>`. Meaning, we make the
     `Read` variant fully required, and then we specify the optional fields.
   - If your `Read` variant has a discriminated union, you will need sub-types for
     each part of the union, and then reference them in the `Insert` and `Update`
     variants. See [ConceptAttribute.types.ts](shared/models/ontology/ConceptAttribute/ConceptAttribute.types.ts)
     for an example. This is because if you apply `Partial<>` or `SetRequired<>`
     to the full object, TypeScript loses the discriminated union and treats it
     as a regular union. Splitting up the union into types and applying
     `Partial<>` or `SetRequired<>` to each sub-type allows us to maintain the
     discriminated union.

4. Set up the Zod schema parsers in `parsers.ts`.
   - Ensure the `DBRead`, `DBInsert`, and `DBUpdate` schemas match the model's
     database table in `shared/types/database.types.ts`.
   - For the `DBInsertSchema` our convention is to call
     `DBReadSchema.required().partial({ fields })`. Meaning, we make the
     `DBReadSchema` fully required, and then we specify which fields are optional.
   - Ensure the frontend model's `ModelRead`, `ModelInsert`, and `ModelUpdate`
     schemas match the types in `types.ts`.
   - For the `ModelInsertSchema` our convention is to call
     `ModelReadSchema.required().partial({ fields })`. Meaning, we make the
     `ModelReadSchema` fully required, and then we specify which fields are
     optional.
   - Ensure there are no TypeScript errors being thrown in the
     `makeParserRegistry` line or in the type-level tests at the end of the file.

5. Verify there are no TypeScript errors in `[YourModel]Client.ts`.

## Adding new Supabase storage buckets

1. Create a migration script in `./migrations/<timestamp>_STORAGE-<bucket-name>-bucket.sql`.
   - Examples:
     - `./migrations/20260119164300_STORAGE-workspaces-bucket.sql`
     - `./migrations/20260122161802_STORAGE-public-bucket.sql`
2. Add the new SQL script to the `sql_paths` array in the `[db.seed]` section
   of `supabase/config.toml`. This creates the bucket locally whenever we run
   `pnpm db:reset`.
