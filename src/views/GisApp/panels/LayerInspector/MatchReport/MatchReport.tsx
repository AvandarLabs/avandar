import { useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { DiagnosticSample } from "@/views/GisApp/panels/LayerInspector/MatchReport/DiagnosticSample/DiagnosticSample";
import css from "./MatchReport.module.css";
import type { MapLayerSpatialDiagnostics } from "@/clients/maps/MapLayerSpatialQuery/MapLayerSpatialQuery.types";
import type { ReactNode } from "react";

type Props = {
  diagnostics: MapLayerSpatialDiagnostics;
  onBack: () => void;
};

/** Presents boundary-key match totals and bounded diagnostic samples. */
export function MatchReport({ diagnostics, onBack }: Props): ReactNode {
  const { t } = useLingui();
  return (
    <section className={css.matchReport} aria-label={t`Boundary match report`}>
      <Button variant="subtle" onClick={onBack}>
        {t`Back`}
      </Button>
      <h3>{t`Boundary match report`}</h3>
      <ul className={css.matchReportList}>
        <li>{t`${diagnostics.unmatchedSourceKeyCount ?? 0} unmatched source keys`}</li>
        <li>{t`${diagnostics.unmatchedBoundaryCount ?? 0} boundaries without data`}</li>
        <li>{t`${diagnostics.duplicateBoundaryKeyCount ?? 0} duplicate boundary keys`}</li>
        <li>{t`${diagnostics.ambiguousSourceKeyCount ?? 0} ambiguous source keys`}</li>
      </ul>
      <DiagnosticSample values={diagnostics.unmatchedSourceKeySamples} />
      <DiagnosticSample values={diagnostics.duplicateBoundaryKeySamples} />
      <DiagnosticSample values={diagnostics.ambiguousSourceKeySamples} />
    </section>
  );
}
