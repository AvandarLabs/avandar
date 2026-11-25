import { Trans } from "@lingui/react/macro";
import { Group } from "@mantine/core";
import { ValueSideHint } from "@/components/dataDictionaries/ValueSideHint/ValueSideHint";
import type { ReactNode } from "react";

type Props = {
  side: "source" | "target";
};

/** "Source value" or "Target value" with the info icon that defines it. */
export function ValueSideHeading({ side }: Readonly<Props>): ReactNode {
  return (
    <Group gap={4} wrap="nowrap" component="span">
      {side === "source" ? (
        <Trans>Source value</Trans>
      ) : (
        <Trans>Target value</Trans>
      )}
      <ValueSideHint side={side} />
    </Group>
  );
}
