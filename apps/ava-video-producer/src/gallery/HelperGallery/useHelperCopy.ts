import { useLingui } from "@lingui/react";
import { HELPER_MESSAGE_PREFIX } from "./i18n/buildHelperDescriptorsSource";
import type { MessageDescriptor } from "@lingui/core";

/** The generated descriptor id of one authored catalog sentence. */
function _createDescriptor(message: string): MessageDescriptor {
  return { id: `${HELPER_MESSAGE_PREFIX}${message}`, message };
}

/**
 * Resolves authored helper catalog copy (titles, descriptions, guidance)
 * through the active gallery catalog, falling back to the English source.
 * The descriptors themselves are extracted from the generated
 * `helperDescriptors.generated.ts`.
 */
export function useHelperCopy(): (message: string) => string {
  const { i18n } = useLingui();
  return (message: string) => i18n._(_createDescriptor(message));
}
