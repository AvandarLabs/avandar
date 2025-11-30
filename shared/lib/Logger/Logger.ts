const LOG_HEADER_FONT_SIZE = "11px";
const LOG_BODY_FONT_SIZE = "13px";

const LOG_HEADER_STYLES = `color: #102a43; font-weight: bold; font-size: ${LOG_HEADER_FONT_SIZE};`;
const LOG_BODY_STYLES = `background: #168d36; color: #ffffff; font-size: ${LOG_BODY_FONT_SIZE};`;

type LogCaller = {
  fnName: string;
  location?: string;
};

export type ILogger = {
  error: (error: unknown, extraData?: unknown) => void;
  warn: (...args: unknown[]) => void;
  log: (...args: unknown[]) => void;
  isEnabled: () => boolean;

  /**
   * Sets the logger to enabled or disabled.
   * This is an immutable function, it returns a new logger instance.
   * @param enabled - Whether to enable or disable the logger.
   * @returns The logger instance.
   */
  setEnabled: (enabled: boolean) => ILogger;

  /**
   * Appends a name to the logger's name.
   * This is an immutable function, it returns a new logger instance.
   * @param name - The name to append.
   * @returns The logger instance.
   */
  appendName: (name: string) => ILogger;

  /**
   * Overrides the default computed caller name. This is helpful for
   * situations with several layers of abstraction where the automatically
   * computed caller name is not very helpful.
   *
   * This is an immutable function, it returns a new logger instance.
   *
   * @param callerName - The caller name to set.
   * @returns The logger instance.
   */
  setCallerName: (callerName: string) => ILogger;
};

/**
 * Extracts the function and location from a stack trace.
 * NOTE: this function is tightly coupled to our Logger. It assumes the stack
 * was retrieved at the start of a `Logger` function with no further
 * indirection.
 *
 * @param callStack - The stack trace to extract from.
 * @returns An array of objects containing the function name and location.
 */
function _getFunctionsFromLoggerStack(callStackString: string): LogCaller[] {
  // Get the stack trace, skip the first few to skip the layers of indirection
  // within the Logger itself that led to this function call.
  const stack = callStackString
    .split("\n")
    .slice(3)
    .map((line) => {
      // Extract just the function/file name from the stack
      const callerString = line.trim().split("at ")[1] ?? "";
      const callerParts = callerString.split(" ");

      if (callerParts.length === 1 && callerParts[0] === "") {
        return {
          fnName: "Unknown caller",
          location: "Unknown location",
        };
      }

      const callerFnName =
        callerParts.length === 1 ? "anonymous" : callerParts[0]!;
      const callerLocation =
        callerParts.length === 1 ? callerParts[0]! : callerParts[1]!;

      const callerLocationParts =
        callerLocation.split("?")[0]?.split("/") ?? [];

      const callerFilename = callerLocationParts
        .slice(callerLocationParts.length < 3 ? 0 : 3)
        .join("/")
        .replace("(", "")
        .replace(")", "");

      return {
        fnName: callerFnName,
        location: callerFilename,
      };
    });
  return stack;
}

function _makeLogHeading(logType: "WARN" | "LOG", caller: LogCaller): string {
  const baseHeading = `%c [${logType}] ${caller.fnName}`;
  return caller.location ? `${baseHeading} [${caller.location}]` : baseHeading;
}

/**
 * Creates a new logger instance.
 *
 * @param config - Configuration options for the logger.
 * @param config.loggerName - The name of the logger.
 * @param config.enabled - Whether to enable the logger. Defaults to true.
 * @returns A new logger instance.
 */
export function createLogger(config?: {
  loggerName?: string;
  callerName?: string;
  enabled?: boolean;
}): ILogger {
  const { loggerName, callerName, enabled = true } = config ?? {};
  const styledMsgTemplate = loggerName ? `%c [${loggerName}] %s` : "%c %s";
  const state = { enabled };

  const getCaller = (): LogCaller => {
    if (callerName) {
      return { fnName: callerName, location: "" };
    }

    const stack = _getFunctionsFromLoggerStack(new Error().stack ?? "");
    const caller = stack[0]!;
    return caller;
  };

  return {
    isEnabled: (): boolean => {
      return state.enabled;
    },

    setEnabled: (newEnabledState: boolean): ILogger => {
      return createLogger({
        ...config,
        enabled: newEnabledState,
      });
    },

    setCallerName: (newCallerName: string): ILogger => {
      return createLogger({
        ...config,
        callerName: newCallerName,
      });
    },

    appendName: (name: string): ILogger => {
      const newLoggerName = loggerName ? `${loggerName}:${name}` : name;
      return createLogger({
        ...config,
        loggerName: newLoggerName,
      });
    },

    /**
     * Logs an error to the console.
     *
     * @param error - The error to log. It can technically be of any type
     * because javascript lets you `throw` anything, even primitive types.
     * @param extraData - Optional extra data to log.
     */
    error: (error: unknown, extraData?: unknown): void => {
      if (!state.enabled) {
        return;
      }
      console.error(error, extraData);
    },

    /**
     * Logs a warning to the console.
     *
     * @param message - The message to log.
     * @param extraData - Optional extra data to log.
     */
    warn: (...args: unknown[]): void => {
      if (!state.enabled) {
        return;
      }

      const caller = getCaller();
      const styles = [
        `background: #f6db6d; ${LOG_HEADER_STYLES}`,
        args.length > 1 ? LOG_BODY_STYLES : `font-size: ${LOG_BODY_FONT_SIZE};`,
      ];
      const logHeading = _makeLogHeading("WARN", caller);
      console.warn(`${logHeading}\n${styledMsgTemplate}`, ...styles, ...args);
    },

    /**
     * Logs a message to the console that is only visible if we are in
     * dev mode. This also prints the function caller and location.
     */
    log: (...args: unknown[]): void => {
      if (!state.enabled) {
        return;
      }

      if (import.meta.env) {
        if (import.meta.env.DEV) {
          const caller = getCaller();
          const styles = [
            `background: #d5f5fa; ${LOG_HEADER_STYLES}`,
            args.length > 1 ?
              LOG_BODY_STYLES
            : `font-size: ${LOG_BODY_FONT_SIZE};`,
          ];
          const logHeading = _makeLogHeading("LOG", caller);
          console.log(
            `${logHeading}\n${styledMsgTemplate} `,
            ...styles,
            ...args,
          );
        }
      }
    },
  };
}

/** The base logger, with no name */
export const Logger: ILogger = createLogger();
