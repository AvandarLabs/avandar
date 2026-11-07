import { useLingui } from "@lingui/react/macro";
import { VisuallyHidden } from "@mantine/core";
import { IconLock } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import classes from "@/components/RichText/Gadget/GadgetChip/GadgetChip.module.css";
import { GADGET_REGISTRY } from "@/components/RichText/Gadget/gadgetRegistry/gadgetRegistry";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { ReactNode } from "react";

type Props = { gadgetRef: Gadget.Ref };

function GadgetChipContent({ gadgetRef }: Props): ReactNode {
  const { i18n } = useLingui();
  const definition = GADGET_REGISTRY[gadgetRef.gadgetType];
  const summary = definition.useGadgetSummary(gadgetRef, { withFacts: false });
  const { Icon } = definition;
  // The editor parses a chip back into a node from these attributes.
  const refAttributes = {
    "data-type": "gadgetLink",
    "data-gadget-type": gadgetRef.gadgetType,
    "data-gadget-id": gadgetRef.gadgetId,
    "data-sub-id": gadgetRef.subId ?? undefined,
  };

  if (summary.status === "available") {
    return (
      <Link {...summary.link} {...refAttributes} className={classes.chip}>
        <Icon size={13} aria-hidden className={classes.icon} />
        <span className={classes.label}>{summary.name}</span>
      </Link>
    );
  }
  if (summary.status === "unavailable") {
    return (
      <span
        {...refAttributes}
        className={clsx(classes.chip, classes.unavailable)}
      >
        <IconLock size={13} aria-hidden className={classes.icon} />
        <span className={classes.label}>
          {i18n._(definition.unavailableLabel)}
        </span>
      </span>
    );
  }
  return (
    <span {...refAttributes} className={classes.chip} aria-busy="true">
      <Icon size={13} aria-hidden className={classes.icon} />
      <span className={classes.skeleton} aria-hidden />
      <VisuallyHidden>{i18n._(definition.loadingLabel)}</VisuallyHidden>
    </span>
  );
}

/**
 * An inline reference to a gadget inside rich text: the gadget's icon and
 * name, linking to it. Shows a skeleton while the gadget loads and a locked
 * "Unavailable" chip when the reader cannot open it. Use it wherever a
 * gadget link node is drawn, such as a comment being written or read.
 */
export function GadgetChip({ gadgetRef }: Props): ReactNode {
  // Each type calls different hooks, so a type change in place remounts.
  return <GadgetChipContent key={gadgetRef.gadgetType} gadgetRef={gadgetRef} />;
}
