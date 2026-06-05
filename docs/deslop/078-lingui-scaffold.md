# 078 — Lingui scaffold

- **Slug**: `lingui-scaffold`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-078/lingui-scaffold`
- **Depends on**: `none` (this is the foundation; rows #079–#082 build on it).
- **Estimated PR size**: medium — config + 8 locale dirs + Babel macro wiring, ~400 lines.

## Notes for future you

- 8 locales scaffolded: `en, es, pt, fr, sw, ar, zh-Hans, zh-Hant`. Catalogs start empty for non-English; #081 populates them across the surface.
- Babel macro requires `@vitejs/plugin-react` (not SWC). If `develop` is on SWC, switch to Babel for Lingui macros to work.

## What this feature is

`lingui.config.ts` + Babel macro via `@vitejs/plugin-react`. Dynamic catalog loader splits each locale into its own chunk. 8 locale directories scaffolded (`src/locales/en, es, pt, fr, sw, ar, zh-Hans, zh-Hant`).

## Steps to migrate

**Step 0** — `/deslop undrift lingui-scaffold`.

1. Create the refactor branch.
2. Add Lingui deps + Babel macro.
3. Copy the config + the 8 locale dirs.
4. If `develop` uses SWC, switch to Babel.

### Files to copy verbatim

```
lingui.config.ts
src/locales/en/messages.po
src/locales/es/messages.po
src/locales/pt/messages.po
src/locales/fr/messages.po
src/locales/sw/messages.po
src/locales/ar/messages.po
src/locales/zh-Hans/messages.po
src/locales/zh-Hant/messages.po
src/lib/i18n/loadCatalog.ts
```

### Files to surgically edit on `develop`

- `vite.config.ts` — switch to `@vitejs/plugin-react` if not already, register the Babel macro.

### Dependency changes

```
pnpm add @lingui/core @lingui/react @lingui/macro
pnpm add -D @lingui/cli @lingui/swc-plugin   # if applicable
```

## How to mark this feature completed

Standard ritual.
