import { createWebLogger } from "../createWebLogger/createWebLogger.ts";
import type { ILogger, WithLogger } from "../Logger.types.ts";
import type { BaseModule } from "@modules/createModule.ts";

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
export function withLogger<
  Module extends BaseModule,
  ReturnModule extends BaseModule,
>(
  baseModule: Module,
  moduleBuilder: (baseLogger: ILogger) => ReturnModule,
): WithLogger<ReturnModule> {
  // initialize a logger that is disabled by default
  const logger = createWebLogger({
    loggerName: baseModule.getModuleName(),
  }).setEnabled(false);

  const module = moduleBuilder(logger);
  const moduleWithEnabledLogger = moduleBuilder(logger.setEnabled(true));
  const modulesWithNamedLoggers = new Map<string, ReturnModule>();

  return {
    ...module,

    /**
     * Enables the logger for this module.
     */
    withLogger: (callerNameOverride?: string): ReturnModule => {
      if (!callerNameOverride) {
        return moduleWithEnabledLogger;
      }

      if (modulesWithNamedLoggers.has(callerNameOverride)) {
        return modulesWithNamedLoggers.get(callerNameOverride)!;
      }

      const newModule = moduleBuilder(
        createWebLogger({
          callerName: callerNameOverride,
          loggerName: baseModule.getModuleName(),
        }).setEnabled(true),
      );
      modulesWithNamedLoggers.set(callerNameOverride, newModule);
      return newModule;
    },
  };
}
