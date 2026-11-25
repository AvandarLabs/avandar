import { Button, Group, Menu } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";
import css from "./SourceChartMenu.module.css";
import type { ReactNode } from "react";

type Props = { frame: number };
/** Show the complete product save menu using deterministic film state. */
export function SourceChartMenu({ frame }: Readonly<Props>): ReactNode {
  return (
    <Group justify="flex-end" p="sm" className={css.sourceChartMenuToolbar}>
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
  );
}
