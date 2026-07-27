# Diff Group File Scrolling Design

## Problem

The diff web shell renders each guide group as an expandable accordion. An
expanded group body currently has a fixed `560px` maximum height and clips
overflow. Groups with enough files therefore lose rows below that limit even
though the surrounding sidebar itself is scrollable.

## Approved Behavior

Each expanded group's file list will be its own vertical scroll area:

- The group heading and orientation remain visible while its files scroll.
- The file list uses a viewport-relative `45vh` maximum height so it remains
  usable across browser sizes.
- Horizontal overflow remains hidden.
- Scroll chaining remains available at the file-list boundary so the reviewer
  can continue scrolling the surrounding sidebar.
- Collapsing and expanding a group keeps the existing accordion behavior.

## Implementation

The change belongs in the web shell stylesheet. The `.files` container will
receive `max-height: 45vh`, `overflow-y: auto`, and `overflow-x: hidden`. The
expanded `.grp-body` cap will become `calc(45vh + 40px)` so the file-list
viewport and one-line orientation both remain accessible. No JavaScript or
data-model changes are needed.

The existing web-shell asset integration test will first gain an assertion for
the group file-list scroll contract. The assertion will be run before the CSS
change to demonstrate the clipping regression, then again after the CSS change
to prove the fix.

## Documentation

`scripts/dif/docs/web-shell.md` will state that every expanded group has an
independently scrollable, viewport-capped file list. This keeps the documented
user-visible behavior aligned with the web shell.

## Verification

Run the focused web-shell integration test:

```sh
cargo test --release --test web_shell serves_shell_assets_and_fails_soft_without_difit
```

Then run the crate's complete release test suite:

```sh
cargo test --release
```
