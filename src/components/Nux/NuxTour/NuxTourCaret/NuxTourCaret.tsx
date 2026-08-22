import css from "@/components/Nux/NuxTour/NuxTourCaret/NuxTourCaret.module.css";
import type { ReactNode } from "react";
import type { ArrowRenderProps } from "react-joyride";

/**
 * The tooltip caret, drawn as a bordered diamond the way Mantine paints
 * Popover carets.
 *
 * Joyride's default SVG sits fully outside the tooltip, so the Card hairline
 * shows through the caret's base and the floater drop-shadow makes the
 * triangle look like a second floating shape. This diamond overlaps the Card
 * edge and clips the inner half so the two pieces read as one surface.
 */
export function NuxTourCaret({
  placement,
}: Readonly<ArrowRenderProps>): ReactNode {
  const side = placement.split("-")[0] ?? "bottom";
  return <span className={css.nuxTourCaret} data-side={side} aria-hidden />;
}
