import { setValue } from "@avandar/utils";
import { useCallback } from "react";

/** Returns a setter that writes one setting to a config by its dotted path. */
export function useUpdateSettingPath<TConfig extends object>({
  config,
  onConfigChange,
}: Readonly<{
  config: Readonly<TConfig>;
  onConfigChange: (nextConfig: TConfig) => void;
}>): (options: Readonly<{ path: string; value: unknown }>) => void {
  return useCallback(
    ({ path, value }: Readonly<{ path: string; value: unknown }>) => {
      // The path comes from a runtime descriptor, so TypeScript cannot
      // validate it against `Paths<TConfig>` at this generic boundary.
      onConfigChange(
        setValue(config as never, path as never, value as never) as TConfig,
      );
    },
    [config, onConfigChange],
  );
}
