import { useLingui } from "@lingui/react/macro";
import { Skeleton, VisuallyHidden } from "@mantine/core";
import { IconArrowRight, IconLock } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import classes from "@/components/RichText/Gadget/GadgetCard/GadgetCard.module.css";
import type {
  GadgetDefinition,
  GadgetSummary,
} from "@/components/RichText/Gadget/gadgetRegistry/gadgetRegistry";
import type { ReactNode } from "react";

type Props = {
  definition: GadgetDefinition;
  summary: GadgetSummary;

  /** The id the card's region is labelled by, set on the title. */
  titleId: string;
  menu: ReactNode;
};

function GadgetCardTitle({
  definition,
  summary,
  titleId,
}: Omit<Props, "menu">): ReactNode {
  const { i18n, t } = useLingui();
  const nounLabel = i18n._(definition.noun);
  if (summary.status === "unavailable") {
    return (
      <span id={titleId} className={classes.unavailableName}>
        {t`Unavailable ${nounLabel}`}
      </span>
    );
  }
  return (
    <>
      {summary.status === "available" ? (
        <span id={titleId} className={classes.name}>
          {summary.name}
        </span>
      ) : (
        <>
          <VisuallyHidden
            id={titleId}
          >{t`Loading ${nounLabel}`}</VisuallyHidden>
          <Skeleton className={classes.nameSkeleton} />
        </>
      )}
      <span className={classes.kind}>{i18n._(definition.label)}</span>
    </>
  );
}

/**
 * The header band of a `GadgetCard`: icon tile, title, type, the card's menu,
 * and an Open link once the gadget is available.
 */
export function GadgetCardHeader({
  definition,
  summary,
  titleId,
  menu,
}: Props): ReactNode {
  const { t } = useLingui();
  const Icon = summary.status === "unavailable" ? IconLock : definition.Icon;
  return (
    <div className={classes.header}>
      <span className={classes.iconTile}>
        <Icon size={16} aria-hidden />
      </span>
      <div className={classes.titleGroup}>
        <GadgetCardTitle
          definition={definition}
          summary={summary}
          titleId={titleId}
        />
      </div>
      {menu}
      {summary.status === "available" ? (
        <Link
          {...summary.link}
          aria-label={t`Open ${summary.name}`}
          className={classes.openLink}
        >
          {t`Open`}
          <IconArrowRight size={13} aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
