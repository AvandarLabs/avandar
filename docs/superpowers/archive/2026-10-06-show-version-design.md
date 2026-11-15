# Show current version in Spotlight

**Status: Implemented.**

## Intent and scope

Make the running Avandar version discoverable through the existing Cmd+K
Spotlight. This is a bounded addition to the existing command list. The user
requested investigation, a written spec and plan, and implementation.

## Investigation and alternatives

`vite.config.ts` already reads the root `package.json` version and exposes it
as `import.meta.env.VITE_APP_VERSION`. `src/lib/analytics/appVersion.test.ts`
checks that these values match. Reuse this source without adding another
version constant, environment setting, or package import to browser code.

| Approach | Tradeoff |
| --- | --- |
| Spotlight command and notification (selected) | Discoverable on demand, uses existing UI. |
| Permanent sidebar label | More visible, adds persistent clutter. |
| About dialog | Extra surface for a single fact. |

## Behavior

- Add a general command labeled **Show current version**, outside Dev Actions.
- Its description is **Avandar {version}**, preserving the exact package version,
  including prerelease suffixes. It is visible when Spotlight opens and matches
  a search for `version` or the version value.
- Clicking the command or selecting it with Enter closes Spotlight and displays
  a notification titled **Current version**, with **Avandar {version}** as its
  message. Keep the notification open until dismissed so the value can be read
  and selected. Use a stable notification id to avoid stacking duplicates.
- The command is available wherever the existing workspace Spotlight is
  available, in development and production. It does not navigate or fetch data.
- The version identifies the running build. Changing package.json takes effect
  on the next dev-server start or build, using the existing Vite behavior.
- All new display copy uses the Lingui `t` macro in the hook. Version data is
  interpolated without translating or formatting it.

## Implementation boundaries

Change `src/components/layouts/RootLayout/useSpotlightActions/useSpotlightActions.tsx` and add its
colocated test. Extract the three messages into all eight Lingui catalogs and
compile them with the existing CLI. Preserve existing navigation and development actions. Use the
existing Mantine notification and Tabler icon APIs. No new dependencies,
settings page, database work, version bump, or unrelated refactor.

## Validation

Use red/green Vitest coverage through the real Spotlight and notification UI:
search for the version command, confirm the package version in its description,
activate it with Enter and by clicking, and confirm the notification contents.
Exercise the command with DEV disabled to guard production availability.
Retain the existing package-version test. Run focused ESLint, TypeScript, and
React Doctor checks; report pre-existing or environmental blockers separately.
