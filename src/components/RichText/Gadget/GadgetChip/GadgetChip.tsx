import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { VisuallyHidden } from "@mantine/core";
import { IconLock } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import classes from "@/components/RichText/Gadget/GadgetChip/GadgetChip.module.css";
import { GADGET_REGISTRY } from "@/components/RichText/Gadget/gadgetRegistry/gadgetRegistry";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type {
  GadgetDefinition,
  GadgetSummary,
} from "@/components/RichText/Gadget/gadgetRegistry/gadgetRegistry";
import type { ComponentPropsWithRef, ReactNode } from "react";

/** Props for the chip's button, such as a menu's trigger props and ref. */
type ChipButtonProps = Omit<
  ComponentPropsWithRef<"button">,
  "children" | "className" | "type"
>;

type Props = {
  gadgetRef: Gadget.Ref;

  /**
   * Whether the chip links to the gadget. An editor passes `false` so a
   * click never leaves the draft: the chip is then a button, which takes
   * `ChipButtonProps`. Defaults to `true`.
   */
  isLinked?: boolean;
} & ChipButtonProps;

/** The copy shown for a gadget node whose stored ref is malformed. */
const UNKNOWN_GADGET_LABEL = msg`Unavailable gadget`;

function GadgetChipBody({
  definition,
  summary,
}: {
  definition: GadgetDefinition;
  summary: GadgetSummary;
}): ReactNode {
  const { i18n } = useLingui();
  const { Icon } = definition;
  if (summary.status === "available") {
    return (
      <>
        <Icon size={13} aria-hidden className={classes.icon} />
        <span className={classes.label}>{summary.name}</span>
      </>
    );
  }
  if (summary.status === "unavailable") {
    return (
      <>
        <IconLock size={13} aria-hidden className={classes.icon} />
        <span className={classes.label}>
          {i18n._(definition.unavailableLabel)}
        </span>
      </>
    );
  }
  return (
    <>
      <Icon size={13} aria-hidden className={classes.icon} />
      <span className={classes.skeleton} aria-hidden />
      <VisuallyHidden>{i18n._(definition.loadingLabel)}</VisuallyHidden>
    </>
  );
}

function GadgetChipContent({
  gadgetRef,
  isLinked = true,
  ...buttonProps
}: Props): ReactNode {
  const definition = GADGET_REGISTRY[gadgetRef.gadgetType];
  const summary = definition.useGadgetSummary(gadgetRef, { withFacts: false });
  // The editor parses a chip back into a node from these attributes.
  const refAttributes = {
    "data-type": "gadgetLink",
    "data-gadget-type": gadgetRef.gadgetType,
    "data-gadget-id": gadgetRef.gadgetId,
    "data-sub-id": gadgetRef.subId ?? undefined,
    "aria-busy": summary.status === "loading" ? true : undefined,
    className: clsx(
      classes.chip,
      summary.status === "unavailable" && classes.unavailable,
    ),
  };
  const body = <GadgetChipBody definition={definition} summary={summary} />;

  if (!isLinked) {
    return (
      <button type="button" {...buttonProps} {...refAttributes}>
        {body}
      </button>
    );
  }
  if (summary.status === "available") {
    return (
      <Link {...summary.link} {...refAttributes}>
        {body}
      </Link>
    );
  }
  return <span {...refAttributes}>{body}</span>;
}

/**
 * An inline reference to a gadget inside rich text: the gadget's icon and
 * name, linking to it. Shows a skeleton while the gadget loads and a locked
 * "Unavailable" chip when the reader cannot open it. Use it wherever a
 * gadget link node is drawn, such as a comment being written or read.
 */
export function GadgetChip({ gadgetRef, ...props }: Props): ReactNode {
  // Each type calls different hooks, so a type change in place remounts.
  return (
    <GadgetChipContent
      key={gadgetRef.gadgetType}
      gadgetRef={gadgetRef}
      {...props}
    />
  );
}

/**
 * A locked chip for a gadget node whose stored ref is malformed, so the
 * node stays visible and can be selected and deleted. Use it wherever a
 * gadget node is drawn and its ref cannot be read.
 */
export function UnknownGadgetChip(): ReactNode {
  const { i18n } = useLingui();
  return (
    <span className={clsx(classes.chip, classes.unavailable)}>
      <IconLock size={13} aria-hidden className={classes.icon} />
      <span className={classes.label}>{i18n._(UNKNOWN_GADGET_LABEL)}</span>
    </span>
  );
}
