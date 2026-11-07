import { Trans, useLingui } from "@lingui/react/macro";
import { Combobox, Kbd } from "@mantine/core";
import { IconLock } from "@tabler/icons-react";
import { GADGET_REGISTRY } from "@/components/RichText/Gadget/gadgetRegistry/gadgetRegistry";
import classes from "@/components/RichText/MentionMenu/MentionMenuList/MentionMenuList.module.css";
import type { GadgetSearchResult } from "@/clients/gadgets/searchGadgets/searchGadgets";
import type { ReactNode } from "react";

type Props = {
  /** The highlighted gadget row's search result. */
  result: GadgetSearchResult;
};

/**
 * The foot of `MentionMenuList` while a gadget row is highlighted: a warning
 * when only some people can open that gadget, which never blocks inserting
 * it, and the keys that insert it as a link or as an embed.
 */
export function MentionMenuFooter({ result }: Props): ReactNode {
  const { i18n } = useLingui();
  const { limitedAudienceHint } = GADGET_REGISTRY[result.ref.gadgetType];
  return (
    <Combobox.Footer className={classes.footer}>
      {result.hasLimitedAudience ? (
        <div className={classes.hint}>
          <IconLock
            size={14}
            stroke={1.75}
            className={classes.hintIcon}
            aria-hidden
          />
          <span>{i18n._(limitedAudienceHint)}</span>
        </div>
      ) : null}
      <div className={classes.keys}>
        <span>
          <Trans>
            <Kbd size="xs">Enter</Kbd> link
          </Trans>
        </span>
        <span>
          <Trans>
            <Kbd size="xs">Shift</Kbd> <Kbd size="xs">Enter</Kbd> embed
          </Trans>
        </span>
      </div>
    </Combobox.Footer>
  );
}
