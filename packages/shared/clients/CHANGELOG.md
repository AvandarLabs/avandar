# @avandar/clients

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
