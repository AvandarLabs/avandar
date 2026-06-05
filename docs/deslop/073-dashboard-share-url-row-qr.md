# 073 — Share URL row + QR

- **Slug**: `dashboard-share-url-row-qr`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-073/dashboard-share-url-row-qr`
- **Depends on**: `072-dashboard-vanity-url`.
- **Estimated PR size**: small — ~3 files + `qrcode` dep, ~250 lines.

## Notes for future you

- QR generation is **client-side** (`qrcode` lib). No network call. Don't add a server endpoint for QR generation.
- 256×256 PNG download. Don't make it user-configurable for now — the spec is opinionated about the size.

## What this feature is

A `ShareUrlRow` component shows the canonical published URL + the vanity URL side by side, each with a copy button. Adds a downloadable 256×256 QR code PNG (generated client-side via `qrcode`) for the vanity URL.

## Steps to migrate

**Step 0** — `/deslop undrift dashboard-share-url-row-qr`.

1. Confirm #072 has merged.
2. Add `qrcode` dep.
3. Copy the `ShareUrlRow` component.

### Files to copy verbatim

```
src/components/ShareUrlRow/ShareUrlRow.tsx
src/components/ShareUrlRow/ShareUrlRow.module.css
```

### Dependency changes

```
pnpm add qrcode
```

## How to mark this feature completed

Standard ritual.
