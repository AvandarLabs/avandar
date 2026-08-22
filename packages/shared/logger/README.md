# @avandar/logger

Avandar's logging library. Provides a styled **web browser** logger with
caller tracing, immutable configuration, and a `withLogger` mixin for
attaching scoped loggers to `@avandar/modules` modules. A Node.js logger
will be added in the future.

ESM only. Requires Node 22+.

## Install

```sh
pnpm add @avandar/logger
```

No peer dependencies.

## Usage

```ts
import { createWebLogger, withLogger } from "@avandar/logger";

// Default logger
const Logger = createWebLogger();
Logger.log("hello");
Logger.warn("something is off");
Logger.error(new Error("boom"));

// Named logger
const log = createWebLogger({ loggerName: "MyModule" });
log.log("scoped message");

// Chain immutable configuration
const child = Logger.appendName("Auth").setCallerName("login").setEnabled(true);
```

## API

### `createWebLogger(config?)`

Creates a new browser logger instance.

| Option               | Type      | Default | Description                                     |
| -------------------- | --------- | ------- | ----------------------------------------------- |
| `loggerName`         | `string`  | —       | Prefix shown in styled log output               |
| `callerName`         | `string`  | —       | Overrides auto-detected caller from stack trace |
| `enabled`            | `boolean` | `true`  | Whether logging is active                       |
| `suppressConsoleLog` | `boolean` | `false` | When true, `log()` calls are suppressed         |

### `withLogger(baseModule, moduleBuilder)`

Module mixin that attaches a scoped, disabled-by-default logger to a
`@avandar/modules` module. Calling `MyModule.withLogger()` returns the same
module with logging enabled. Pass a `callerNameOverride` string to fix the
caller name for the returned module's log output.

```ts
import { createModule } from "@avandar/modules";
import { withLogger } from "@avandar/logger";

const MyModule = withLogger(createModule("MyModule"), (logger) => ({
  doWork() {
    logger.log("working");
  },
}));

MyModule.doWork(); // silent
MyModule.withLogger().doWork(); // logs
```

## Types

### `ILogger`

The shape returned by `createWebLogger`. All mutators are immutable — they
return a new logger instance.

| Method                 | Description                                                        |
| ---------------------- | ------------------------------------------------------------------ |
| `log(...args)`         | Styled log output (suppressed if `enabled` is false)               |
| `warn(...args)`        | Styled warning                                                     |
| `error(error, extra?)` | Forwards to `console.error`                                        |
| `isEnabled()`          | Returns current enabled state                                      |
| `setEnabled(enabled)`  | Returns a new logger with the given enabled state                  |
| `appendName(name)`     | Returns a new logger with `name` appended (`parent:child` format)  |
| `setCallerName(name)`  | Returns a new logger with a fixed caller name (skips stack lookup) |

### `WithLogger<M>`

Wraps a module type `M` with a `withLogger(callerNameOverride?)` method that
returns a new module instance with its scoped logger enabled.

## License

MIT
