import { Button } from "@mantine/core";
import { isPluginIconComponent } from "@/lib/plugins/isPluginIconComponent/isPluginIconComponent";
import type { PluginMenuItem } from "@/lib/plugins/getMenuItemsFromActivePlugins/getMenuItemsFromActivePlugins";

type Props = Readonly<{
  items: readonly PluginMenuItem[];
  runningKey: string | undefined;
  isDisabled: boolean;
  onRunItem: (item: PluginMenuItem) => void;
}>;

/**
 * One outline button per plugin command, for a slot with room for only a few.
 * The button of the command that is running shows a loading state.
 */
export function PluginInlineButtons({
  items,
  runningKey,
  isDisabled,
  onRunItem,
}: Props): JSX.Element {
  return (
    <>
      {items.map((item) => {
        const { Icon } = item;
        return (
          <Button
            key={item.key}
            variant="outline"
            color="neutral"
            size="compact-sm"
            leftSection={
              isPluginIconComponent(Icon) ? (
                <Icon size={16} aria-hidden />
              ) : undefined
            }
            loading={runningKey === item.key}
            disabled={isDisabled}
            onClick={() => {
              onRunItem(item);
            }}
          >
            {item.title}
          </Button>
        );
      })}
    </>
  );
}
