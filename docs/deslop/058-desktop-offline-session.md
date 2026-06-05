# 058 — Desktop offline session

- **Slug**: `desktop-offline-session`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-058/desktop-offline-session`
- **Depends on**: `056-desktop-platform-registry`, `057-desktop-web-platform-impls`.
- **Estimated PR size**: medium — ~5 files, ~450 lines.

## Notes for future you

- Cached access tokens live in the OS keychain — never in localStorage / IndexedDB. This is a security boundary.
- `signOut` must clear **both** keychain entries (refresh token + access token). A partial clear is a session-leak bug.
- See `docs/demo-features/desktop-offline-session.md` on the source branch for the full design.

## What this feature is

`AuthClient` gets a desktop polyfill that routes through the keychain-backed `DesktopAuthProvider`. Cached access token survives offline relaunch — the user can open the app without internet and the prior session resumes. `signOut` clears both keychain entries (refresh + access).

## Steps to migrate

**Step 0** — `/deslop undrift desktop-offline-session`.

1. Confirm #056 + #057 have merged.
2. Copy the auth polyfill + DesktopAuthProvider + keychain bindings.

### Files to copy verbatim

```
src/lib/auth/desktop/DesktopAuthProvider.ts
src/lib/auth/desktop/keychainBindings.ts
bun/auth/registerAuthHandlers.ts (or similar bun-side handler)
shared/contracts/AuthContracts.ts
```

### Files to surgically edit on `develop`

- `AuthClient` (or its provider entry) — branch on platform.

## Verification

Manual: build the desktop app, log in online, kill network, relaunch — should still be logged in. Then `signOut`; relaunch — should land at login.

## How to mark this feature completed

Standard ritual.
