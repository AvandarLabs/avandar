# 090 — Profile page redesign

- **Slug**: `profile-page-redesign`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-090/profile-page-redesign`
- **Depends on**: `none`
- **Estimated PR size**: medium — ~5 files, +257 / -79 lines.

## Notes for future you

- Merge commit `20cfc1b` brought this row's diff plus `.agents/skills/` files (tooling noise — explicitly **not** in scope here).
- `UserClient.updateProfile` is a new mutation for workspace-scoped display name. Wire it where the old display-name update was inline.
- Typography in the workspace-name dropdown is normalized in the same pass.

## What this feature is

Redesigned profile page using `AppLayout` and a sectioned identity / account / security layout. New `UserClient.updateProfile` mutation for workspace-scoped display name. Typography normalized in the workspace-name dropdown.

## Steps to migrate

**Step 0** — `/deslop undrift profile-page-redesign`.

1. Create the refactor branch.
2. Apply the diff from merge commit `20cfc1b` **scoped to `src/routes/_auth/$workspaceSlug/profile.tsx` and related UI files**. Exclude any `.agents/skills/` file changes.

### Files to surgically edit on `develop`

- `src/routes/_auth/$workspaceSlug/profile.tsx`
- `src/clients/users/UserClient.ts` — add `updateProfile` mutation.
- Workspace-name dropdown typography file.

## How to mark this feature completed

Standard ritual.
