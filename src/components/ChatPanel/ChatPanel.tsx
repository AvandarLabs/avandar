import { ActionIcon } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { Tooltip } from "@ui";
import css from "@/components/ChatPanel/ChatPanel.module.css";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager";

/**
 * The right-side chat panel ("Ask Avandar") rendered inside the AppShell's
 * Aside slot. This is the PR 1 placeholder: it lays out the chrome (header,
 * scrollable body) so we can verify the Aside collapse/expand behavior
 * end-to-end. Thread, composer, and LLM wiring land in PR 2 and PR 3.
 */
export function ChatPanel(): JSX.Element {
  const dispatch = ChatPanelStateManager.useDispatch();

  return (
    <div className={css.root}>
      <div className={css.header}>
        <span className={css.title}>Ask Avandar</span>
        <Tooltip label="Close panel">
          <ActionIcon
            variant="subtle"
            size="sm"
            color="neutral"
            onClick={dispatch.close}
            aria-label="Close chat panel"
          >
            <IconX size={16} />
          </ActionIcon>
        </Tooltip>
      </div>
      <div className={css.body}>
        <p className={css.placeholder}>
          Chat is coming online. Soon you&apos;ll be able to ask questions
          about your data here and see the results land on the canvas.
        </p>
      </div>
    </div>
  );
}
