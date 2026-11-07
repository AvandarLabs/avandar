import { useLingui } from "@lingui/react/macro";
import { Skeleton } from "@mantine/core";
import classes from "@/components/RichText/Gadget/GadgetCard/GadgetCard.module.css";
import type { GadgetSummary } from "@/components/RichText/Gadget/gadgetRegistry/gadgetRegistry";
import type { ReactNode } from "react";

type Props = { summary: GadgetSummary };

/** Stable keys for the three placeholder facts shown while a gadget loads. */
const SKELETON_FACT_KEYS = ["first", "second", "third"] as const;

/**
 * The body of a `GadgetCard`: the gadget's facts as a definition list, three
 * fact skeletons while it loads, or why it cannot be shown.
 */
export function GadgetCardBody({ summary }: Props): ReactNode {
  const { i18n, t } = useLingui();
  if (summary.status === "unavailable") {
    return (
      <div className={classes.body}>
        <div className={classes.unavailableText}>
          {t`It may have been deleted, or you don't have access. Ask the comment's author to share it.`}
        </div>
      </div>
    );
  }
  if (summary.status === "loading") {
    return (
      <div className={classes.body}>
        <div className={classes.facts}>
          {SKELETON_FACT_KEYS.map((key) => {
            return <Skeleton key={key} className={classes.factSkeleton} />;
          })}
        </div>
      </div>
    );
  }
  return (
    <div className={classes.body}>
      <dl className={classes.facts}>
        {summary.facts.map((fact) => {
          const label = i18n._(fact.label);
          return (
            <div key={label}>
              <dt className={classes.factLabel}>{label}</dt>
              <dd className={classes.factValue}>{fact.value}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
