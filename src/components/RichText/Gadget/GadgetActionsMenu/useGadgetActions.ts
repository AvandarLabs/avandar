import { useLingui } from "@lingui/react/macro";
import {
  IconArrowUpRight,
  IconCards,
  IconCopy,
  IconLink,
} from "@tabler/icons-react";
import { useRouter } from "@tanstack/react-router";
import { GADGET_REGISTRY } from "@/components/RichText/Gadget/gadgetRegistry/gadgetRegistry";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { Icon } from "@tabler/icons-react";
import type { Editor } from "@tiptap/core";

/** How a gadget node is drawn in the editor. */
export type GadgetDisplay = "link" | "embed";

/** One action in a gadget node's editor menu. */
export type GadgetAction = {
  id: "open" | "switchDisplay" | "copyLink";
  label: string;
  Icon: Icon;
  onSelect: () => void;
};

type Options = {
  gadgetRef: Gadget.Ref;
  display: GadgetDisplay;
  editor: Editor;

  /** The node's position in the document, as a node view reports it. */
  getPos: () => number | undefined;
};

/** Copies an address and reports whether it worked. */
function _copyAddress(
  address: string,
  messages: { copied: string; failed: string },
): void {
  try {
    navigator.clipboard.writeText(address).then(
      () => {
        notifySuccess(messages.copied);
      },
      () => {
        notifyError(messages.failed);
      },
    );
  } catch {
    // Without a secure context the browser has no clipboard at all.
    notifyError(messages.failed);
  }
}

function useSwitchDisplayAction({
  display,
  editor,
  getPos,
}: Omit<Options, "gadgetRef">): GadgetAction {
  const { t } = useLingui();
  const isLink = display === "link";
  return {
    id: "switchDisplay",
    label: isLink ? t`Show as embed` : t`Show as link`,
    Icon: isLink ? IconCards : IconLink,
    onSelect: () => {
      const position = getPos();
      if (!editor.isEditable || position === undefined) {
        return;
      }
      // Focus first, so the switched node is selected in a focused editor.
      const chain = editor.chain().focus();
      if (isLink) {
        chain.showGadgetAsEmbed(position).run();
      } else {
        chain.showGadgetAsLink(position).run();
      }
    },
  };
}

/**
 * The actions a gadget node offers in the editor: open the gadget in a new
 * tab, switch between link and embed, and copy a link to it. Opening and
 * copying are left out until the reader can open the gadget. Every action
 * does nothing once the editor is read-only.
 */
export function useGadgetActions(options: Options): readonly GadgetAction[] {
  const { i18n, t } = useLingui();
  const router = useRouter();
  const { editor } = options;
  const definition = GADGET_REGISTRY[options.gadgetRef.gadgetType];
  const summary = definition.useGadgetSummary(options.gadgetRef, {
    withFacts: false,
  });
  const switchDisplayAction = useSwitchDisplayAction(options);
  if (summary.status !== "available") {
    return [switchDisplayAction];
  }
  const { link } = summary;
  const messages = {
    copied: t`Link copied`,
    failed: t`The link could not be copied.`,
  };
  return [
    {
      id: "open",
      label: i18n._(definition.openLabel),
      Icon: IconArrowUpRight,
      onSelect: () => {
        // A new tab, so the draft or edit in this editor is never lost.
        if (editor.isEditable) {
          window.open(router.buildLocation(link).href, "_blank", "noopener");
        }
      },
    },
    switchDisplayAction,
    {
      id: "copyLink",
      label: t`Copy link`,
      Icon: IconCopy,
      onSelect: () => {
        if (editor.isEditable) {
          const { href } = router.buildLocation(link);
          _copyAddress(`${window.location.origin}${href}`, messages);
        }
      },
    },
  ];
}
