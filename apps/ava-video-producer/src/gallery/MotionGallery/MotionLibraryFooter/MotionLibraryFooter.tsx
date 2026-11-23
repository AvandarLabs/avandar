import { STOCK_CATALOG } from "../../../stock/stockEntry";
import css from "./MotionLibraryFooter.module.css";
import type { ReactNode } from "react";

/** Shows the catalog edition and preset count below MotionLibrary. */
export function MotionLibraryFooter(): ReactNode {
  return (
    <footer className={css.motionLibraryFooterLibraryFooter}>
      <p>A visual vocabulary for your next explanation.</p>
      <span>CONCEPTUAL STUDIES / {STOCK_CATALOG.length} PRESETS / VOL. 01</span>
    </footer>
  );
}
