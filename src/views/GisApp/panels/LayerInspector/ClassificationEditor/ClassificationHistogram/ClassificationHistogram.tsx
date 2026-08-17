import { useLingui } from "@lingui/react/macro";
import css from "./ClassificationHistogram.module.css";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = { entries: readonly MapLayer.LegendEntry[] };

/** Summarizes persisted classified counts as a compact histogram. */
export function ClassificationHistogram({ entries }: Props): ReactNode {
  const { t } = useLingui();
  const values = entries.filter(({ type }) => {
    return type === "value";
  });
  const maximum = Math.max(
    1,
    ...values.map(({ count }) => {
      return count;
    }),
  );
  if (values.length === 0) {
    return <p>{t`No classified values are available yet.`}</p>;
  }
  return (
    <div className={css.classificationHistogram} aria-label={t`Value distribution`}>
      {values.map((entry, index) => {
        return (
          <span
            aria-label={t`Class ${index + 1}: ${entry.count} values`}
            className={css.classificationHistogramBar}
            key={index}
            style={{ height: `${(entry.count / maximum) * 100}%` }}
          />
        );
      })}
    </div>
  );
}
