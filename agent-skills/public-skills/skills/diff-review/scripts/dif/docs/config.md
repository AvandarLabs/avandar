# Configuration

`dif` stores repo-local configuration in `.difit/dif.config.json`. The file is
inside `.difit/`, so it is ignored with the rest of the review working state and
does not affect other repositories.

Manage it through the CLI:

```sh
pnpm diff-review config
pnpm diff-review config get claude_cmd
pnpm diff-review config set claude_cmd="claude"
pnpm diff-review config set codex_cmd="codex"
```

If `config set` receives a name without `=value`, it prompts once on
`/dev/tty`, matching the terminal experience used by `brain config set`.

## Schema

| Name | Default | Purpose |
| --- | --- | --- |
| `claude_cmd` | `claude` | Base command for Claude. `dif` appends `--resume <id>` or `--session-id <id>` and the optional prompt. |
| `codex_cmd` | `codex` | Base command for Codex. `dif` appends Codex-compatible args, such as `resume <id>` when a saved id exists, plus the optional prompt. |

Launches default to Claude. Pass `--codex` or `-cx` to run the right pane with
Codex instead:

```sh
pnpm diff-review develop --codex
pnpm diff-review develop -cx
```

## Command registry

The global command palette (`Ctrl+P`, see
[features.md](features.md#command-palette)) is backed by an **in-code registry**
rather than an editable file: the flat, ordered table `PALETTE_COMMANDS` in
`src/tui/palette.rs`. Each entry is a `PaletteCommand { label, action }`, and
each `PaletteAction` variant is dispatched by `App::execute_palette_action`
(`src/tui/app.rs`).

Today the registry has four entries: "Restart diff server" → `PaletteAction::RestartDifit`
(`Ctrl+R`), "Regenerate diff guide" → `PaletteAction::RegenerateGuide`
(`Ctrl+G`), "Open diff in browser" → `PaletteAction::OpenInBrowser`
(`Ctrl+O`), and "New LLM session" → `PaletteAction::NewLlmSession`
(`Ctrl+N`), each shown with its direct key as a dimmed
`[^R]` / `[^G]` / `[^O]` / `[^N]` hint on its row (`palette::shortcut_for`). Adding a command is three edits: add a
`PaletteAction` variant, add a row to `PALETTE_COMMANDS`, and handle the variant
in `execute_palette_action`; add a `shortcut_for` arm if it also gets a direct
key (and the dimmed hint then renders automatically; keep it current with the
key, per the shortcut-label rule in `AGENTS.md`). The 1-based number shown next
to a command is its position in the table.

## Derived runtime values

Everything else is derived at runtime:

- the comparison key from the CLI argument (or the `develop`/`main` default),
- the port, transcript path, session-id path, guide path, and reviewed-state
  path from the branch + scope (see [data-model.md](data-model.md)),
- the commit policy from the comparison key (see
  [integrations.md](integrations.md#commit-policy-by-comparison)).
