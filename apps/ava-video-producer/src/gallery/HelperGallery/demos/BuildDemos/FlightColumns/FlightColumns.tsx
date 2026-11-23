import { Motion } from "../../../../../motion";
import { BrandLockupMotion } from "../../../../../scenes/BrandLockupScene/BrandLockupMotion/BrandLockupMotion";
import { DemoTheme } from "../../DemoTheme";
import { DEMO_CANVAS } from "../../parts/DemoCanvas/DemoCanvas";
import { BuildDemosGalleryValues } from "../BuildDemosGalleryValues/BuildDemosGalleryValues";
import css from "./FlightColumns.module.css";
import type { ReactNode } from "react";

type Props = { flight: number; cover: number };

/** The mark's columns at one point of their flight, coloured by the cover. */
export function FlightColumns({ flight, cover }: Readonly<Props>): ReactNode {
  const colors = DemoTheme.useDemoColors();
  const background = Motion.mixToken({
    t: cover,
    from: colors.brand,
    to: colors.highlight,
  });
  return Array.from(
    { length: BuildDemosGalleryValues.BUILD.columns },
    (_, index) => {
      const rect = BrandLockupMotion.getFlightColumnRect({
        index,
        columns: BuildDemosGalleryValues.BUILD.columns,
        mark: BuildDemosGalleryValues.MARK,
        canvas: DEMO_CANVAS,
        progress: flight,
      });
      return (
        <span
          key={`flight-${index * 25}`}
          className={css.flightColumnsMarkColumn}
          style={{
            left: rect.x,
            top: rect.y,
            width: rect.width + 0.5,
            height: rect.height,
            background,
          }}
        />
      );
    },
  );
}
