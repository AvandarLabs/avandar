import { setValue } from "@avandar/utils";
import { useCallback } from "react";

/**
 * A setter that writes one setting to a config by its dotted path.
 *
 * `setValue` creates the intermediate objects the path needs, so writing
 * `chartStyle.yAxis.max` onto a config with no `chartStyle` works. The
 * `as never` casts are unavoidable: the path is a runtime string from a
 * descriptor, so it cannot be checked against `Paths<TConfig>` here.
 */
export function useUpdateSettingPath<TConfig extends object>(
  config: TConfig,
  onConfigChange: (nextConfig: TConfig) => void,
): (path: string, value: unknown) => void {
  return useCallback(
    (path: string, value: unknown) => {
      onConfigChange(
        setValue(config as never, path as never, value as never) as TConfig,
      );
    },
    [config, onConfigChange],
  );
}
