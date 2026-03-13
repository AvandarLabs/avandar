# @avandar/logger

Avandar's logging library. Currently only provides a **web browser** logger
with styled console output, caller tracing, and immutable configuration.
A Node.js logger will be added in the future.

## Usage

```ts
import { createWebLogger } from "@avandar/logger";

const Logger = createWebLogger();

// Use the default logger
Logger.log("hello");
Logger.warn("something is off");
Logger.error(new Error("boom"));

// Create a named logger
const log = createWebLogger({ loggerName: "MyModule" });
log.log("scoped message");

// Chain immutable configuration
const child = Logger.appendName("Auth").setCallerName("login").setEnabled(true);
```

## API

### `createWebLogger(config?)`

Creates a new logger instance.

| Option       | Type      | Default | Description                    |
| ------------ | --------- | ------- | ------------------------------ |
| `loggerName` | `string`  | —       | Prefix shown in log output     |
| `callerName` | `string`  | —       | Overrides auto-detected caller |
| `enabled`    | `boolean` | `true`  | Whether logging is active      |

### `ILogger`

Every logger instance exposes:

- **`log(...args)`** — dev-only log (guarded by `import.meta.env.DEV`)
- **`warn(...args)`** — styled warning
- **`error(error, extraData?)`** — error output
- **`isEnabled()`** — returns current enabled state
- **`setEnabled(enabled)`** — returns a new logger with the given state
- **`appendName(name)`** — returns a new logger with the name appended
- **`setCallerName(name)`** — returns a new logger with a fixed caller name

All mutators are immutable — they return a new logger instance.

## Scripts

| Command           | Description                  |
| ----------------- | ---------------------------- |
| `pnpm test`       | Run all tests once           |
| `pnpm test:watch` | Run tests in watch mode      |
| `pnpm type-check` | Run TypeScript type checking |
