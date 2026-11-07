import { usePluginMenuItems } from "@/lib/plugins/PluginHost/usePluginMenuItems";
import { PluginInlineButtons } from "@/lib/plugins/PluginMenuSlot/PluginInlineButtons";
import { PluginOverflowMenu } from "@/lib/plugins/PluginMenuSlot/PluginOverflowMenu";
import { usePluginCommandRunner } from "@/lib/plugins/PluginMenuSlot/usePluginCommandRunner";
import type { PluginMenuItem } from "@/lib/plugins/getMenuItemsFromActivePlugins/getMenuItemsFromActivePlugins";
import type { SlotId, WhenFacts } from "@avandar/plugin-manifest/runtime";
import type { PluginInvocationContext } from "@avandar/plugin-sdk";

const MAX_INLINE_ITEMS = 2;

type Props = Readonly<{
  slotId: SlotId;

  /**
   * What a command runs on, such as the current query result. Commands are
   * disabled while it is undefined.
   */
  context: PluginInvocationContext | undefined;

  /** The slot's current facts, which the plugins' `when` conditions read. */
  facts: WhenFacts;
}>;

/**
 * Renders the commands the workspace's plugins place in a slot, such as the
 * Data Explorer toolbar, and runs the one a user picks. Up to two show as
 * buttons, and more collapse into one "Plugins" menu. It renders nothing when
 * no plugin has a command for the slot.
 */
export function PluginMenuSlot({
  slotId,
  context,
  facts,
}: Props): JSX.Element | null {
  const items = usePluginMenuItems({ slotId, facts });
  const { runningKey, run } = usePluginCommandRunner(context);

  if (items.length === 0) {
    return null;
  }
  const ItemList =
    items.length <= MAX_INLINE_ITEMS ? PluginInlineButtons : PluginOverflowMenu;
  return (
    <ItemList
      items={items}
      runningKey={runningKey}
      isDisabled={context === undefined || runningKey !== undefined}
      onRunItem={(item: PluginMenuItem) => {
        void run(item);
      }}
    />
  );
}
