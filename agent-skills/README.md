# agent-skills/

Internal home for agent skills that live **inside this repository** (as opposed
to third-party skills pulled in via `npx skills` and tracked in
`skills-lock.json` at the repo root).

Skills here are part of our source tree: they are versioned with the repo,
edited in place, and do **not** depend on `npx skills` or `skills-lock.json` to
stay up to date.

## Layout

- [`public-skills/`](./public-skills) — a **public package**. These skills are
  written to be useful to the general public (no Avandar-specific or
  repo-specific dependencies) and are licensed separately under MIT (see
  `public-skills/LICENSE`). The rest of this repo is licensed under CPAL-1.0.

Treat `agent-skills/` itself as internal. Treat `agent-skills/public-skills/`
as a public, independently-licensed package.

## Every skill here must be symlinked

Agents discover skills from their own directories, not from `agent-skills/`. So
every skill under `agent-skills/` must be symlinked into each supported agent's
skills directory:

- `.claude/skills/` — Claude Code
- `.agents/skills/` — Codex
- `.cursor/skills/` — Cursor
- `.opencode/skills/` — OpenCode

Do not create these symlinks by hand. Run the script:

```bash
./agent-skills/symlink-skills-dirs.sh
```

It finds every directory under `agent-skills/` that contains a `SKILL.md` and
creates (or refreshes) a relative symlink to it in each of the four agent
directories. Run it whenever you **add, remove, or rename** a skill under
`agent-skills/`.
