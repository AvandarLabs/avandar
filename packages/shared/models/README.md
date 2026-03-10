# @avandar/models

This is a very lightweight library to represent data model types. It provides
core model primitives for typed, discriminated data objects.

.... keep writing....

- Clients and React hooks for data queries and mutations.

A common problem with any full-stack application is the duplication of model
type definitions in the frontend and backend and the difficulty in representing
the types once data-fetching and data-mutations are in the mix. A data model's
"Read" type is always just a _little_ different from its "Insert" type. The
amount of variants a single data model has begins to balloon.

This library is lightweight because it has minimal overhead. A data model is
represented as nothing more than an object with a `__type` string.

The power of this library isn't in enforcing any clever representation of data,
but rather in enforcing codebase conventions and patterns on how all a
model's variants (e.g. reading a model, inserting a model, updating a model)
should be represented.

These conventions provide a consistent way to define data models in a codebase,
which provides predictability for developers. This allows a data-fetching layer
to be standardized. This library provides helper functions to auto-generate a
model's client and React hooks for data queries and mutations.

## Usage

```ts
import { Model } from "@avandar/models";

// Create a model instance
const user = Model.make("User", { id: "u1", name: "Alice" });

// Pattern-match on model type
const label = Model.match(model, {
  User: (m) => m.name,
  Admin: (m) => `admin:${m.level}`,
});

// Extract an id coupled with the model type:
const typedId = Model.getTypedId(user); // { id: 'u1', __type: 'User' };
```

## Types

| Type              | Description                                         |
| ----------------- | --------------------------------------------------- |
| `Model.Base`      | Base model shape: `{ __type: string } & ModelProps` |
| `Model.Versioned` | Base model extended with a `version` field          |
| `Model.Type`      | Utility type: extracts the string type from a model |
| `Model.TypedId`   | Utility type: `{ __type, id }` picked from a model  |

## API

### `Model.make(modelType, modelProps)`

Creates a new model instance with the given type discriminator and properties.

### `Model.match(model, fns)`

Pattern-matches a model union by its `__type`, calling the corresponding
function. Throws if no branch matches.

### `Model.getTypedId(model)`

Returns `{ __type, id }` from a model, discarding all other properties.

## Scripts

| Command           | Description                  |
| ----------------- | ---------------------------- |
| `pnpm test`       | Run all tests once           |
| `pnpm test:watch` | Run tests in watch mode      |
| `pnpm type-check` | Run TypeScript type checking |

## Dependencies

### Runtime

- **type-fest** &mdash; utility types (types only, zero runtime cost)

### Development

- **vitest** &mdash; test runner
- **typescript** &mdash; type checking
