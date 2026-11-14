import { useLingui } from "@lingui/react";
import { useCallback } from "react";
import { TOKEN_MESSAGE_PREFIX } from "./buildTokenDescriptorsSource";

/**
 * Translates a token catalog label or description through the gallery
 * catalog, falling back to the English source. Use it for every piece of
 * catalog copy a viewer sees.
 */
export function useTokenCopy(): (message: string) => string {
  const { i18n } = useLingui();
  return useCallback(
    (message: string) => {
      // A descriptor built at runtime: the generated descriptors carry these
      // messages into the catalog, so extraction has nothing to read here.
      const descriptor = { id: `${TOKEN_MESSAGE_PREFIX}${message}`, message };
      return i18n._(descriptor);
    },
    [i18n],
  );
}
