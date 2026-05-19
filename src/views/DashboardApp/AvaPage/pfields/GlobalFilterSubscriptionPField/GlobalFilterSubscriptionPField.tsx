import {
  Alert,
  Checkbox,
  ScrollArea,
  SegmentedControl,
  Stack,
  Text,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import type {
  GlobalFilterSubscription,
  GlobalFilterSubscriptionMode,
} from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/dataVizFilters";
import { DashboardFilterStateManager } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";
import type { AvaPageFieldProps } from "@/views/DashboardApp/AvaPage/AvaPage.types";

type Props = AvaPageFieldProps<GlobalFilterSubscription>;

const MODE_DESCRIPTIONS: Record<GlobalFilterSubscriptionMode, string> = {
  all: "Apply every global filter on the dashboard.",
  selected: "Pick which global filters apply to this visualization.",
  none: "Ignore all global filters — this visualization is unfiltered.",
};

/**
 * Puck side-panel field that controls how a DataViz block reacts to
 * dashboard-wide FilterPBlocks.
 *
 * Reads the live list of registered FilterPBlocks from the dashboard's
 * filter state manager so the "selected" mode renders an explicit
 * checkbox list rather than asking the editor to type filter ids.
 */
export function GlobalFilterSubscriptionPField({
  value,
  onChange,
}: Props): JSX.Element {
  const { filtersById } = DashboardFilterStateManager.useState();
  const registeredFilters = Object.values(filtersById);

  const _setMode = (mode: GlobalFilterSubscriptionMode): void => {
    onChange({
      mode,
      // Reset the explicit subscription list when leaving "selected" so
      // future toggles start clean.
      subscribedFilterIds:
        mode === "selected" ? value.subscribedFilterIds : [],
    });
  };

  const _toggleFilter = (filterId: string, checked: boolean): void => {
    const next = new Set(value.subscribedFilterIds);
    if (checked) next.add(filterId);
    else next.delete(filterId);
    onChange({
      mode: "selected",
      subscribedFilterIds: Array.from(next),
    });
  };

  return (
    <Stack gap={6}>
      <SegmentedControl
        size="xs"
        value={value.mode}
        onChange={(m) => {
          _setMode(m as GlobalFilterSubscriptionMode);
        }}
        data={[
          { value: "all", label: "All" },
          { value: "selected", label: "Some" },
          { value: "none", label: "None" },
        ]}
        fullWidth
      />
      <Text size="xs" c="dimmed">
        {MODE_DESCRIPTIONS[value.mode]}
      </Text>

      {value.mode === "selected" ?
        registeredFilters.length === 0 ?
          <Alert
            color="blue"
            variant="light"
            icon={<IconInfoCircle size={14} />}
          >
            <Text size="xs">
              Add a Filter block to the dashboard to enable global filtering
              for this visualization.
            </Text>
          </Alert>
        : <ScrollArea.Autosize mah={200}>
            <Stack gap={4}>
              {registeredFilters.map((f) => {
                return (
                  <Checkbox
                    key={f.filterId}
                    size="xs"
                    label={
                      <Text size="xs">
                        {f.label}{" "}
                        <Text component="span" c="dimmed">
                          ({f.columnName})
                        </Text>
                      </Text>
                    }
                    checked={value.subscribedFilterIds.includes(f.filterId)}
                    onChange={(e) => {
                      _toggleFilter(f.filterId, e.currentTarget.checked);
                    }}
                  />
                );
              })}
            </Stack>
          </ScrollArea.Autosize>

      : null}
    </Stack>
  );
}
