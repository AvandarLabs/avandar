# `shared/lib`

Anything in this directory are candidates to be extracted into their own
npm packages. Ideally, this directory should not exist because all packages
here have been moved into their own npm package in `packages/` and we can
import directly from there.

## Rules for `shared/lib`

- Nothing in this directory should ever reference any business logic.
  No Avandar-specific code or references.
- Nothing in this directory should ever import any directory outside
  of `shared/lib`
- Avoid 3rd party libraries. The bundle size of `shared/lib` should be kept to a
  minimum.
