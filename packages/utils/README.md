# @avandar/utils

A package of common utility functions with no business logic. These are
general-purpose utilities that can be dropped into any TypeScript project.

This package aims to have as few external dependencies as possible. Runtime
dependencies are limited to small, well-maintained libraries when
reimplementing them would be impractical.

## Modules

| Module           | Description                                                      |
| ---------------- | ---------------------------------------------------------------- |
| `types`          | Common type definitions and utility types                        |
| `utils/constant` | A function that returns a constant-value function                |
| `utils/dates`    | Date formatting utilities                                        |
| `utils/filters`  | Composable data filtering (by column, by operator)               |
| `utils/guards`   | Type guard functions (`isArray`, `isDefined`, `isString`, etc.)  |
| `utils/objects`  | Object helpers (`objectKeys`, `objectEntries`, `registry`, etc.) |
| `utils/strings`  | String helpers (`capitalize`, `toPascalCase`, `unknownToString`) |
| `utils/traverse` | Tree traversal utility                                           |
| `utils/wait`     | Promise-based delay                                              |

## Scripts

| Command           | Description                  |
| ----------------- | ---------------------------- |
| `pnpm test`       | Run all tests once           |
| `pnpm test:watch` | Run tests in watch mode      |
| `pnpm type-check` | Run TypeScript type checking |

## Dependencies

### Runtime

- **dayjs** &mdash; date formatting and timezone support
- **ts-pattern** &mdash; exhaustive pattern matching
- **type-fest** &mdash; utility types (types only, zero runtime cost)

### Development

- **vitest** &mdash; test runner
- **typescript** &mdash; type checking
- **zod** &mdash; used only in type-level test utilities
