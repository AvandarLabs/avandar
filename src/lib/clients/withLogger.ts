import { createLogger, ILogger } from "../Logger";
import { BaseClient } from "./BaseClient";

export type WithLogger<Module extends BaseClient> = Module & {
  /**
   * @returns A new instance of the module with the logger enabled.
   */
  withLogger: (callerNameOverride?: string) => Module;
};

/**
 * Adds a logger that is accessible to all module functions. The logger is
 * disabled by default and becomes enabled when the user calls `.withLogger()`
 * on the module.
 *
 * For example, `MyModule.withLogger().myFunction()` will call `myFunction` with
 * the logger enabled, so any logs will now be printed.
 *
 * @param baseModule The module to add a logger to.
 * @param moduleBuilder A function that builds the new module.
 * @returns The module with a `withLogger` method.
 */
export function withLogger<Module extends BaseClient>(
  baseModule: BaseClient,
  moduleBuilder: (baseLogger: ILogger) => Module,
): WithLogger<Module> {
  // initialize a logger that is disabled by default
  const logger = createLogger({
    loggerName: baseModule.getClientName(),
  }).setEnabled(false);

  const module = moduleBuilder(logger);
  const moduleWithEnabledLogger = moduleBuilder(logger.setEnabled(true));
  const modulesWithNamedLoggers = new Map<string, Module>();

  return {
    ...module,

    /**
     * Enables the logger for this module.
     */
    withLogger: (callerNameOverride?: string): Module => {
      if (!callerNameOverride) {
        return moduleWithEnabledLogger;
      }

      if (modulesWithNamedLoggers.has(callerNameOverride)) {
        return modulesWithNamedLoggers.get(callerNameOverride)!;
      }

      const newModule = moduleBuilder(
        createLogger({
          callerName: callerNameOverride,
          loggerName: baseModule.getClientName(),
        }).setEnabled(true),
      );
      modulesWithNamedLoggers.set(callerNameOverride, newModule);
      return newModule;
    },
  };
}
