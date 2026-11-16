import classes from "@/views/IndividualManagerApp/DetailPaneMessage/DetailPaneMessage.module.css";
import type { ReactNode } from "react";

/**
 * Centers an empty state or error in the records detail pane, and scrolls it
 * when the pane is shorter than the message.
 */
export function DetailPaneMessage({
  children,
}: Readonly<{ children: ReactNode }>): ReactNode {
  return (
    <div className={classes.pane}>
      <div className={classes.message}>{children}</div>
    </div>
  );
}
