# `ava`

The Avandar CLI. Build it and put it on your `PATH` with:

```bash
pnpm build:ava-cli
```

That also repoints the `ava` symlink at the worktree you ran it from, which
matters when several worktrees are checked out. The CLI refuses to run when the
built bundle does not match the repository you are standing in, rather than
acting on it with stale code.

Run `ava` with no arguments for the command tree.

## Which environment a command reads

Every command reads **exactly one** env file, chosen by the global
`--env <name>` option, which works on every command:

| Invocation                       | File               |
| -------------------------------- | ------------------ |
| `ava <command>`                  | `.env.development` |
| `ava <command> --env staging`    | `.env.staging`     |
| `ava <command> --env production` | `.env.production`  |
| `ava <command> --env demo`       | `.env.demo`        |

Any kebab-case name works: `--env <name>` loads `.env.<name>` from the repo
root, so pointing the CLI at a new deployment only takes a new env file. Every
`.env.*` file except the examples is gitignored. `--staging` and `--prod` are
refused with the `--env` that replaces them, and so is `--env=<name>`, which
the parser would otherwise never see.

**Nothing is merged.** A variable that the chosen file omits is absent, full
stop. It is not inherited from `.env.development`. Merging a fallback in would
let a `--env production` run announce production and then act on whatever
database `.env.development` names.

### So some deployed runs will fail

A deployed env's file can be missing variables a command needs.
`.env.staging` and `.env.production` lack `SUPABASE_POSTGRES_URL`, for
instance, which `ava supabase run` requires.

This surfaces as a named failure rather than a wrong result:

```
$ ava dev ngrok list --env staging
AVA_DEV_FANOUT_SERVER_URL is not set in .env.staging
```

Add the variable to the file the message names. Nothing needs to change in this
CLI.

### Running a pipeline against a deployed database

`ava pipeline run <name> --local` writes to the Supabase project named by
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, so an env file with those two is
enough:

```bash
ava pipeline run world-bank__wdi --local --env staging
```

### Reading env vars in a command

Use `AvaEnv.requireVar` from `@ava-cli/AvaEnv/AvaEnv`, never `process.env`
directly:

```ts
import { AvaEnv } from "@ava-cli/AvaEnv/AvaEnv";

const url = AvaEnv.requireVar("AVA_PIPELINE_SERVER_URL");
```

It throws naming both the variable and the file this invocation actually
loaded, so the message sends the reader to the right place. A key that is
present but blank counts as missing.

`AvaEnv.getLoadedEnvName()` gives the env name, such as `"development"` or
`"demo"`, when a command needs to label it. `AvaEnv.isLocal()` says whether
the invocation is on the default `.env.development`, which points at the local
stack; branch on that rather than on a list of deployed names. Do not add a
per-command env option; `--env` is global.

### One parsing gotcha

Options must come **after** positional arguments, because the parser treats the
first token starting with `-` as the start of the options:

```bash
ava supabase google-token get me@example.com --env staging   # correct
ava supabase google-token get --env staging me@example.com   # the email is read
                                                             # as part of --env
```

The wrong order fails with a missing-positional error rather than doing
something unintended.

### Known gap

The local-environment commands (`supabase switch`, `supabase restore`,
`supabase status`) operate on `.env.development` files by name and are only
meaningful locally. They currently accept `--env` and ignore it, because the
option is global by design rather than declared per command. They should
refuse it instead: AVA-350.

`ava pipeline run --local` runs the pipeline under `vite-node`, which loads
`.env.development` and fills in every variable the chosen env file left unset.
So a `--env demo` run whose `.env.demo` omits `SUPABASE_URL` writes to the
local database. Set both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in any
env file a pipeline runs against.
