import { useLingui } from "@lingui/react/macro";
import { CloseButton } from "@mantine/core";
import { useRef } from "react";
import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { ChatContextPicker } from "@/components/ChatPanel/ChatThread/ChatContextTray/ChatContextPicker";
import { GadgetChip } from "@/components/RichText/Gadget/GadgetChip/GadgetChip";
import { GADGET_REGISTRY } from "@/components/RichText/Gadget/gadgetRegistry/gadgetRegistry";
import css from "./ChatContextTray.module.css";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { ReactNode } from "react";

type RemoveButtonProps = {
  gadgetRef: Gadget.Ref;
  onRemove: (ref: Gadget.Ref) => void;
};

function ChatContextTrayRemoveButtonContent({
  gadgetRef,
  onRemove,
}: RemoveButtonProps): ReactNode {
  const { t } = useLingui();
  const summary = GADGET_REGISTRY[gadgetRef.gadgetType].useGadgetSummary(
    gadgetRef,
    { withFacts: false },
  );
  const name = summary.status === "available" ? summary.name : undefined;
  return (
    <CloseButton
      size="xs"
      aria-label={
        name === undefined
          ? t`Remove from context`
          : t`Remove ${name} from context`
      }
      onClick={() => {
        onRemove(gadgetRef);
      }}
    />
  );
}

/** Removes one gadget from the tray, named after the gadget it removes. */
function ChatContextTrayRemoveButton(props: RemoveButtonProps): ReactNode {
  // Each type calls different hooks, so a type change in place remounts.
  return (
    <ChatContextTrayRemoveButtonContent
      key={props.gadgetRef.gadgetType}
      {...props}
    />
  );
}

/**
 * The gadgets attached to this chat, at the top of the message box, each
 * with a remove button, and the "Add context" picker. The agent reads them
 * on every turn until they are removed. Removing one moves focus to "Add
 * context", so the keyboard never lands on the removed button.
 */
export function ChatContextTray(): ReactNode {
  const { contextTray } = ChatPanelStateManager.useState();
  const dispatch = ChatPanelStateManager.useDispatch();
  const { t } = useLingui();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const removeFromTray = (ref: Gadget.Ref): void => {
    dispatch.removeFromContextTray(ref);
    triggerRef.current?.focus();
  };

  return (
    <div className={css.tray}>
      {contextTray.length > 0 ? (
        <ul className={css.trayList} aria-label={t`Attached to this chat`}>
          {contextTray.map((ref) => {
            return (
              <li
                key={ChatMentionToken.buildRefKey(ref)}
                className={css.trayItem}
              >
                <GadgetChip gadgetRef={ref} />
                <ChatContextTrayRemoveButton
                  gadgetRef={ref}
                  onRemove={removeFromTray}
                />
              </li>
            );
          })}
        </ul>
      ) : null}
      <ChatContextPicker triggerRef={triggerRef} />
    </div>
  );
}
