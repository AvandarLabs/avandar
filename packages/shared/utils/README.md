# @avandar/utils

A package of common utility functions with no business logic. These are
general-purpose, tree-shakeable TypeScript utilities that can be dropped
into any project.

Runtime dependencies are kept minimal — small, well-maintained libraries
are used only when reimplementing them would be impractical.

ESM only. Requires Node 22+.

## Install

```sh
pnpm add @avandar/utils
```

`zod` is an optional peer dependency, needed only if you import
`@avandar/utils/zod`.

## Entry points

| Entry                    | Contents                                        |
| ------------------------ | ----------------------------------------------- |
| `@avandar/utils`         | The general-purpose utilities                    |
| `@avandar/utils/encoding`| Base64 / byte-array helpers                      |
| `@avandar/utils/sql`     | SQL identifier and literal helpers               |
| `@avandar/utils/zod`     | `ZodSchemaEqualsTypes`, a zod schema type-test    |

The zod helper lives behind its own entry so the core entry carries no zod
dependency: a top-level zod import in the published types would break every
consumer that does not use zod.

## Usage

All utilities are exported from the package root:

```ts
import { isDefined, objectKeys, pick, capitalize } from "@avandar/utils";
```

---

## Arrays

| Export        | Description                                                                       |
| ------------- | --------------------------------------------------------------------------------- |
| `splitArray`  | Splits an array into chunks by a size or predicate                                |
| `append`      | Higher-order function: returns a function that appends a value to an array        |

## Asserts

Runtime assertion helpers. They throw with a useful message and narrow the
type of the asserted value for the rest of the scope.

| Export                     | Asserts                                                       |
| -------------------------- | ------------------------------------------------------------- |
| `assert`                   | A boolean condition is true                                   |
| `assertIsDefined`          | A value is not `undefined`                                    |
| `assertIsNonNullish`       | A value is not `null` or `undefined`                          |
| `assertIsNonEmptyArray`    | A value is an array with at least one element                 |
| `assertIsSingletonArray`   | A value is an array with exactly one element                  |

## Dates

| Export                | Description                                                                     |
| --------------------- | ------------------------------------------------------------------------------- |
| `formatDate`          | Formats a `Date`, ISO string, or epoch ms using a dayjs-compatible format       |
| `parseDate`           | Parses common date inputs (`Date`, ISO string, epoch ms) into a `Date`          |
| `FormattableTimezone` | Type alias for the supported timezone strings                                   |

## Numbers

| Export                | Description                                                                     |
| --------------------- | ------------------------------------------------------------------------------- |
| `formatNumber`        | Formats a number with locale, precision, sign display, and grouping options     |
| `FormatNumberOptions` | Options accepted by `formatNumber`                                              |
| `SignDisplay`         | The `signDisplay` option type                                                   |
| `toFiniteNumber`      | Coerces an unknown value to a finite number, or `undefined`                     |

## Strings

| Export             | Description                                                                       |
| ------------------ | --------------------------------------------------------------------------------- |
| `capitalize`       | Uppercases the first character of a string                                        |
| `sortStrings`      | Returns a new array of strings sorted with a locale-aware comparator              |
| `stringComparator` | The locale-aware comparator used by `sortStrings`                                 |
| `toPascalCase`     | Converts any string to `PascalCase`                                               |
| `toSnakeCase`      | Converts any string to `snake_case`                                               |
| `prefix`           | Higher-order function: returns a function that prepends a string                  |
| `template`         | Tagged-template helper for interpolated strings                                   |
| `sqlTemplate`      | Tagged-template helper specialised for SQL fragments                              |
| `unknownToString`  | Stringifies any value safely (objects, errors, primitives), with pretty-print opt |

## Filters

A small composable filtering DSL used across Avandar data clients to
express row-level predicates.

| Export                       | Description                                                              |
| ---------------------------- | ------------------------------------------------------------------------ |
| `applyFiltersToRows`         | Filters an array of rows against a filter object                         |
| `doesRowPassFilters`         | Predicate: does a single row pass a filter object?                       |
| `doesValuePassFilters`       | Predicate: does a single value pass an operator-based filter set?        |
| `bucketFiltersByColumn`      | Groups filters by their target column                                    |
| `bucketFiltersByOperator`    | Groups filters by their operator                                         |
| `isArrayValueOperator`       | Type guard for operators that take an array value (e.g. `in`)            |
| `isSingleValueOperator`      | Type guard for operators that take a scalar value                        |
| `isEmptyFiltersObject`       | Type guard for an empty filters object                                   |
| `isFiltersByColumnObject`    | Type guard for the by-column shape                                       |
| `isFiltersByOperatorObject`  | Type guard for the by-operator shape                                     |
| `where`                      | Builder for a filters-by-column object with type-safe keys               |

### Filter types

| Type                     | Description                                          |
| ------------------------ | ---------------------------------------------------- |
| `FilterOperator`         | Union of every supported operator string             |
| `FilterOperatorRecord`   | A `{ operator: value }` record                       |
| `FiltersByColumn<Row>`   | `{ [column]: FilterOperatorRecord }` filter shape    |
| `FiltersByOperator<Row>` | `{ [operator]: { [column]: value } }` filter shape   |

## Guards

Type guard functions. Each returns a `value is T` predicate so TypeScript
narrows the value in the matching branch.

| Export             | Narrows to                                                       |
| ------------------ | ---------------------------------------------------------------- |
| `isArray`          | `unknown[]`                                                      |
| `isBoolean`        | `boolean`                                                        |
| `isDate`           | `Date`                                                           |
| `isDefined`        | `Exclude<T, undefined>`                                          |
| `isEmptyObject`    | `EmptyObject`                                                    |
| `isEpochMs`        | A number that looks like an epoch-ms timestamp                   |
| `isFunction`       | `Function`                                                       |
| `isISODateString`  | A string parseable as an ISO date                                |
| `isNonEmptyArray`  | A non-empty tuple type                                           |
| `isNonNullish`     | `NonNullable<T>`                                                 |
| `isNull`           | `null`                                                           |
| `isNotNull`        | `Exclude<T, null>`                                               |
| `isNullish`        | `null \| undefined`                                              |
| `isNumber`         | `number` (excludes `NaN`)                                        |
| `isPlainObject`    | A plain `{}` (not an array, Date, class instance, etc.)          |
| `isPrimitive`      | `string \| number \| boolean \| bigint \| symbol`                |
| `isString`         | `string`                                                         |
| `isUndefined`      | `undefined`                                                      |
| `isValidDateValue` | Anything `parseDate` would accept                                |
| `hasDefinedProps`  | A record where the listed keys are non-`undefined`               |

### Higher-order guards

| Export     | Description                                                              |
| ---------- | ------------------------------------------------------------------------ |
| `valEq`    | `(target) => (value) => value === target`                                |
| `valNotEq` | `(target) => (value) => value !== target`                                |

## Maps

Builders for `Map` instances from collections.

| Export            | Description                                                             |
| ----------------- | ----------------------------------------------------------------------- |
| `makeMap`         | Builds a `Map<K, V>` from a list with key/value selector functions      |
| `makeIdLookupMap` | Builds a `Map` keyed by each item's `id` property                       |
| `makeBucketMap`   | Builds a `Map<K, V[]>` of items grouped by a key selector               |
| `mergeBucketMaps` | Merges multiple bucket maps, concatenating each key's arrays            |

## Objects

### Operations

| Export                | Description                                                                   |
| --------------------- | ----------------------------------------------------------------------------- |
| `objectKeys`          | Typed `Object.keys` (returns the key union, not `string[]`)                   |
| `objectValues`        | Typed `Object.values`                                                         |
| `objectEntries`       | Typed `Object.entries`                                                        |
| `objectValuesMap`     | Maps over an object's values, returning a new object with the same keys      |
| `pick`                | Returns a new object with only the listed keys                                |
| `omit`                | Returns a new object without the listed keys                                  |
| `getValue`            | Reads a nested value by dot-notation `keyPath`                                |
| `setValue`            | Returns a new object with a value set at a dot-notation `keyPath`             |
| `makeObject`          | Builds an object from a list with key/value selectors                         |
| `makeObjectFromEntries` | Typed `Object.fromEntries`                                                  |
| `makeIdLookupRecord`  | Builds a `Record` keyed by each item's `id` property                          |
| `makeBucketRecord`    | Builds a `Record<K, V[]>` of items grouped by a key selector                  |
| `objectToPrettyString`| Stringifies an object with indentation and sorted keys                        |
| `registry`            | Constructs a frozen registry record with helper accessors                     |
| `sortObjList`         | Sorts an array of objects by one or more keys with a mixed-type comparator    |
| `mixedComparator`     | Locale-aware comparator that handles strings, numbers, dates, and nullish     |

### Case conversion

| Export                  | Description                                                              |
| ----------------------- | ------------------------------------------------------------------------ |
| `camelCaseKeys`         | Recursively converts object keys to `camelCase` (alias for deep variant) |
| `camelCaseKeysDeep`     | Recursively converts object keys to `camelCase`                          |
| `camelCaseKeysShallow`  | Converts only top-level object keys to `camelCase`                       |
| `snakeCaseKeys`         | Recursively converts object keys to `snake_case` (alias for deep variant)|
| `snakeCaseKeysDeep`     | Recursively converts object keys to `snake_case`                         |
| `snakeCaseKeysShallow`  | Converts only top-level object keys to `snake_case`                      |

### Deep transforms

| Export                    | Description                                                            |
| ------------------------- | ---------------------------------------------------------------------- |
| `excludeDeep`             | Recursively removes values that match a predicate                      |
| `excludeNullsDeep`        | Recursively removes `null` values                                      |
| `excludeNullsIn`          | Removes `null` values at the top level                                 |
| `excludeNullsExceptIn`    | Removes `null` values except in the listed keys                        |
| `excludeUndefinedDeep`    | Recursively removes `undefined` values                                 |
| `excludeUndefinedShallow` | Removes `undefined` values at the top level                            |
| `nullsToUndefinedDeep`    | Recursively converts `null` to `undefined`                             |
| `undefinedsToNullsDeep`   | Recursively converts `undefined` to `null`                             |
| `coerceDatesIn`           | Coerces ISO date strings to `Date` instances in the listed keys        |
| `convertDatesToISOIn`     | Converts `Date` instances to ISO strings in the listed keys            |
| `swapDeep`                | Recursively swaps every matching value for a replacement               |

### Higher-order functions

Curried variants that return a function. Convenient for `.map`, `.filter`,
and `pipe`.

| Export                       | Description                                                          |
| ---------------------------- | -------------------------------------------------------------------- |
| `prop`                       | `(key) => (obj) => obj[key]`                                         |
| `propEq`                     | `(key, value) => (obj) => obj[key] === value`                        |
| `propNotEq`                  | `(key, value) => (obj) => obj[key] !== value`                        |
| `propIsDefined`              | `(key) => (obj) => obj[key] !== undefined`                           |
| `propIsInArray`              | `(key, values) => (obj) => values.includes(obj[key])`                |
| `propPasses`                 | `(key, predicate) => (obj) => predicate(obj[key])`                   |
| `pickProps`                  | `(...keys) => (obj) => pick(obj, keys)`                              |
| `omitProps`                  | `(...keys) => (obj) => omit(obj, keys)`                              |
| `setPropValue`               | `(key, value) => (obj) => ({ ...obj, [key]: value })`                |
| `coerceDatesInProps`         | Curried variant of `coerceDatesIn`                                   |
| `convertDatesToISOInProps`   | Curried variant of `convertDatesToISOIn`                             |
| `excludeNullsInProps`        | Curried variant of `excludeNullsIn`                                  |
| `excludeNullsExceptInProps`  | Curried variant of `excludeNullsExceptIn`                            |

## Misc

| Export     | Description                                                                  |
| ---------- | ---------------------------------------------------------------------------- |
| `constant` | `(value) => () => value` — returns a function that always returns `value`    |
| `identity` | `(value) => value`                                                           |
| `noop`     | A no-op function                                                             |
| `sleep`    | Promise-based delay (`sleep(ms)`)                                            |
| `traverse` | Walks a tree, invoking a callback on each node                               |
| `pipe`     | Left-to-right function composition (`pipe(f, g, h)(x) === h(g(f(x)))`)        |

## Constants

| Export     | Description                                       |
| ---------- | ------------------------------------------------- |
| `MIMEType` | Frozen registry of commonly used MIME type strings |

## Types

### Common

| Type                  | Description                                                      |
| --------------------- | ---------------------------------------------------------------- |
| `UUID<Brand>`         | Branded UUID string                                              |
| `Brand<T, B>`         | Brand a base type with a unique tag                              |
| `UnknownObject`       | `Record<string, unknown>`                                        |
| `UnknownArray`        | `unknown[]`                                                      |
| `UnknownDataFrame`    | An array of `RawDataRow` objects                                 |
| `EmptyObject`         | Re-export of `type-fest`'s `EmptyObject`                          |
| `JSONValue`           | Any JSON-serialisable value                                      |
| `JSONLiteral`         | A JSON primitive                                                 |
| `RawCellValue`        | A primitive cell value                                           |
| `RawDataRow`          | A `{ [column]: RawCellValue }` row                               |
| `RawDataArrayRow`     | An array-of-cells row                                            |
| `IExternalStore`      | Generic `subscribe`/`getSnapshot` external store interface       |

### Utility types

| Type                       | Description                                                          |
| -------------------------- | -------------------------------------------------------------------- |
| `StringKeyOf<T>`           | The string-only key union of `T`                                     |
| `CamelCase<S>`             | Type-level camelCase conversion                                      |
| `SnakeCase<S>`             | Type-level snake_case conversion                                     |
| `CamelCaseKeys<T>`         | Deeply camelCase the keys of `T`                                     |
| `SnakeCaseKeys<T>`         | Deeply snake_case the keys of `T`                                    |
| `Entries<T>`               | The typed entries tuple union of `T`                                 |
| `Unbrand<T>`               | Strips a brand off a branded type                                    |
| `ExcludeDeep<T, U>`        | Recursively excludes `U` from `T`                                    |
| `ExcludeNullsIn<T, K>`     | Excludes `null` from values at the listed keys                       |
| `ExcludeNullsExceptIn<T, K>` | Excludes `null` everywhere except the listed keys                  |
| `ExcludeUndefinedShallow<T>` | Excludes `undefined` from the top-level values of `T`              |
| `SwapDeep<T, From, To>`    | Recursively swaps `From` for `To`                                    |
| `UndefinedToNullDeep<T>`   | Recursively replaces `undefined` with `null`                         |
| `NullToUndefinedDeep<T>`   | Recursively replaces `null` with `undefined`                         |
| `PathValue<T, P>`          | Resolves the value type at dot-notation path `P`                     |
| `AnyFunction`              | Any function signature                                               |
| `AnyFunctionWithReturn<R>` | Any function returning `R`                                           |
| `AnyFunctionWithArguments<A>` | Any function with argument tuple `A`                              |
| `AnyFunctionWithSignature<A, R>` | Any function with signature `(...A) => R`                      |
| `FirstParameter<F>`        | The first parameter type of a function                               |
| `TailParameters<F>`        | All parameters except the first                                      |
| `IdentityFnType<T>`        | `(t: T) => T`                                                        |
| `ElementOf<A>`             | The element type of an array/tuple                                   |
| `SetDefined<T, K>`         | Makes the listed keys required and non-`undefined`                   |
| `ReplaceTypes<T, From, To>`| Replaces every property of type `From` with `To`                     |
| `Registry<K, V>`           | A `Record<K, V>` registry                                            |
| `RegistryOfArrays<K, V>`   | A `Record<K, V[]>` registry                                          |
| `ObjectRegistry<...>`      | A registry of objects keyed by a discriminator                       |
| `MergeObjects<A, B>`       | Recursively merges two object types                                  |

### Test-only types

Re-exported for use in `*.test-d.ts` / `*.types.test.ts` files.

| Type                    | Description                                              |
| ----------------------- | -------------------------------------------------------- |
| `IsEqual<A, B>`         | `true` if `A` and `B` are structurally equal             |
| `IsArray<T>`            | `true` if `T` is an array                                |
| `And<A, B>`             | Boolean conjunction on type literals                     |
| `Not<A>`                | Boolean negation on type literals                        |
| `Expect<T extends true>`| Type-level assertion                                     |
| `ZodSchemaEqualsTypes`  | Asserts a Zod schema matches the given input/output types |


## Dependencies

### Runtime

- **dayjs** &mdash; date formatting and timezone support
- **ts-pattern** &mdash; exhaustive pattern matching
- **type-fest** &mdash; utility types (types only, zero runtime cost)

### Development

- **vitest** &mdash; test runner
- **typescript** &mdash; type checking
- **zod** &mdash; used only in type-level test utilities

## License

MIT
