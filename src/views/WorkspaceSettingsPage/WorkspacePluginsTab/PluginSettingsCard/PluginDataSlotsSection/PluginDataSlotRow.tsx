import { useLingui } from "@lingui/react/macro";
import { Badge, Group, Stack, Text } from "@mantine/core";
import { useDataSlotSourceLabels } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotSourceLabels";
import { DataSlotProblemList } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection/DataSlotProblemList";
import type { DataSlotBindingStatus } from "@/lib/pluginDataSlots/getDataSlotBindingStatus/getDataSlotBindingStatus";
import type { DataSlotStatusRow } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection/useDataSlotStatusRows";
import type { ReactNode } from "react";

type Props = Readonly<{
  row: DataSlotStatusRow;
  localize: (value: string) => string;

  /** A settings admin's buttons for the slot, or nothing for others. */
  actions: ReactNode;
}>;

/** The color each status takes. Only a broken slot needs attention. */
const COLOR_BY_STATUS: Record<DataSlotBindingStatus["kind"], string> = {
  unbound: "neutral",
  bound: "success",
  broken: "danger",
};

/**
 * One data slot on a plugin's card: its title, whether it is bound, the
 * case type or dataset it reads, and why it is broken when it is.
 */
export function PluginDataSlotRow({
  row,
  localize,
  actions,
}: Props): JSX.Element {
  const { t } = useLingui();
  const sourceLabels = useDataSlotSourceLabels();
  const statusLabels: Record<DataSlotBindingStatus["kind"], string> = {
    unbound: t`Not bound`,
    bound: t`Bound`,
    broken: t`Broken`,
  };
  const { source, status } = row;
  return (
    <Stack gap="xxs">
      <Group justify="space-between" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          <Text size="sm" fw={500}>
            {localize(row.slot.title)}
          </Text>
          <Badge color={COLOR_BY_STATUS[status.kind]} variant="light">
            {statusLabels[status.kind]}
          </Badge>
        </Group>
        {actions}
      </Group>
      {source === undefined ? null : (
        <Text size="sm" c="dimmed">
          {sourceLabels[source.kind](source.name)}
        </Text>
      )}
      {status.kind === "broken" ? (
        <DataSlotProblemList
          slot={row.slot}
          localize={localize}
          problems={status.problems}
        />
      ) : null}
    </Stack>
  );
}
