import type { BaseModule } from "@avandar/modules";

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

export type WithLogger<Module extends BaseModule> = Module & {
  /**
   * @returns A new instance of the module with the logger enabled.
   */
  withLogger: (callerNameOverride?: string) => Module;
};
