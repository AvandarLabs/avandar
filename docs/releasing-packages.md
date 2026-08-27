# Releasing the `@avandar/*` packages

How the ten libraries under `packages/` get to npm. This does **not** cover
releasing the Avandar app, which is still a manual version bump in the root
`package.json`.

## One-time setup (not yet done)

These require a human with npm and GitHub admin access.

**The end state is trusted publishing, not a token.** npm authenticates the
workflow over OIDC, so there is no credential to store, rotate, or leak, and
provenance is automatic. `release-packages.yaml` already grants the
`id-token: write` permission this needs.

Trusted publishing is configured per package, on that package's settings page,
which does not exist until the package does. So the ten packages need one
token-authenticated publish to bring them into existence, and then the token is
thrown away. Check the npm UI first in case pre-registering a publisher for an
unpublished name is now possible; if it is, skip straight to step 3 and never
create a token at all.

1. **Create a short-lived npm token.** On npmjs.com, under the `@avandar` org,
   create a **Granular Access Token** scoped to `@avandar/*` with read and
   write permission, and set the **shortest expiry offered**. npm caps write
   tokens at 90 days, but this one only has to survive a single publish, so
   pick days rather than months. It needs the 2FA bypass to work unattended.
2. **Add it to GitHub** as a repository secret named `NPM_TOKEN`: Settings →
   Secrets and variables → Actions → New repository secret. Then run the first
   publish (see [The first publish](#the-first-publish-010)).
3. **Configure trusted publishing on all ten packages.** On each package's
   npmjs.com settings page, add a GitHub Actions trusted publisher pointing at
   `AvandarLabs/avandar` and workflow `release-packages.yaml`.
4. **Remove the token.** Delete the `NPM_TOKEN` secret from GitHub, delete the
   `NODE_AUTH_TOKEN` line from `release-packages.yaml`, and revoke the token on
   npm. Keep `id-token: write`; that is what authenticates from here on.

Do not skip step 4 and leave the token in place. A write token cannot be made
permanent, so the release job would fail with `E401` roughly 90 days later, on
`develop`, long after anyone would connect the failure to a token they no
longer remember creating. If you ever do see `E401` at the publish step, an
expired token is the first thing to check.

**Also check the org's 2FA setting.** If the `@avandar` org requires 2FA for
publishing, automation tokens are rejected outright and step 1 cannot work.
Either allow automation tokens or go straight to trusted publishing.

**Consuming repos:** any repo that installs these packages *and* sets
`minimumReleaseAge` must add `@avandar/*` to `minimumReleaseAgeExclude`, or a
freshly published version is unresolvable there for three days. This repo
already has that entry.

Nothing publishes until either `NPM_TOKEN` exists or trusted publishing is
configured. Until then the release workflow runs and fails at the publish step,
which is the intended safe default.

One caveat on the token path: `changeset publish` shells out to the package
manager rather than calling the registry itself. If OIDC misbehaves through the
changesets/pnpm chain, a granular token is the fallback, which is the other
reason step 1 exists.

## Normal release flow

1. **Write a changeset with your change.**

   ```sh
   pnpm changeset
   ```

   Pick the bump type and describe the change in a sentence a consumer would
   understand. The packages are in a `fixed` group, so selecting any one of
   them bumps all ten together. Commit the generated file in `.changeset/`
   alongside your code.

2. **Merge to `develop`.** The `release-packages` workflow opens (or updates)
   a PR titled "Release: @avandar packages" that applies the pending
   changesets, bumps versions, and writes `CHANGELOG.md` files.

   Changelogs use `@changesets/changelog-github`, so each entry links back to
   its PR and author. That generator calls the GitHub API during
   `changeset version`, which is why versioning belongs in CI: the workflow
   already has `GITHUB_TOKEN` in scope. Running `pnpm changeset:version`
   locally requires a `GITHUB_TOKEN` in your environment.

3. **Review and merge that PR.** This is the deliberate human gate. Merging it
   re-runs the workflow, which now finds no pending changesets and publishes.

Before either step the workflow runs `pnpm type-check`, the package tests, and
`pnpm verify:packages`. A failure at any of those stops the release.

## The first publish (0.1.0)

The packages already carry `0.1.0`, so the first release needs no changeset.
Once `NPM_TOKEN` is in place, publish once by hand:

```sh
pnpm verify:packages     # build + pack + publint + attw
pnpm release             # build:packages && changeset publish
```

Then confirm it from outside the monorepo, which is the only way to exercise
the published `exports`:

```sh
mkdir /tmp/consume && cd /tmp/consume && npm init -y
npm install @avandar/utils
node -e 'import("@avandar/utils").then(m => console.log(m.capitalize("ok")))'
```

Publish order matters on a cold registry: a package cannot install until its
`@avandar/*` dependencies exist. `changeset publish` handles this, but if you
publish by hand, follow the dependency graph — `utils`, `browser-utils`, and
`hooks` first, then `models`/`modules`, then `logger`, then `clients`/`etl`,
then `ui`, then `query-hooks`.

## Verifying packages locally

```sh
pnpm verify:packages
```

Builds every package, packs it with `pnpm pack`, then runs `publint` and
`arethetypeswrong` against the resulting tarball. Also runs in PR CI.

Two things worth knowing about that script:

- It uses **`pnpm pack`, never `npm pack`.** `publishConfig` hoisting and
  `workspace:*` rewriting are pnpm features. `npm pack` produces a tarball
  still pointing at `src/`, and `attw --pack` (which shells out to npm) will
  report total resolution failure for a perfectly healthy package.
- It ignores the `no-resolution` and `cjs-resolves-to-esm` attw rules. Those
  are `node10` and `require`-from-CJS failures, which are the intended
  consequence of shipping ESM-only.

This tarball check is not ceremony. It has already caught a `zod` import
leaking into published type declarations (breaking every consumer without zod)
and a package whose declarations were unresolvable under Node's `node16`
resolution.

## Things that are easy to get wrong

- **`workspace:*` stays in the repo.** pnpm rewrites it to the real version at
  pack time. If you see `workspace:*` in a published tarball, something packed
  with npm instead of pnpm.
- **`catalog:` must never appear in `peerDependencies`.** pnpm expands it on
  publish, which would pin consumers to our exact version instead of a range.
  Use `catalog:` in `dependencies`/`devDependencies` only.
- **Provenance needs the `repository` field**, including `directory` for a
  monorepo. Every package has one; removing it breaks `--provenance`.
- **Only `packages/**` is ever published.** Everything under `apps/**` is
  internal, including `@avandar/ava-cli`, and every one of them is
  `private: true`. That flag, not the Changesets `ignore` list, is what stops
  `pnpm publish` reaching the registry. `pnpm verify:packages` asserts it and
  fails if a root or `apps/**` package becomes publishable, so a newly added
  app cannot quietly slip into a release.
