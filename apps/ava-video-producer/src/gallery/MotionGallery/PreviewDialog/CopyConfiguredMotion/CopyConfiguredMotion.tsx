import { Icon } from "../../Icon";
import { makeStockRequestFromConfiguration } from "../../makeStockRequestFromConfiguration";
import css from "./CopyConfiguredMotion.module.css";
import type { Props as PreviewProps } from "../PreviewDialogContent/PreviewDialogContent";
import type { ReactNode } from "react";

type Props = Pick<
  PreviewProps,
  "contentState" | "preset" | "accent" | "background" | "onCopy"
>;
/** Copies the configured preset request from PreviewDetails. */
export function CopyConfiguredMotion({
  contentState,
  preset,
  accent,
  background,
  onCopy,
}: Readonly<Props>): ReactNode {
  return (
    <button
      className={css.copyConfiguredMotionButton}
      disabled={!contentState.isValid}
      onClick={() => {
        return onCopy(
          JSON.stringify(
            makeStockRequestFromConfiguration({
              preset,
              input: contentState.resolvedInput,
              accent,
              background,
            }),
            null,
            2,
          ),
          "Configured JSON copied",
        );
      }}
    >
      <Icon name="copy" size={16} />
      Copy configured JSON
    </button>
  );
}
