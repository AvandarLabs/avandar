import { Trans, useLingui } from "@lingui/react/macro";
import {
  Alert,
  Checkbox,
  ScrollArea,
  SegmentedControl,
  Stack,
  Text,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { DataVizFilters } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";
import { DashboardFilterStateManager } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";
import type { AvaPageFieldProps } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type {
  GlobalFilterSubscription,
  GlobalFilterSubscriptionMode,
} from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";
import type { ReactElement } from "react";

type Props = AvaPageFieldProps<GlobalFilterSubscription>;

function useModeDescriptions(): Record<GlobalFilterSubscriptionMode, string> {
  const { t } = useLingui();
  return {
    all: t`Apply every global filter on the dashboard.`,
    selected: t`Pick which global filters apply to this visualization.`,
    none: t`Ignore all global filters: this visualization is unfiltered.`,
  };
}

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
}: Props): ReactElement {
  const { t } = useLingui();
  const modeDescriptions = useModeDescriptions();
  const { filtersById } = DashboardFilterStateManager.useState();
  const registeredFilters = Object.values(filtersById);

  const subscription = value ?? DataVizFilters.defaultGlobalFilterSubscription;
  const subscribedFilterIds = new Set(subscription.subscribedFilterIds);

  const _setMode = (mode: GlobalFilterSubscriptionMode): void => {
    onChange({
      mode,
      // Reset the explicit subscription list when leaving "selected" so
      // future toggles start clean.
      subscribedFilterIds:
        mode === "selected" ? subscription.subscribedFilterIds : [],
    });
  };

  const _toggleFilter = (filterId: string, checked: boolean): void => {
    const next = new Set(subscription.subscribedFilterIds);
    if (checked) {
      next.add(filterId);
    } else {
      next.delete(filterId);
    }
    onChange({
      mode: "selected",
      subscribedFilterIds: Array.from(next),
    });
  };

  return (
    <Stack gap={6}>
      <SegmentedControl
        size="xs"
        value={subscription.mode}
        onChange={(m) => {
          _setMode(m as GlobalFilterSubscriptionMode);
        }}
        data={[
          { value: "all", label: t`All` },
          { value: "selected", label: t`Some` },
          { value: "none", label: t`None` },
        ]}
        fullWidth
      />
      <Text size="xs" c="dimmed">
        {modeDescriptions[subscription.mode]}
      </Text>

      {subscription.mode === "selected" ? (
        registeredFilters.length === 0 ? (
          <Alert
            color="blue"
            variant="light"
            icon={<IconInfoCircle size={14} />}
          >
            <Text size="xs">
              <Trans>
                Add a Filter block to the dashboard to enable global filtering
                for this visualization.
              </Trans>
            </Text>
          </Alert>
        ) : (
          <ScrollArea.Autosize mah={200}>
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
                    checked={subscribedFilterIds.has(f.filterId)}
                    onChange={(e) => {
                      _toggleFilter(f.filterId, e.currentTarget.checked);
                    }}
                  />
                );
              })}
            </Stack>
          </ScrollArea.Autosize>
        )
      ) : null}
    </Stack>
  );
}
