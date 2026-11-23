import { Tooltip } from "@avandar/ui";
import { Group, Text } from "@mantine/core";
import { StatusDot } from "@/components/caseStatuses/StatusDot/StatusDot";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { ReactNode } from "react";

type Props = {
  status: ConceptStatus.T | undefined;
};

/**
 * One status in the records filter: its color and name, with what it means
 * in a tooltip when the case type designer wrote a description.
 */
export function StatusFilterOption({ status }: Readonly<Props>): ReactNode {
  if (!status) {
    return null;
  }
  return (
    <Tooltip
      label={status.description}
      disabled={!status.description}
      position="right"
      multiline
      maw={260}
    >
      <Group gap="xs" wrap="nowrap">
        <StatusDot color={status.color} />
        <Text size="sm" span>
          {status.name}
        </Text>
      </Group>
    </Tooltip>
  );
}
