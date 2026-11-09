import { usePluginMenuItems } from "@/lib/plugins/PluginHost/usePluginMenuItems";
import { PluginInlineButtons } from "@/lib/plugins/PluginMenuSlot/PluginInlineButtons";
import { PluginOverflowMenu } from "@/lib/plugins/PluginMenuSlot/PluginOverflowMenu";
import { usePluginCommandRunner } from "@/lib/plugins/PluginMenuSlot/usePluginCommandRunner/usePluginCommandRunner";
import type { PluginMenuItem } from "@/lib/plugins/getMenuItemsFromActivePlugins/getMenuItemsFromActivePlugins";
import type { SlotId, WhenFacts } from "@avandar/plugin-manifest/runtime";
import type { PluginInvocationContext } from "@avandar/plugin-sdk";

const MAX_INLINE_ITEMS = 2;

type Props = Readonly<{
  slotId: SlotId;

  /**
   * Builds what a command runs on, such as the current query result. The slot
   * calls it only when a command is clicked, so whatever it registers is
   * created only for a command that runs. Commands are disabled while it is
   * undefined.
   */
  getContext: (() => PluginInvocationContext) | undefined;

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
  getContext,
  facts,
}: Props): JSX.Element | null {
  const items = usePluginMenuItems({ slotId, facts });
  const { runningKey, run } = usePluginCommandRunner(getContext);

  if (items.length === 0) {
    return null;
  }
  const ItemList =
    items.length <= MAX_INLINE_ITEMS ? PluginInlineButtons : PluginOverflowMenu;
  return (
    <ItemList
      items={items}
      runningKey={runningKey}
      isDisabled={getContext === undefined || runningKey !== undefined}
      onRunItem={(item: PluginMenuItem) => {
        void run(item);
      }}
    />
  );
}
