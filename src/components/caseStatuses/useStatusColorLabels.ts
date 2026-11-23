import { useLingui } from "@lingui/react/macro";
import { useMemo } from "react";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";

/**
 * The user-facing name of each status palette color, keyed by its palette
 * key. A swatch announces its color by this name.
 *
 * @returns A translated name for every `ConceptStatus.ColorKey`.
 */
export function useStatusColorLabels(): Record<ConceptStatus.ColorKey, string> {
  const { t } = useLingui();
  return useMemo(() => {
    return {
      neutral: t`Gray`,
      green: t`Green`,
      blue: t`Blue`,
      teal: t`Teal`,
      yellow: t`Yellow`,
      orange: t`Orange`,
      red: t`Red`,
      grape: t`Purple`,
    };
  }, [t]);
}
