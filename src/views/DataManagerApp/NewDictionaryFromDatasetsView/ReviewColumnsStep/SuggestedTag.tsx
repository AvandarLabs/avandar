import { Trans, useLingui } from "@lingui/react/macro";
import { Badge, Tooltip, VisuallyHidden } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import type { ReactNode } from "react";

type Props = {
  reason: "meaning" | "similar_name";
  /**
   * The id of the hidden explanation. The row's Keep apart button points at
   * it too, so both explain the guess to screen readers.
   */
  explanationId: string;
};

/**
 * Marks an entry whose columns were joined by a guess, and says why on
 * hover and to screen readers. Keep apart on the same
 * row undoes the guess.
 */
export function SuggestedTag({
  reason,
  explanationId,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const explanation =
    reason === "meaning"
      ? t`Matched by meaning, not just by name. Keep apart if these record different things.`
      : t`Similar names and values. Keep apart if these record different things.`;
  return (
    <>
      <Tooltip label={explanation} multiline w={260}>
        <Badge
          aria-describedby={explanationId}
          variant="light"
          color="neutral"
          size="sm"
          tt="none"
          leftSection={<IconSparkles size={12} aria-hidden />}
        >
          <Trans>Suggested</Trans>
        </Badge>
      </Tooltip>
      <VisuallyHidden id={explanationId}>{explanation}</VisuallyHidden>
    </>
  );
}
