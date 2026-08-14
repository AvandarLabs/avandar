import css from "@/views/GisApp/MapCanvas/MapStatusOverlay/StatusShell/StatusShell.module.css";
import type { ReactNode } from "react";

type Props = { children: ReactNode };

/** Accessible container that announces changes to the map's status. */
export function StatusShell({ children }: Readonly<Props>): ReactNode {
  return (
    <div className={css.statusShell} role="status" aria-live="polite">
      {children}
    </div>
  );
}
