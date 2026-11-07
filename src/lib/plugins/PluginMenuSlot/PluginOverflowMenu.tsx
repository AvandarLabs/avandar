import { useLingui } from "@lingui/react/macro";
import { Button, Menu } from "@mantine/core";
import { IconPuzzle } from "@tabler/icons-react";
import { POPOVER_Z_INDEX } from "@/config/Theme";
import type { PluginMenuItem } from "@/lib/plugins/getMenuItemsFromActivePlugins/getMenuItemsFromActivePlugins";

type Props = Readonly<{
  items: readonly PluginMenuItem[];
  runningKey: string | undefined;
  isDisabled: boolean;
  onRunItem: (item: PluginMenuItem) => void;
}>;

/**
 * One "Plugins" button that opens a menu of plugin commands, for a slot with
 * more commands than fit as buttons. The button shows a loading state while
 * any of the commands is running.
 */
export function PluginOverflowMenu({
  items,
  runningKey,
  isDisabled,
  onRunItem,
}: Props): JSX.Element {
  const { t } = useLingui();
  return (
    <Menu position="bottom-end" zIndex={POPOVER_Z_INDEX}>
      <Menu.Target>
        <Button
          variant="outline"
          color="neutral"
          size="compact-sm"
          leftSection={<IconPuzzle size={16} aria-hidden />}
          loading={runningKey !== undefined}
        >
          {t`Plugins`}
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        {items.map((item) => {
          const { Icon } = item;
          return (
            <Menu.Item
              key={item.key}
              leftSection={Icon ? <Icon size={16} aria-hidden /> : undefined}
              disabled={isDisabled}
              onClick={() => {
                onRunItem(item);
              }}
            >
              {item.title}
            </Menu.Item>
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );
}
