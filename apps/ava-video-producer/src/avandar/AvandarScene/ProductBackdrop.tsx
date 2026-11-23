import { useVideoProps } from "../../videoTheme/videoThemeHelpers";
import type { ReactNode } from "react";

type Props = {
  width: number;
  height: number;
  children: ReactNode;
};
/**
 * The product stage's box, painted with `components.ProductFrame.backdrop`
 * behind the product UI.
 */
export function ProductBackdrop({
  width,
  height,
  children,
}: Readonly<Props>): ReactNode {
  const { backdrop } = useVideoProps({
    name: "ProductFrame",
    props: {},
  });
  return (
    <div
      style={{
        width,
        height,
        position: "relative",
        background: backdrop,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}
