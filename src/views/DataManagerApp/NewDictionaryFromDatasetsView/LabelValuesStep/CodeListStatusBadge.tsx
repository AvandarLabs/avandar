import { Trans } from "@lingui/react/macro";
import { Badge } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { ReactNode } from "react";

type Props = {
  status: DictionaryProposal.CodeListStatus;
};

/** Labeled, Suggested, or To do, beside a code list waiting for labels. */
export function CodeListStatusBadge({ status }: Readonly<Props>): ReactNode {
  if (status === "labeled") {
    return (
      <Badge size="sm" variant="light" color="success" tt="none">
        <Trans>Labeled</Trans>
      </Badge>
    );
  }
  if (status === "suggested") {
    return (
      <Badge
        size="sm"
        variant="light"
        color="neutral"
        tt="none"
        leftSection={<IconSparkles size={10} aria-hidden />}
      >
        <Trans>Suggested</Trans>
      </Badge>
    );
  }
  return (
    <Badge size="sm" variant="outline" color="neutral" tt="none">
      <Trans>To do</Trans>
    </Badge>
  );
}
