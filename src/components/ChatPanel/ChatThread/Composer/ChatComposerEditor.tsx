import { Trans, useLingui } from "@lingui/react/macro";
import { ActionIcon, Text } from "@mantine/core";
import { IconArrowUp } from "@tabler/icons-react";
import { EditorContent, useEditorState } from "@tiptap/react";
import { MAX_DESCRIBED_MENTIONS } from "$/agent/mentions/AgentGadgetContext";
import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
import { serializeChatComposerDocument } from "@/components/ChatPanel/ChatThread/Composer/serializeChatComposerDocument";
import { useChatComposerEditor } from "@/components/ChatPanel/ChatThread/Composer/useChatComposerEditor";
import css from "./Composer.module.css";
import type { Editor } from "@tiptap/core";
import type { MutableRefObject, ReactNode } from "react";

type Props = {
  placeholder: string;
  disabled: boolean;

  /** Set to the editing area, for the panel's autofocus. */
  inputRef: MutableRefObject<HTMLElement | null>;

  /** Controls drawn at the start of the actions row, before send. */
  actions?: ReactNode;
};

/** What the editor's content means for sending, read on each transaction. */
function _selectComposerSummary({ editor }: { editor: Editor }): {
  hasText: boolean;
  mentionCount: number;
} {
  const text = serializeChatComposerDocument(editor.getJSON());
  return {
    hasText: text.trim() !== "",
    mentionCount: ChatMentionToken.refsFromText(text).length,
  };
}

/**
 * The chat composer with the data agent on: an editor where `@` inserts a
 * dashboard, chart, dataset, map, or case type as a chip, then the actions
 * row with the send button. Enter sends the message, with each chip as a
 * ref token; Shift+Enter adds a line. Nothing sends while a turn runs,
 * while the input is off, or while the `@` menu is open.
 */
export function ChatComposerEditor(props: Props): ReactNode {
  const { t } = useLingui();
  const { editor, isRunning, submit } = useChatComposerEditor(props);
  const { hasText, mentionCount } = useEditorState({
    editor,
    selector: _selectComposerSummary,
  });

  return (
    <>
      <EditorContent editor={editor} className={css.composerEditorFrame} />
      {mentionCount > MAX_DESCRIBED_MENTIONS ? (
        <Text size="xs" c="dimmed" className={css.composerNote}>
          <Trans>
            Only the first {MAX_DESCRIBED_MENTIONS} mentions are described to
            the assistant.
          </Trans>
        </Text>
      ) : null}
      <div className={css.composerActions}>
        {props.actions}
        <ActionIcon
          variant="filled"
          color="primary"
          size="md"
          aria-label={t`Send message`}
          disabled={props.disabled || isRunning || !hasText}
          className={css.composerSend}
          onClick={submit}
        >
          <IconArrowUp size={16} stroke={2.25} />
        </ActionIcon>
      </div>
    </>
  );
}
