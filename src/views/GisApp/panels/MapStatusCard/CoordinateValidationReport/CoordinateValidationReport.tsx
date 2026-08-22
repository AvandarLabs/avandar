import type { GeometryDropReport } from "@/views/GisApp/layers/makeFeatureCollectionFromRows/makeFeatureCollectionFromRows";
import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";

import { CoordinateValidationReason } from "@/views/GisApp/panels/MapStatusCard/CoordinateValidationReport/CoordinateValidationReason";
import css from "@/views/GisApp/panels/MapStatusCard/CoordinateValidationReport/CoordinateValidationReport.module.css";

type Props = {
  drops: readonly GeometryDropReport[];
  onBack: () => void;
  onSwapLatLng: () => void;
};

/** Presents the reasons latitude/longitude rows could not be mapped. */
export function CoordinateValidationReport({
  drops,
  onBack,
  onSwapLatLng,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <section
      className={css.coordinateValidationReport}
      aria-label={t`Coordinate validation report`}
    >
      <Button variant="subtle" onClick={onBack}>
        {t`Back`}
      </Button>
      <h3>{t`Coordinate validation report`}</h3>
      <ul className={css.coordinateValidationReportList}>
        {drops.map((drop) => {
          return (
            <CoordinateValidationReason
              key={drop.reason}
              drop={drop}
              onSwapLatLng={onSwapLatLng}
            />
          );
        })}
      </ul>
      <p>
        {t`Unmapped rows are still counted in this layer's totals. They are excluded from the map only.`}
      </p>
    </section>
  );
}
