import { Trans, useLingui } from "@lingui/react/macro";
import { ActionIcon, Badge, Group, SegmentedControl } from "@mantine/core";
import {
  IconAlertTriangle,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { Tooltip } from "@avandar/ui";
import { VizTypeSelect } from "@/components/VisualizationContainer/VizSettingsForm/VizTypeSelect/VizTypeSelect";
import type { DrawerTab } from "@/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawer";
import type { QueryEditorMode } from "@/views/DataExplorerApp/DataExplorerDrawer/QueryTabPanel/QueryTabPanel";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig";
import type { ReactNode } from "react";

type Props = {
  activeTab: DrawerTab;
  isCollapsed: boolean;
  queryEditorMode: QueryEditorMode;
  vizType: VizConfig.Type;

  /** False when the SQL has parts the manual form cannot represent. */
  isStructuredQueryInSync: boolean;

  onQueryEditorModeChange: (mode: QueryEditorMode) => void;
  onVizTypeChange: (vizType: VizConfig.Type) => void;
  onToggleCollapsed: () => void;
};

/**
 * The trailing half of the drawer's tab rail: the control scoped to the active
 * tab, plus the collapse toggle. Rendered through the shared `Tabs`
 * `listRightSection` slot, so it shares the row with the tab list and stays
 * visible while the drawer is collapsed.
 */
export function DataExplorerDrawerRail({
  activeTab,
  isCollapsed,
  queryEditorMode,
  vizType,
  isStructuredQueryInSync,
  onQueryEditorModeChange,
  onVizTypeChange,
  onToggleCollapsed,
}: Props): ReactNode {
  const { t } = useLingui();
  const isQueryTab = activeTab === "query";

  return (
    <Group gap="xs" wrap="nowrap">
        {isQueryTab && !isStructuredQueryInSync ?
          <Tooltip
            label={t`Parts of the SQL cannot be represented in the manual form.`}
          >
            <Badge
              color="warning"
              variant="light"
              size="sm"
              leftSection={<IconAlertTriangle size={11} />}
            >
              <Trans>Form is an approximation</Trans>
            </Badge>
          </Tooltip>
        : null}

        {isQueryTab ?
          <SegmentedControl
            size="xs"
            aria-label={t`Query editor mode`}
            value={queryEditorMode}
            onChange={(nextMode) => {
              if (nextMode === "manual" || nextMode === "sql") {
                onQueryEditorModeChange(nextMode);
              }
            }}
            data={[
              { value: "manual", label: t`Manual` },
              { value: "sql", label: "SQL" },
            ]}
          />
        : <VizTypeSelect
            size="xs"
            withLabel={false}
            value={vizType}
            onChange={onVizTypeChange}
          />
        }

        <Tooltip label={isCollapsed ? t`Expand` : t`Collapse`} openDelay={400}>
          <ActionIcon
            variant="subtle"
            color="neutral"
            size="md"
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? t`Expand drawer` : t`Collapse drawer`}
            onClick={onToggleCollapsed}
          >
            {isCollapsed ?
              <IconChevronUp size={16} />
            : <IconChevronDown size={16} />}
          </ActionIcon>
      </Tooltip>
    </Group>
  );
}
