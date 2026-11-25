# @avandar/clients

## 0.3.0

### Minor Changes

- feat(filters): match an empty column with is null (e89d8cc)

- feat(clients): order a page when the caller names columns (f635735)

### Patch Changes

- chore(lint): replace eslint directives with canonical oxlint rules (605670e)

- fix(clients): stop filter iteration from depending on shared columns (b621082)

- [`cd8ee49`](https://github.com/AvandarLabs/avandar/commit/cd8ee49aa0a1566581544aec866e5670ebfc9243) Thanks [@jpsyx](https://github.com/jpsyx)! - `createSupabaseCrudClient` no longer relies on a column every registered table shares when it iterates filters, so it type-checks once a table has no column in common with the rest.

- Updated dependencies []:
  - @avandar/modules@0.3.0
  - @avandar/utils@0.3.0
  - @avandar/logger@0.3.0

## 0.2.0

### Minor Changes

- Replace prettier with oxfmt ([#289](https://github.com/AvandarLabs/avandar/issues/289))

### Patch Changes

- Updated dependencies []:
  - @avandar/utils@0.2.0
  - @avandar/modules@0.2.0
  - @avandar/logger@0.2.0

## 0.1.2

### Patch Changes

- [#263](https://github.com/AvandarLabs/avandar/pull/263) [`622af13`](https://github.com/AvandarLabs/avandar/commit/622af13dcf5410ff1da158750b19581c33793b69) Thanks [@jpsyx](https://github.com/jpsyx)! - `makeParserRegistry` now tolerates sparse DBRead rows. An object `DBReadSchema`
  field typed `X | undefined` no longer fails to parse when the stored row omits
  the key entirely, which is what document stores hand back: the registry's own
  `fromModelInsertToDBInsert` strips `undefined` values before writing, and
  Dexie's `Table.update` deletes a property whose new value is `undefined`.
- Updated dependencies []:
  - @avandar/logger@0.1.2
  - @avandar/modules@0.1.2
  - @avandar/utils@0.1.2

## 0.1.1

### Patch Changes

- [`77b4eda`](https://github.com/AvandarLabs/avandar/commit/77b4eda7b1f18c333cac890d54d9d077ce651f76) Thanks [@jpsyx](https://github.com/jpsyx)! - Publish over npm trusted publishing (OIDC) instead of a long-lived npm token.
  No functional or API changes; package contents are identical to 0.1.0.
- Updated dependencies [[`77b4eda`](https://github.com/AvandarLabs/avandar/commit/77b4eda7b1f18c333cac890d54d9d077ce651f76)]:
  - @avandar/logger@0.1.1
  - @avandar/modules@0.1.1
  - @avandar/utils@0.1.1
