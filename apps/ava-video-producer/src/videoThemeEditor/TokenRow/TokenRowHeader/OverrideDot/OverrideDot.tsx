import { clsx } from "clsx";
import css from "./OverrideDot.module.css";
import type { TokenRow } from "../../../tokenRows/tokenRows";
import type { ReactNode } from "react";

type Props = Readonly<{ state: TokenRow["overrideState"] }>;

/**
 * A dot marking a row that is edited, or saved for one motion or composition
 * only.
 */
export function OverrideDot({ state }: Props): ReactNode {
  if (state === "none") {
    return null;
  }
  return (
    <span
      className={clsx(
        css.overrideDot,
        state === "saved" && css.overrideDotSaved,
      )}
      role="img"
      aria-label={
        state === "draft"
          ? "Edited, not saved"
          : "Saved for this motion or composition only"
      }
    />
  );
}
