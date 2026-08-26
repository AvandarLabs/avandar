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

Every command reads **exactly one** env file, chosen by two global options that
work on every command:

| Invocation                | File               |
| ------------------------- | ------------------ |
| `ava <command>`           | `.env.development` |
| `ava <command> --staging` | `.env.staging`     |
| `ava <command> --prod`    | `.env.production`  |

**Nothing is merged.** A variable that the chosen file omits is absent, full
stop. It is not inherited from `.env.development`.

That is a deliberate change from how this used to work. Previously the entry
point always loaded `.env.development` and a command then layered its target's
file on top, which meant two things at once: a variable missing from
`.env.staging` silently resolved to its local value, and `dotenv` would not
overwrite an already-set variable anyway. `ava supabase run --prod` announced
production and then ran against the local database.

### So some `--staging` and `--prod` runs will fail

`.env.staging` and `.env.production` were written while that merge existed, so
they are missing variables a remote run now needs. `SUPABASE_POSTGRES_URL` is
absent from both, for instance, which `ava supabase run` requires.

This surfaces as a named failure rather than a wrong result:

```
$ ava dev ngrok list --staging
AVA_DEV_FANOUT_SERVER_URL is not set in .env.staging
```

Add the variable to the file the message names. Nothing needs to change in this
CLI.

### Reading env vars in a command

Use `requireEnv` from `@ava-cli/avaEnv/avaEnv`, never `process.env` directly:

```ts
import { requireEnv } from "@ava-cli/avaEnv/avaEnv";

const url = requireEnv("AVA_PIPELINE_SERVER_URL");
```

It throws naming both the variable and the file this invocation actually
loaded, so the message sends the reader to the right place. A key that is
present but blank counts as missing.

`getLoadedAvaEnvTarget()` gives the target as `"local" | "staging" |
"production"` when a command needs to label or branch on it. Do not add
per-command `--staging` or `--prod` options; they are global.

### One parsing gotcha

Options must come **after** positional arguments, because the parser treats the
first token starting with `-` as the start of the options:

```bash
ava supabase google-token get me@example.com --staging   # correct
ava supabase google-token get --staging me@example.com   # the email is read
                                                         # as --staging's value
```

The wrong order fails with a missing-positional error rather than doing
something unintended.

### Known gap

The local-environment commands (`supabase switch`, `supabase restore`,
`supabase status`) operate on `.env.development` files by name and are only
meaningful locally. They currently accept `--staging` and `--prod` and ignore
them, because the flags are global by design rather than declared per command.
