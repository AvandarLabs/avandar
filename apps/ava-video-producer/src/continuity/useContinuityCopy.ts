import { useLingui } from "@lingui/react";
import { getContinuityCopyFromMessage } from "./i18n/getContinuityCopyFromMessage/getContinuityCopyFromMessage";
/** Resolve authored film copy through the active language catalog. */
export function useContinuityCopy() {
  const { i18n } = useLingui();
  return (message: string) => getContinuityCopyFromMessage({ i18n, message });
}
