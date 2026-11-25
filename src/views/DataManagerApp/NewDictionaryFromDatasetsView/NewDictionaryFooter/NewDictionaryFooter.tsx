import { Group } from "@mantine/core";
import css from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryFooter/NewDictionaryFooter.module.css";
import type { ReactNode } from "react";

type Props = {
  /** The leading edge: Back, or a note about the step. */
  start?: ReactNode;
  /** The step's actions on the trailing edge, the primary one last. */
  children: ReactNode;
};

/**
 * The bar at the bottom of each step of learning a dictionary. It holds
 * the step's actions, so they stay in reach while a long table scrolls.
 */
export function NewDictionaryFooter({
  start,
  children,
}: Readonly<Props>): ReactNode {
  return (
    // `data-sticky-action-bar` is what the NUX checklist and toasts clear.
    <div className={css.newDictionaryFooter} data-sticky-action-bar>
      <Group justify="space-between" gap="md" wrap="nowrap">
        <Group gap="sm" miw={0}>
          {start}
        </Group>
        <Group gap="sm" wrap="nowrap">
          {children}
        </Group>
      </Group>
    </div>
  );
}
