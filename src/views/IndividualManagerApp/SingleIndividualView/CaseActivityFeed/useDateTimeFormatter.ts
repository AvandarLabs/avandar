import { useLingui } from "@lingui/react/macro";
import { useMemo } from "react";

/**
 * An `Intl.DateTimeFormat` for the active locale. Pass a module-level
 * options object so the formatter is built once per locale.
 */
export function useDateTimeFormatter(
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const { i18n } = useLingui();
  return useMemo(() => {
    return new Intl.DateTimeFormat(i18n.locale, options);
  }, [i18n.locale, options]);
}
