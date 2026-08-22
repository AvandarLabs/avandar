import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig";
import type { DrawerTab } from "@/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawer";
import type { QueryEditorMode } from "@/views/DataExplorerApp/DataExplorerDrawer/QueryTabPanel";
import type { ReactNode } from "react";

import { Tooltip } from "@avandar/ui";
import { matchLiteral } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { ActionIcon, Badge, Group, SegmentedControl } from "@mantine/core";
import {
  IconAlertTriangle,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";

import { VizTypeSelect } from "@/components/VisualizationContainer/VizSettingsForm/VizTypeSelect/VizTypeSelect";
import { QUERY_EDITOR_MODES } from "@/views/DataExplorerApp/DataExplorerDrawer/QueryTabPanel";

type Props = {
  activeTab: DrawerTab;
  isCollapsed: boolean;

  /** Id of the collapsible region the toggle reveals, for `aria-controls`. */
  regionId: string;

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
 * `listRightSection` slot so it shares the row with the tab list.
 *
 * While the drawer is shut there is no open tab, so the tab-scoped control is
 * hidden. The out-of-sync badge is not tab-scoped: it reports on the query
 * itself, so it survives collapsing whichever tab was last showing.
 */
export function DataExplorerDrawerRail({
  activeTab,
  isCollapsed,
  regionId,
  queryEditorMode,
  vizType,
  isStructuredQueryInSync,
  onQueryEditorModeChange,
  onVizTypeChange,
  onToggleCollapsed,
}: Props): ReactNode {
  const { t } = useLingui();

  const editorModeControl = (
    <SegmentedControl
      size="xs"
      aria-label={t`Query editor mode`}
      value={queryEditorMode}
      onChange={(nextMode) => {
        // Mantine hands back a bare string, so narrow it against the same
        // list that produced the options.
        const mode = QUERY_EDITOR_MODES.find((candidate) => {
          return candidate === nextMode;
        });
        if (mode !== undefined) {
          onQueryEditorModeChange(mode);
        }
      }}
      data={[
        { value: "manual", label: t`Manual` },
        { value: "sql", label: "SQL" },
      ]}
    />
  );

  // Exhaustive, so a third drawer tab cannot silently inherit another tab's
  // control.
  const tabScopedControl = matchLiteral(activeTab, {
    query: () => {
      return editorModeControl;
    },
    visualizations: () => {
      return (
        <VizTypeSelect
          size="xs"
          withLabel={false}
          value={vizType}
          onChange={onVizTypeChange}
        />
      );
    },
  });

  return (
    <Group gap="xs" wrap="nowrap">
      {isStructuredQueryInSync ? null : (
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
      )}

      {isCollapsed ? null : tabScopedControl}

      <Tooltip label={isCollapsed ? t`Expand` : t`Collapse`} openDelay={400}>
        <ActionIcon
          variant="subtle"
          color="neutral"
          size="md"
          aria-expanded={!isCollapsed}
          aria-controls={regionId}
          aria-label={isCollapsed ? t`Expand drawer` : t`Collapse drawer`}
          onClick={onToggleCollapsed}
        >
          {isCollapsed ? (
            <IconChevronUp size={16} />
          ) : (
            <IconChevronDown size={16} />
          )}
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
