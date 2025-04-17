import { isNotNullOrUndefined } from "./utils/guards";

export const Logger = {
  /**
   * Logs an error to the console.
   *
   * @param error - The error to log. It can technically be of any type because
   * javascript lets you `throw` anything, even primitive types.
   * @param extraData - Optional extra data to log.
   */
  error: (error: unknown, extraData?: unknown): void => {
    console.error(error, extraData);
  },

  /**
   * Logs a warning to the console.
   *
   * @param message - The message to log.
   * @param extraData - Optional extra data to log.
   */
  warn: (message: string, extraData?: unknown): void => {
    console.warn(message, extraData);
  },

  /**
   * Logs a message to the console that is only visible if we are in
   * dev mode. This also prints the function caller and location.
   */
  log: (...args: unknown[]): void => {
    if (import.meta.env.DEV) {
      // Get the stack trace, skip the first lines as it's the Logger itself
      const stack = (new Error().stack ?? "")
        .split("\n")
        .slice(2)
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

      const caller = stack[0]!;
      const styles = [
        "background: #d5f5fa; color: #00899d; font-weight: bold; font-size: 12px;",
        args.length > 1 ? "background: #a0140c; color: #ffffff;" : undefined,
      ].filter(isNotNullOrUndefined);
      const logHeading = `%c [LOG] ${caller.fnName} [${caller.location}]`;
      const styledMsg = args.length > 1 ? "%c %s " : "";
      console.log(`${logHeading}\n${styledMsg}`, ...styles, ...args);
    }
  },
};
