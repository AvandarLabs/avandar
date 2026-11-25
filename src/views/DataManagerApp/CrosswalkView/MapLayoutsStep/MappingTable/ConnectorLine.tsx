import css from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingTable/MappingTable.module.css";
import type { ConnectorVariant } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingTable/getConnectorVariant";
import type { ReactNode } from "react";

/**
 * The line from the reference column to its fill. Decorative and hidden
 * from screen readers: the Filled from and Match cells carry the same
 * information as text.
 */
export function ConnectorLine(
  props: Readonly<{ variant: ConnectorVariant }>,
): ReactNode {
  return (
    <span
      aria-hidden="true"
      className={css.connectorLine}
      data-variant={props.variant}
    />
  );
}
