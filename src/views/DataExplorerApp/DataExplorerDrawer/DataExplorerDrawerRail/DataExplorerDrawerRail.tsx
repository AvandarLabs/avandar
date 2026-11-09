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
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { DrawerTab } from "@/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawer";
import type { QueryEditorMode } from "@/views/DataExplorerApp/DataExplorerDrawer/QueryTabPanel";
import type { ReactNode } from "react";

type Props = {
  activeTab: DrawerTab;
  isCollapsed: boolean;

  /** Id of the collapsible region the toggle reveals, for `aria-controls`. */
  regionId: string;

  queryEditorMode: QueryEditorMode;

  /** The active chart config, whose type the chart-type control shows. */
  vizConfig: AvaVizConfig.T;

  /**
   * Columns of the latest query result, which a picked plugin chart type
   * fills its required column settings from.
   */
  columns: readonly QueryResult.ColumnWithId[];

  /** False when the SQL has parts the manual form cannot represent. */
  isStructuredQueryInSync: boolean;

  onQueryEditorModeChange: (mode: QueryEditorMode) => void;

  /** Called with the picked built-in viz type or plugin chart config. */
  onVizTypeChange: (
    target: AvaVizConfig.BuiltInType | AvaVizConfig.Plugin,
  ) => void;
  onToggleCollapsed: () => void;
};

/**
 * The trailing half of the drawer's tab rail: the control scoped to the active
 * tab, plus the collapse toggle. Rendered through the shared `Tabs`
 * `listRightSection` slot so it shares the row with the tab list.
 *
 * While the drawer is shut there is no open tab, so the tab-scoped control
 * and the out-of-sync badge stay hidden. The badge reports on the query
 * itself, so it returns on either tab once the drawer opens.
 */
export function DataExplorerDrawerRail({
  activeTab,
  isCollapsed,
  regionId,
  queryEditorMode,
  vizConfig,
  columns,
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
          vizConfig={vizConfig}
          columns={columns}
          onChange={onVizTypeChange}
        />
      );
    },
  });

  return (
    <Group gap="xs" wrap="nowrap">
      {isCollapsed || isStructuredQueryInSync ? null : (
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
