# TypeScript rules

## Runtime coexistence: Browser, Node, and Deno

- This repo has shared code among browser, Node, and Deno runtimes.
- Because of Deno, any code reachable by Deno must import files with their extensions.

  Example:

  ```ts
  // Good - includes .ts extension
  import { foo } from "some/path/to/foo.ts";
  ```

  Deno-reachable paths include:
  `supabase/functions/`, `shared/` and `packages/shared/`

## General Code Style & Formatting

- Use JSDoc to document public classes and methods.
- JSDoc on functions should describe what the function is: its purpose and
  output at a high level. Do not use function JSDoc to explain interior
  implementation details, sequencing, branching, or helper mechanics. Use `//`
  comments inside the function body when a reader needs to understand how the
  function works. Exception: a function JSDoc may mention complex or
  unconventional architectural/design decisions only when understanding those
  decisions is crucial to developers using the function.
- Do not use file-level comments in a file that has a main export. A file-level
  comment is a detached block comment that describes the file as a whole rather
  than a specific member; it counts as file-level whether it sits at the very
  top of the file or just below the import block. Document the file's members
  directly instead: attach JSDoc to each exported member, and fold any
  whole-file purpose or design context into the JSDoc of the main export (the
  member the file is named after). The main export must always carry its own
  block comment. IDE intellisense surfaces member comments, not detached file
  headers, so a file-level block leaves the real API undocumented in the editor.
- Exception: a file that has no main export may use a file-level comment to
  describe the whole file. "Main export" means the export whose name matches the
  file name; when none exists, a file-level comment is the right home for
  whole-file context. This covers test files (no export named after the file, so
  a header describing the suite is expected), and files that are a collection of
  same-kind exports with no single primary one (a `*.types.ts` type collection, a
  `*.constants.ts` bundle, or a group of sibling helpers).
- Comments describe the present, never the past. Do not write what a file,
  function, type, or module *used to* do, what it was renamed from, what an
  earlier implementation looked like, or why it was changed. Git history already
  records that. A reader gets no help from it and has to work out which half of
  the comment still applies, and the claim rots as soon as the next change
  lands. Describe only the code as it exists today.

  This is bad:

  ```ts
  /**
   * Formats a row for display.
   *
   * This used to take the whole table and format every row, but that was slow
   * on large datasets, so now it only takes one row.
   */
  export function formatRow(row: Row): string {}
  ```

  This is good:

  ```ts
  /** Formats a single row for display. */
  export function formatRow(row: Row): string {}
  ```

- Exception: document a superseded approach when it is the more intuitive one
  and a future developer is likely to reach for it again. Write it as a warning
  about the present, not as history: say not to do X because it fails in way Y.
  Never phrase it as "we used to do X". The test is whether the sentence still
  reads correctly to someone who has never seen the old code.

  This is bad (history, and useless to a reader who never saw the old code):

  ```ts
  /**
   * Reads the workspace id from the route.
   *
   * We used to read it from the session, but that broke on hard refresh.
   */
  export function useWorkspaceId(): string {}
  ```

  This is good (a warning that stands on its own):

  ```ts
  /**
   * Reads the workspace id from the route.
   *
   * Do not read it from the session instead: the session is not yet populated
   * on a hard refresh, so the first render would get `undefined`.
   */
  export function useWorkspaceId(): string {}
  ```

- **Use functional and declarative programming patterns.**
  - Avoid classes or imperative programming patterns.
  - Use higher-order functions (map, filter, reduce).
  - Avoid `for` and `while` loops.
- Use named exports instead of default exports.
- Limit comments to 80 characters per line.
- If a docstring fits in 80 characters, then single-line it. Example:

  ```ts
  /** My single-line comment less than 80 characters*/.
  ```

- Never use single-line `if`s. Always use opening `{` and closing `}` even if
  there is only one statement to wrap. Examples:

  ```ts
  // Bad - inline if
  if (someCondition) doSomething();

  // Good - wrapped in braces
  if (someCondition) {
    doSomething();
  }
  ```

- Use string interpolation instead of concatenation. Examples:

  ```ts
  // Bad - concatenating with +
  const myString = "Hello, " + name;

  // Good - interpolation
  const myString = `Hello ${name}`;
  ```

## Naming Conventions

- Use PascalCase for React components, classes, singleton class instances, or
  objects representing modules, namespaces, or static singletons.
- Use camelCase for variables, functions, and methods.
- Use UPPERCASE for environment variables or hard-coded constants.
- Event handlers should be prefixed with `on` (E.g. Good: `onSubmit`) instead of
  `handle` (e.g. Bad: `handleSubmit`).
- Prefix non-exported top-level helper functions with an underscore.
  Example:

  ```ts
  function _doSomething(): void {} // <-- prefixed with _

  export function exportedFunction(): void {
    _doSomething();
  }
  ```

- Always name a React component's props just `Props`. Do not name props after
  the component, such as `MyComponentProps`.
- Name a function `resolve...` when it turns a reference, id, or otherwise
  incomplete description of a thing into the concrete thing it denotes, using
  surrounding context to do so. A reader should expect three things from the
  name: the input is indirect (an id, a key, a partial config, an ambiguous
  user input), the lookup can legitimately come up empty, and so the return
  type is the concrete value or `undefined` (unless a documented default
  always applies). Resolution is a pure read: a `resolve...` function must not
  mutate its inputs or write to a store.

  Examples in the codebase: `MapLayer.resolveGeoBinding` turns bound column
  ids into the column names a query result is actually keyed by, and returns
  `undefined` when a bound column is missing from the query;
  `resolveColumnKey` turns a persisted column key into the matching result
  column, `undefined` when nothing matches; `resolveOfflineDataset` picks the
  dataset a question refers to.

  Use a different prefix when the work is not a lookup:

  | Prefix    | Means                                                 |
  | --------- | ----------------------------------------------------- |
  | `resolve` | Reference plus context in, the concrete thing out     |
  | `get`     | Direct accessor, the value is already in hand         |
  | `make`    | Constructs a new value from scratch                   |
  | `build`   | Assembles a composite value out of parts              |
  | `to`      | Converts one representation into another              |
  | `select`  | Chooses among candidates that are all already present |

- A `resolve...` name says what you get, not what you started from, so name
  the source as well whenever the receiver does not already supply it. On a
  module named after the source type the call site reads it out loud, and
  repeating it stutters: prefer `MapLayer.resolveGeoBinding(layer)` over
  `MapLayer.mapLayerToGeoBinding(layer)`. A free-floating function has no such
  receiver, so it should carry the source: `resolveGeoBindingFromLayer`, not a
  bare `resolveGeoBinding`.
- Prefer `xToY` over `resolve...` when the conversion is total: every input
  has an output, the output is a re-representation of the input rather than
  something looked up, and no context beyond the input is consulted. Reserve
  `resolve...` for the partial case, where the answer can be absent.
  `structuredQueryToSql` and `sqlToStructuredQuery` are conversions;
  `resolveColumnKey` is a lookup that can fail. The distinction carries real
  information: an `xToY` name that can return `undefined` misleads the caller
  into skipping the empty case.

- Naming exceptions:
  - "E2E" should always stay fully uppercased or fully lowercased
    Examples: `e2eCreds` or `MyE2ETest`

## Types

- **Never** use `any`.
- Use `as const` for literals that never change.
- Use `type` instead of `interface`. **Only** use `interface` for OOP-style
  interfaces implemented by a class.
- Use `undefined` instead of `null`. Only use `null` when required by the API
  or library. Example: JSON in HTTP requests requires `null`; React requires `null`
  to be returned to skip renders.
- Use string literal unions instead of enums.
- Encapsulate data in composite types when a type, or parts of a type, need to
  be re-used.
- Do not create a new type if the type is never re-used. Reduce indirection.
  Example:

  ```ts
  // Bad - too much indirection and none of these types are exported or reused
  type FooParams = {
    name: string;
    age: number;
  };

  type FooReturn = {
    foo: string;
  };

  export function foo(params: FooParams): FooReturn {
    return something();
  }
  ```

  **THIS RULE DOES NOT APPLY TO PROPS**
  A React component's props should always be its own `type Props` even if it
  has only one property.

- If an object has >= 4 properties, extract to its own type for readability.
  Example:

  ```ts
  // Bad - too many inline properties, difficult to read
  export function foo(params: {
    name: string;
    age: number;
    foo: string;
    bar: boolean;
  }): { foo: string } {
    return something();
  }

  // Good - large object extracted to its own type
  type FooParams = {
    name: string;
    age: number;
    foo: string;
    bar: boolean;
  };

  export function foo(params: FooParams): { foo: string } {
    return something();
  }
  ```

### When to explicitly annotate types

- Declare types for variables, functions, parameters, and return values at
  module boundaries and top-level declarations.
  - Avoid annotations for local variables inside a function.
  - Avoid annotations for nested arrow functions (e.g. inline callbacks).

  For example:

  ```ts
  // Good - explicit types for module boundaries, top-level declarations, and params
  export const myVar: MyType = foo();
  export function myFunc(myParam: string): MyReturnType {
    return foo();
  }

  // Bad - excessive typing
  export function MyComponent({ values }) {
    // <-- missing type in param
    const x: number = 3; // <-- local variable type declaration unnecessary

    // types in nested arrow function unnecessary
    const result = myArray.map((x: MyItem): string => {
      return foo();
    });
  }
  ```

## Functions

- Use default parameter values instead of null/undefined checks.
- Use RO-RO (Receive Object, Return Object) for passing and returning multiple
  parameters.
  - If there is only one parameter, do not wrap it in an object
  - If wrapping parameters in an object, name the arg `options` unless `params`
    or `config` are more appropriate in the context of the function.
  - If you use an object, use an inline type annotation. Only extract the object
    into a named type if it will be reused.

    Examples:

    ```ts
    // Good - only a single argument, do not wrap in an object
    function foo(singleArg: string): void {}

    // Good - `options` object, but it is small so type annotation is inline
    function bar(options: { name: string; age: number }): void {}

    // Good - parameters are reused so we extract to a type alias
    type Person = {
      name: string;
      title: string;
    };

    function doSomething(options: Person): void {}
    function doSomethingElse(options: Person): void {}
    ```

- Top-level functions should always use the `function` keyword. Nested functions
  (inside a function or as an object property) should always be arrow functions.

  Examples:

  ```ts
  // Good - `function` for top-level and arrow functions inside
  function MyComponent() {
    const onClick = () => {
      doSomething();
    }
    return <button onClick={onCLick}>Hello</button>
  }

  // Good - arrow function for object property
  const Utils = {
    sayHello: (person) => {
      return `Hello ${person.name}`;
    }
  };
  ```

- Declare local helper functions above the exported function that uses them. A
  file reads helpers first and its public entry point last, so anyone reading
  from the top meets a helper before the call that depends on it and never has
  to jump downward to find out what a call does. Types, constants, and a
  component's `Props` alias still come first, above the helpers.

  Function declarations hoist, so for `function` helpers this is a readability
  rule rather than a correctness one. For `const` arrow helpers it is also a
  correctness rule: using one above its declaration is a runtime TDZ error.

  Three cases are allowed to break the order: a file with several exports and
  no single entry point (keep each helper beside the export it serves), a
  helper shared by several exports (put it above the first of them), and
  mutual recursion (no order satisfies the rule).

  Examples:

  ```ts
  // Bad - the reader hits `_formatTotal` before it is declared
  export function formatInvoice(invoice: Invoice): string {
    return `${invoice.id}: ${_formatTotal(invoice)}`;
  }

  function _formatTotal(invoice: Invoice): string {
    return invoice.total.toFixed(2);
  }
  ```

  ```ts
  // Good - helpers first, the exported entry point last
  function _formatTotal(invoice: Invoice): string {
    return invoice.total.toFixed(2);
  }

  export function formatInvoice(invoice: Invoice): string {
    return `${invoice.id}: ${_formatTotal(invoice)}`;
  }
  ```

### Import/export declarations

- Type imports/exports always use the `type` keyword.

  ```ts
  import type { MyType } from "./foo";

  export type { MyType } from "./foo";
  ```

## File, Directory, and Module Conventions

- If a file has exactly one non-type, non-constant export (a function, class,
  enum, or module object), name the file exactly after that export. Type-only
  exports do not count, and neither do exported constants: a file may also
  export supporting constants and still take the name of its single main
  export. Name the file after what a reader would consider the main export (the
  function or the module object). For example, a file that exports `detectBias`,
  a supporting `MAX_BIAS_SCORE` constant, and some exported types should still be
  named `detectBias.ts`. (A file whose exports are *only* constants follows the
  `*.constants.ts` rule below instead.)
- If a file intentionally exports a collection of helper or utility functions,
  name the file after the collection's shared purpose and suffix it with either
  `Helpers.ts` or `Utils.ts`.
- If a collection is more idiomatically called through a module or namespace,
  export only that module object or `@modules` module. Do not export the
  individual helper functions. Name the file exactly after the exported module
  object.
- In this codebase a **module** simply means an object that groups related
  functions (and any supporting constants) under a single named export, called
  as `MyModule.member(...)`. A module can be either a plain object literal or an
  `@avandar/modules` module created with `createModule(...)`. Which one to use
  depends **solely on whether the module needs state or mixins**, never on how
  many functions it groups:
  - Use a **plain object literal** for a stateless collection of related
    functions and constants. This is the default.

    ```ts
    export const DataVizFilters = {
      parseLocalFilterOptions: _parseLocalFilterOptions,
      localFilterToRecord: _localFilterToRecord,
    };
    ```

  - Use **`createModule(...)`** (from `@avandar/modules`) only when the module
    tracks state (and needs its generated getters/setters) or composes behavior
    via mixins. Do not reach for `createModule` merely to group stateless
    functions: a plain object is sufficient and lighter.
- When a module can not be encapsulated in a single file, create a directory
  to represent the module. Some examples of when a module should be a directory
  are: when a module has a `.test` file, has tightly-coupled helper functions,
  or has sub-components in separate files.

  The directory structure should be as follows:

  ```plaintext
  MyComponent
    | MyComponent.tsx
    | MyComponent.test.tsx
    | SubComponent.tsx
  ```

- **Never colocate route components with a `-` prefix under `src/routes/`.**
  TanStack Router drops any file or directory whose name starts with `-` from
  the route tree (`routeFileIgnorePrefix: "-"`), so a `-DisplayNameSection.tsx`
  sitting next to a route file is a hidden, non-route component. Do not use the
  ignore prefix to colocate a route's pieces. Keep the route file thin (only
  `createFileRoute` wiring a `component`) and move the view and its
  sub-components into `src/views/<Name>View/`, named without any `-` prefix.
  The route file imports and renders the view:

  ```ts
  // src/routes/_auth/$workspaceSlug/profile.tsx
  import { createFileRoute } from "@tanstack/react-router";
  import { ProfileView } from "@/views/ProfileView/ProfileView";

  export const Route = createFileRoute("/_auth/$workspaceSlug/profile")({
    component: ProfileView,
  });
  ```

- **Never name a file just `constants.ts` or `types.ts`.** Always qualify the
  file with what it represents:
  - Name it after the module or component it belongs to:
    `MyModule.constants.ts`, `MyComponent.types.ts`.
  - If the constants/types are more general than a single module, name the
    file after its parent directory. E.g. constants shared across the
    `csvParse/` directory live in `csvParse.constants.ts`.
  - If there is no meaningful parent module (e.g. constants for the whole
    app), pick an appropriate scope name such as `app.constants.ts`.

  This applies equally to `*.constants.ts` and `*.types.ts` (and their `.tsx`
  equivalents). A bare `constants.ts` or `types.ts` is never allowed.

- Never create barrel files. The only barrel files allowed are the `index.ts`
  files exporting the contents of our libraries in `packages/`.
- As soon as a file has another co-named file (e.g. `MyFile.tsx` and
  `MyFile.test.tsx`) then you must create an equally-named directory to
  couple them. E.g. `MyFile/MyFile.tsx` and `MyFile/MyFile.test.tsx`
- The converse also holds: a module with no co-named sibling must NOT get a
  directory of its own. A directory exists to group siblings, so
  `MyFile/MyFile.tsx` with nothing beside it is a directory that groups
  nothing, and it costs a redundant path segment on every import
  (`.../MyFile/MyFile`). Leave the lone file next to its parent
  (`.../MyFile.tsx`) and create the directory at the moment a second
  co-named file appears. This applies to every kind of module: components,
  hooks, and plain `.ts` modules alike.

  This is bad (each directory holds exactly one file):

  ```text
  DataExplorerDrawer/
    DataExplorerDrawer.tsx
    useDrawerResize/
      useDrawerResize.ts
    QueryTabPanel/
      QueryTabPanel.tsx
  ```

  This is good (the lone files sit with their parent; only the unit that
  really has siblings keeps a directory):

  ```text
  DataExplorerDrawer/
    DataExplorerDrawer.tsx
    useDrawerResize.ts
    QueryTabPanel.tsx
    DrawerHeight/
      DrawerHeight.ts
      DrawerHeight.test.ts
  ```
- Never use namespace exports. Always use named exports.
  Bad: `export * from ...`.
  Good: `export { MyComponent } from ...`.
- All exported classes, objects, and functions must always have a docstring.

  ```ts
  /**
   * Docstring describing `foo`.
   *
   * @param options The options to pass.
   * @param options.name The name of the person
   * @param options.age The age of the person
   * @returns void
   */
  export function foo(options: { name: string; age: number }): void {}
  ```

- If an object is exported, its top-level methods should also have docstrings.

  ```ts
  /**
   * Docstring describing `MyObject`.
   */
  export const MyObject = {
    /**
     * Docstring describing the `hello` method.
     */
    hello: () => {
      return "hello, world";
    },
  };
  ```

- Put the docstring on the module's exported key, not on the underlying
  declaration, when a non-exported declaration is defined in the same file as
  the module that exports it. TypeScript intellisense does not carry a
  declaration's docstring across the assignment into a module object: it can see
  the type of `MyModule.myFunc` but does not know it is the same function as
  `_myFunc`, so a docstring on `_myFunc` never surfaces on `MyModule.myFunc`.

  This covers every kind of key, not just methods. A constant loses its
  docstring the same way, and a shorthand key (`{ MY_LIMIT }`) hides it exactly
  as an explicit one does.

  This is bad (neither docstring is visible at the call site):

  ```ts
  /** Smallest allowed value. */
  const MY_LIMIT = 10;

  /** What myFunc does. */
  function _myFunc() {
    implementation();
  }

  export const MyModule = {
    MY_LIMIT,
    myFunc: _myFunc,
  };
  ```

  This is good (hovering either member shows its docstring):

  ```ts
  const MY_LIMIT = 10;

  function _myFunc() {
    implementation();
  }

  export const MyModule = {
    /** Smallest allowed value. */
    MY_LIMIT,

    /** What myFunc does. */
    myFunc: _myFunc,
  };
  ```

  Exception: when the object is annotated with an interface or type that already
  documents its members (`const Store: BlobStore = { ... }`), the docstrings
  belong on that interface, which is the intellisense source for every
  implementation. Do not duplicate them on the object keys or the functions.

## Immutability

- Follow **input contravariance, output covariance**: widen inputs, narrow
  outputs.
- Wrap inputs at module boundaries as readonly so callers retain control of
  their data; return mutable types so callers retain control of what you give
  them.
- Locally, prefer mutable types. They are faster in V8 and immutability is
  not a dogmatic goal. Immutability is about establishing a clear contract
  at the boundary.

### When to use readonly wrappers

- Apply readonly wrappers to function parameters.
- Everywhere else, use mutable types (local variables, internal helpers,
  return types, intermediate values).
- Functions that intentionally mutate their input (e.g. `sortInPlace`,
  `assignDefaults`) are the exception: drop the readonly wrapper on the
  parameter they mutate. Name these functions so the mutation is obvious,
  and prefer returning `void` to signal the side effect.

```ts
// Good: readonly input, mutable locally, mutable output
export function getActiveUserNames(users: readonly User[]): string[] {
  const names: string[] = []; // local mutation is fine and faster
  users.forEach((user) => {
    if (user.active) {
      names.push(user.name);
    }
  });
  return names; // mutable return, caller owns it
}

// Good: mutable input because this is clearly a mutation function
export function sortInPlace(users: User[]): void {}

// Bad: readonly return restricts the caller for no reason
export function getRoles(user: Readonly<User>): readonly Role[] {}

// Bad: mutable input lets the function mutate the caller's data
export function getRoles(users: User[]): Role[] {}
```

### How to make a type readonly

| Kind   | Use                    |
| ------ | ---------------------- |
| Array  | `readonly T[]`         |
| Set    | `ReadonlySet<T>`       |
| Map    | `ReadonlyMap<K, V>`    |
| Object | `Readonly<T>`          |
| Record | `ReadonlyRecord<K, V>` |

For objects, prefer the `Readonly<T>` wrapper over annotating each property
with `readonly`. Use per-property `readonly` only when **some** properties
are readonly and others are not.

```ts
// Good: wrapper at the call site
export function render(props: Readonly<Props>) {}

// Good: per-property readonly when mixing
type Config = {
  readonly id: string; // immutable identity
  label: string; // mutable display field
};

// Bad: per-property readonly when all are readonly. Use Readonly<> instead.
type Props = {
  readonly name: string;
  readonly age: number;
};
```

### Type aliases stay mutable

Define type aliases as mutable. Apply `Readonly<T>` or `readonly` at the
function signature, not on the alias itself. A reusable type should not
impose immutability on every consumer.

```ts
// Good: mutable alias, readonly applied at the boundary
type User = { name: string; age: number };

export function greet(user: Readonly<User>) {}
export function increaseAge(user: User): void {
  user.age++;
} // intentional mutation
```

Only bake `readonly` into the alias itself when the type **must never**
be mutated anywhere. E.g. a frozen constant, a discriminated union of
immutable events, or a shared reference where mutation would be a bug.

```ts
// Good: type must always be immutable
type AuditLogEntry = Readonly<{
  timestamp: number;
  userId: string;
  action: string;
}>;
```

## React Code Style

- **One component per file.**
- Split up components into logical sub-components. Avoid monolithic components.
- Use our internal UI library in `src/lib/ui` or Mantine components.
- Do not build new core UI elements from scratch unless specifically asked to.
- Define functional components with the function keyword instead of arrow
  functions. Example:

  ```ts
  // Bad:
  const MyComponent = () => {};

  // Good:
  function MyComponent() {}
  ```

- Use ternaries for conditional rendering instead of short-circuited
  evaluations. For example:

  ```ts
  // Bad:
  <div>{someCondition && <MyComponent />}</div>

  // Good:
  <div>{someCondition ? <MyComponent /> : null}</div>
  ```

## Data Fetching

- Use Zod for validation
- In React, use our internal `useQuery` and `useMutation` wrappers of Tanstack Query.

## Icons

- Use `@tabler/icons-react`

## Library-specific usage

### React-query

- Use our `useQuery` and `useMutation` wrappers from `@hooks` instead
  of importing from `@tanstack/react-query`
- When using `useMutation` (or any hooks that wrap it), call the non-async mutate
  function and set necessary `onSuccess` and `onError` handlers at the hook level.
  Do not call `mutateFunc.async()` unless strictly necessary, which is rare.

### Mantine

- Before using any Mantine component, check if we we have a wrapper in
  `src/lib/ui` or `packages/web/ui` that you can use instead.
- Use our `useForm` wrapper in `@/lib/hooks/ui/useForm` instead of using Mantine's
  `useForm` directly.
- When using `useForm`, always set a `key={form.key('fieldId')}` prop
  to each input component even if they are not in an array.

### Supabase-js

- Use `.throwOnError()` whenever possible instead of relying on destructuring
  the `{ error }` and then checking it in an `if`.
- Parameters that accept a Supabase admin client should always be named
  `supabaseAdminClient` instead of just `admin` or `adminClient`.
