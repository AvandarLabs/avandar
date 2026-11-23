import { GRAPH_ITEM_GAP, GRAPH_ITEM_PITCH } from "../../layout/GraphLayout";
import css from "./GraphNodeItems.module.css";
import type { Props } from "./GraphNodeItems.types";
import type { CSSProperties, ReactNode } from "react";
/** Vertical item entry rise, in pixels. */
const ITEM_RISE = 6;
/** Fixed graph item font size, in pixels. */
const GRAPH_ITEM_FONT_SIZE = 19;
const ITEM_LIST_STYLE: CSSProperties = {
  margin: `${GRAPH_ITEM_GAP}px 0 0`,
  padding: 0,
  listStyle: "none",
};

/** A node's list items, cascading in two list staggers apart under its
 *  label. */
export function GraphNodeItems({
  node,
  frame,
  at,
  motion,
  color,
}: Readonly<Props>): ReactNode {
  if (!node.items?.length) {
    return null;
  }
  return (
    <ul style={ITEM_LIST_STYLE}>
      {node.items.map((item, index) => {
        return (
          // prettier-ignore
          // These stateless text nodes are fixed wrapped-line
          // slots within one keyed node. Duplicate lines are
          // valid.
          // react-doctor-disable-next-line no-array-index-as-key
          <li
            key={`${index}-${item}`}
            className={css.graphNodeItemsli1}
            style={{
              height: GRAPH_ITEM_PITCH,
              fontSize: GRAPH_ITEM_FONT_SIZE,
              lineHeight: `${GRAPH_ITEM_PITCH}px`,
              color,
              ...motion.enter(
                frame,
                at + index * motion.stagger.list * 2,
                { y: ITEM_RISE },
              ),
            }}
          >
            {item}
          </li>
        );
      })}
    </ul>
  );
}
