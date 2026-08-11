# Changesets

This directory configures how the `@avandar/*` libraries under `packages/` are
versioned and published. It does **not** govern the Avandar app itself: the
root `package.json` is `private`, so Changesets ignores it, and app releases
stay a manual version bump as they are today.

## Why `fixed` rather than independent

All ten libraries move as one version. They were cut from a single application
and form one tightly connected graph, so nearly every meaningful change touches
two or three of them. Independent versioning would mean maintaining a
compatibility matrix between them; `fixed` collapses that to a single rule:
`@avandar/ui@X` always works with `@avandar/utils@X`.

The cost is version churn (a package gets a bump for a change it did not
receive), which is cheap while these are pre-1.0. Revisit at 1.0 if the
packages develop genuinely separate audiences and cadences.

## Only `packages/**` is published

Everything under `apps/**` is internal to this repo and is marked
`private: true`, which is what actually prevents `pnpm publish` from sending it
to the registry. The root package is the Avandar app and is private too.

`@avandar/ava-cli` is additionally listed in `ignore` as belt-and-braces: it is
an internal CLI that was previously not private, and the extra entry means a
future edit to its `private` flag alone cannot slip it into a release.

`pnpm verify:packages` asserts this, failing if any root or `apps/**` package
is publishable.

## Workflow

1. `pnpm changeset` — describe your change and pick a bump. Because the
   packages are `fixed`, selecting any one of them bumps all of them.
2. `pnpm changeset:version` — apply pending changesets, updating versions and
   `CHANGELOG.md` files. This also rewrites `workspace:*` ranges for publish.
3. `pnpm release` — build every package, then publish.

The first publish at `0.1.0` needs no changeset: the packages already carry
that version, so it publishes what is on disk.
