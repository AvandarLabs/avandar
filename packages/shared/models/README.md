# @avandar/models

A lightweight library for representing typed, discriminated data models.
The only export is `Model`, a small bundle of helpers built around the
`__type` discriminator convention.

A model is just an object with a `__type` string and arbitrary additional
properties. The value of this library isn't in enforcing any clever
representation — it's the shared convention that lets the rest of the
Avandar packages (`@avandar/clients`, `@avandar/query-hooks`) auto-generate
parsers, CRUD clients, and React Query hooks against any model.

ESM only. Requires Node 22+.

## Install

```sh
pnpm add @avandar/models
```

`zod` is an optional peer dependency, needed only if you import
`@avandar/models/zod`.

## Entry points

| Entry                 | Contents                                           |
| --------------------- | -------------------------------------------------- |
| `@avandar/models`     | `Model` — the value helpers and the type namespace   |
| `@avandar/models/zod` | Zod schema builders for models                      |

## Usage

```ts
import { Model } from "@avandar/models";

// Create a model instance
const user = Model.make("User", { id: "u1", name: "Alice" });

// Pattern-match on a discriminated union of models
const label = Model.match(model, {
  User: (m) => m.name,
  Admin: (m) => `admin:${m.level}`,
});

// Extract the id coupled with the model type
const typedId = Model.getTypedId(user); // { id: 'u1', __type: 'User' }

// Runtime type guards
Model.isModel(value);                 // true if value has a `__type` string
Model.isOfModelType(value, "User");   // true if `__type === "User"`

// Higher-order guard for use with `.filter`, `.find`, etc.
users.filter(Model.valIsOfModelType("Admin"));
```

## API

### Constructors

#### `Model.make(modelType, modelProps)`

Returns `{ __type: modelType, ...modelProps }`. The return type carries the
literal `__type` so unions of models remain discriminated.

### Pattern matching

#### `Model.match(model, fns)`

Pattern-matches a model union by its `__type`, calling the corresponding
function. Throws if no branch matches.

```ts
type Shape = Model.Base<"Circle", { r: number }> | Model.Base<"Square", { s: number }>;
const area = Model.match(shape, {
  Circle: ({ r }) => Math.PI * r * r,
  Square: ({ s }) => s * s,
});
```

### Identity helpers

#### `Model.getTypedId(model)`

Returns `{ __type, id }` from a model with an `id` property, discarding
every other property. Useful for keying lookups or passing references.

### Type guards

| Function                              | Returns                                     |
| ------------------------------------- | ------------------------------------------- |
| `Model.isModel(val)`                  | `val is Model.Base`                         |
| `Model.isOfModelType(val, modelType)` | `val is Model.Base<modelType>`              |
| `Model.valIsOfModelType(modelType)`   | Curried guard for `.filter` / `.find` calls |

## Types

| Type              | Description                                                                  |
| ----------------- | ---------------------------------------------------------------------------- |
| `Model.Base<T,P>` | Base model shape: `{ __type: T } & P` (defaults: `string`, `EmptyObject`)    |
| `Model.Versioned` | Base model extended with a numeric `version` field                           |
| `Model.Type<M>`   | Utility type: extracts the `__type` string literal from a model              |
| `Model.TypedId<M>`| Utility type: `{ __type, id }` picked from a model with an `id` property     |


## Dependencies

### Runtime

- **type-fest** &mdash; utility types (types only, zero runtime cost)

### Development

- **vitest** &mdash; test runner
- **typescript** &mdash; type checking

## License

MIT
