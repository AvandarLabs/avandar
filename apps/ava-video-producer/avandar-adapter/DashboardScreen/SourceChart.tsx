import { Button, Group, Menu } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";
import { VisualizationContainer } from "@/components/VisualizationContainer/VisualizationContainer";
import { EXPLORER_DISTRICT_COUNTS } from "../Explorer.constants";
import {
  chartColumns,
  chartConfig,
} from "../shims/import-dashboard/DashboardFixtureContext";
import css from "./DashboardScreen.module.css";

/** The Data Explorer chart leaf this film saves to a dashboard, with its real Save menu. */
export function SourceChart({ frame }: { frame: number }) {
  return (
    <div className={css.sourceChartRoot}>
      <Group
        justify="flex-end"
        p="sm"
        style={{ borderBottom: "1px solid var(--ava-border-default)" }}
      >
        {/* Markup and complete available item list from DataExplorerSaveMenu and
          DataExplorerSaveAsMenuItems; handlers are deterministic film state. */}
        <Menu
          shadow="md"
          width={240}
          opened={frame >= 54 && frame < 100}
          withinPortal={false}
          transitionProps={{ duration: 0 }}
        >
          <Menu.Target>
            <Button
              data-video-target="dashboard-save-menu"
              variant="outline"
              color="neutral"
              size="compact-sm"
              rightSection={<IconChevronDown size={16} />}
            >
              Save
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item>Save as new dataset</Menu.Item>
            <Menu.Item data-video-target="dashboard-save-option">
              Save to dashboard
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
      <div className={css.sourceChartBody}>
        <VisualizationContainer
          columns={chartColumns}
          data={EXPLORER_DISTRICT_COUNTS}
          dateColumns={new Set()}
          vizConfig={chartConfig}
        />
      </div>
    </div>
  );
}
