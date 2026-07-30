import { useLingui } from "@lingui/react/macro";
import { FreeTextBody } from "./FreeTextBody";
import type { ClarificationSubmitAnswer } from "./ClarificationAnswerModule/ClarificationAnswer";

type Props = {
  onSubmit: (answer: ClarificationSubmitAnswer) => void;
};

/** Provides free-text input when discovery cannot produce usable options. */
export function DiscoveryCustomFallback({
  onSubmit,
}: Readonly<Props>): React.ReactNode {
  const { t } = useLingui();
  return (
    <FreeTextBody
      placeholder={t`Type your answer…`}
      onSubmit={(text) => {
        onSubmit({ kind: "custom", text });
      }}
    />
  );
}
