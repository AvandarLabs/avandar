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
  /** The parts of a gadget type the header draws. */
  definition: Pick<
    GadgetDefinition,
    "Icon" | "label" | "loadingLabel" | "unavailableLabel"
  >;
  summary: GadgetSummary;

  /** The id the card's group is labelled by, set on the title. */
  titleId: string;
  menu: ReactNode;
};

function GadgetCardTitle({
  definition,
  summary,
  titleId,
}: Omit<Props, "menu">): ReactNode {
  const { i18n } = useLingui();
  if (summary.status === "unavailable") {
    return (
      <span id={titleId} className={classes.unavailableName}>
        {i18n._(definition.unavailableLabel)}
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
          <VisuallyHidden id={titleId}>
            {i18n._(definition.loadingLabel)}
          </VisuallyHidden>
          <Skeleton h={14} w={160} className={classes.nameSkeleton} />
        </>
      )}
      <span className={classes.kind}>{i18n._(definition.label)}</span>
    </>
  );
}

/**
 * The header band of a `GadgetCard`: icon tile, title, type, the card's menu,
 * and an Open link once the gadget is available, unless a menu is given.
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
      {/* A menu brings its own Open action, which keeps an editor's draft. */}
      {summary.status === "available" && menu === undefined ? (
        <Link
          {...summary.link}
          aria-label={t`Open ${summary.name}`}
          className={classes.openLink}
        >
          {t`Open`}
          <IconArrowRight size={13} aria-hidden className={classes.openArrow} />
        </Link>
      ) : null}
    </div>
  );
}
