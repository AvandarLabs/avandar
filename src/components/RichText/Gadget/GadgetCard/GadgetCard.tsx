import { useId } from "react";
import classes from "@/components/RichText/Gadget/GadgetCard/GadgetCard.module.css";
import { GadgetCardBody } from "@/components/RichText/Gadget/GadgetCard/GadgetCardBody";
import { GadgetCardHeader } from "@/components/RichText/Gadget/GadgetCard/GadgetCardHeader";
import { GADGET_REGISTRY } from "@/components/RichText/Gadget/gadgetRegistry/gadgetRegistry";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { ReactNode } from "react";

type Props = {
  gadgetRef: Gadget.Ref;

  /** Actions shown at the end of the header, such as the editor's menu. */
  menu?: ReactNode;
};

function GadgetCardContent({ gadgetRef, menu }: Props): ReactNode {
  const definition = GADGET_REGISTRY[gadgetRef.gadgetType];
  const summary = definition.useGadgetSummary(gadgetRef, { withFacts: true });
  const titleId = useId();
  // A group rather than a section, so a feed of cards is not a landmark each.
  return (
    <div
      role="group"
      aria-labelledby={titleId}
      aria-busy={summary.status === "loading" ? true : undefined}
      className={classes.card}
    >
      <GadgetCardHeader
        definition={definition}
        summary={summary}
        titleId={titleId}
        menu={menu}
      />
      <GadgetCardBody summary={summary} />
    </div>
  );
}

/**
 * A gadget embedded in rich text as a framed card: a header band with the
 * gadget's icon, name, type, and an Open link, over a body of key facts.
 * Shows skeletons while the gadget loads and an explanation when the reader
 * cannot open it. Use it wherever a gadget embed node is drawn, such as a
 * comment being written or read.
 */
export function GadgetCard({ gadgetRef, menu }: Props): ReactNode {
  // Each type calls different hooks, so a type change in place remounts.
  return (
    <GadgetCardContent
      key={gadgetRef.gadgetType}
      gadgetRef={gadgetRef}
      menu={menu}
    />
  );
}
