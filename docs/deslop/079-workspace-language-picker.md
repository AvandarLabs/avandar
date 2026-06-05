# 079 — Workspace language picker

- **Slug**: `workspace-language-picker`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-079/workspace-language-picker`
- **Depends on**: `078-lingui-scaffold`.
- **Estimated PR size**: small — ~5 files, ~300 lines.

## Notes for future you

- Per-workspace localStorage key for language preference (not per-user, not per-tab — workspace-scoped). This is intentional — different workspaces may have different language conventions.
- Mantine `DirectionProvider` keyed on locale enables RTL for Arabic (`ar`). Don't conditionally render content for RTL — let Mantine flip CSS.

## What this feature is

A "Language" tab in Workspace Settings with a picker for the 8 locales. `WorkspaceI18nProvider` selects the catalog based on `useLanguagePreference` (per-workspace localStorage). Mantine `DirectionProvider` is keyed on locale so Arabic flips to RTL.

## Steps to migrate

**Step 0** — `/deslop undrift workspace-language-picker`.

1. Confirm #078 has merged.
2. Copy the picker tab + provider + preference hook.

### Files to copy verbatim

```
src/views/WorkspaceSettingsApp/LanguageTab.tsx
src/lib/i18n/WorkspaceI18nProvider.tsx
src/lib/i18n/useLanguagePreference.ts
```

## How to mark this feature completed

Standard ritual.
