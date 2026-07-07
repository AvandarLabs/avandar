# Configuration

`dif` has no `config.json`. There is no on-disk configuration file.

## Command registry

The global command palette (`Ctrl+P`, see
[features.md](features.md#command-palette)) is backed by an **in-code registry**
rather than an editable file: the flat, ordered table `PALETTE_COMMANDS` in
`src/tui/palette.rs`. Each entry is a `PaletteCommand { label, action }`, and
each `PaletteAction` variant is dispatched by `App::execute_palette_action`
(`src/tui/app.rs`).

Today the registry has three entries: "Restart dif" → `PaletteAction::RestartDifit`
(`Ctrl+R`), "Regenerate diff guide" → `PaletteAction::RegenerateGuide`
(`Ctrl+D`), and "Open difit in browser" → `PaletteAction::OpenInBrowser`
(`Ctrl+O`), each shown with its direct key as a dimmed `[^R]` / `[^D]` / `[^O]`
hint on its row (`palette::shortcut_for`). Adding a command is three edits: add a
`PaletteAction` variant, add a row to `PALETTE_COMMANDS`, and handle the variant
in `execute_palette_action`; add a `shortcut_for` arm if it also gets a direct
key (and the dimmed hint then renders automatically — keep it current with the
key, per the shortcut-label rule in `AGENTS.md`). The 1-based number shown next
to a command is its position in the table.

## Derived runtime values

Everything else is derived at runtime:

- the comparison key from the CLI argument (or the `develop`/`main` default),
- the port, transcript path, session-id path, guide path, and reviewed-state
  path from the branch + scope (see [data-model.md](data-model.md)),
- the commit policy from the comparison key (see
  [integrations.md](integrations.md#commit-policy-by-comparison)).

If configuration is added later (e.g. poll interval, default comparison,
panel split ratio), follow the sibling crates' pattern — a `config.json` next
to the binary loaded via serde with defaults on missing/invalid — and document
the schema here.
