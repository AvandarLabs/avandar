import { useLingui } from "@lingui/react/macro";
import { FreeTextBody } from "./FreeTextBody";
import type { ClarificationSubmitAnswer } from "./clarificationAnswer/clarificationAnswer";

/** Provides free-text input when discovery cannot produce usable options. */
export function DiscoveryCustomFallback({
  onSubmit,
}: {
  onSubmit: (answer: ClarificationSubmitAnswer) => void;
}): React.ReactNode {
  const { t } = useLingui();
  return (
    <FreeTextBody
      placeholder={t`Type your answer…`}
      onSubmit={(text) => {return onSubmit({ kind: "custom", text })}}
    />
  );
}
