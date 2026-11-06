import { useLingui } from "@lingui/react/macro";
import { Button, Group, Text } from "@mantine/core";
import { RichTextEditor } from "@mantine/tiptap";
import { IconAt } from "@tabler/icons-react";
import { Extension } from "@tiptap/core";
import { useEditor } from "@tiptap/react";
import { useMemo, useRef, useState } from "react";
import {
  RICH_TEXT_MAX_TEXT_LENGTH,
  richTextToPlainText,
} from "$/models/RichTextDocument/RichTextDocument";
import { createRichTextExtensions } from "@/components/RichText/createRichTextExtensions";
import classes from "@/components/RichText/RichTextComposer/RichTextComposer.module.css";
import { RichTextMembersContext } from "@/components/RichText/RichTextMembersContext";
import { createUserMentionSuggestion } from "@/components/RichText/UserMention/createUserMentionSuggestion";
import type { RichTextDocument } from "$/models/RichTextDocument/RichTextDocument";
import type { MentionCandidate } from "@/components/RichText/UserMention/filterMentionCandidates";
import type { ReactNode } from "react";

/** Show the character counter once the text is this close to the limit. */
const COUNTER_THRESHOLD = RICH_TEXT_MAX_TEXT_LENGTH - 1000;

type Props = {
  /** Accessible name of the editing area. */
  label: string;
  placeholder: string;
  initialContent?: RichTextDocument.T;
  mentionCandidates: readonly MentionCandidate[];
  submitLabel: ReactNode;
  isSubmitting: boolean;
  /** Blocks submitting while keeping the text editable, for example offline. */
  isSubmitBlocked?: boolean;
  /** Content above the editing area, such as an offline notice. */
  notice?: ReactNode;
  /** Resolves `true` when the document was saved, which clears the editor. */
  onSubmit: (
    document: RichTextDocument.T,
    plainText: string,
  ) => Promise<boolean>;
  onChange?: (document: RichTextDocument.T) => void;
  onCancel?: () => void;
};

/**
 * The rich text editor used to write and edit comments: markdown shortcuts,
 * markdown paste, `@` mentions of workspace members, and Mod-Enter to
 * submit.
 */
export function RichTextComposer({
  label,
  placeholder,
  initialContent,
  mentionCandidates,
  submitLabel,
  isSubmitting,
  isSubmitBlocked = false,
  notice,
  onSubmit,
  onChange,
  onCancel,
}: Props): ReactNode {
  const { t } = useLingui();
  const candidatesRef = useRef(mentionCandidates);
  candidatesRef.current = mentionCandidates;
  const submitRef = useRef<() => void>(() => {});
  const [plainTextLength, setPlainTextLength] = useState(0);
  const [isEmpty, setIsEmpty] = useState(initialContent === undefined);

  const membersLookup = useMemo(() => {
    const namesById = new Map(
      mentionCandidates.map((candidate) => {
        return [candidate.userId, candidate.displayName];
      }),
    );
    return {
      getMemberName: (userId: string) => {
        return namesById.get(userId);
      },
    };
  }, [mentionCandidates]);

  const editor = useEditor({
    extensions: [
      ...createRichTextExtensions({
        placeholder,
        mentionSuggestion: createUserMentionSuggestion(() => {
          return candidatesRef.current;
        }),
      }),
      Extension.create({
        name: "submitShortcut",
        addKeyboardShortcuts: () => {
          return {
            "Mod-Enter": () => {
              submitRef.current();
              return true;
            },
          };
        },
      }),
    ],
    content: initialContent ?? "",
    editorProps: {
      attributes: {
        "aria-label": label,
        "aria-multiline": "true",
        role: "textbox",
      },
    },
    onCreate: ({ editor: createdEditor }) => {
      setIsEmpty(createdEditor.isEmpty);
      setPlainTextLength(createdEditor.getText().length);
    },
    onUpdate: ({ editor: updatedEditor }) => {
      setIsEmpty(updatedEditor.isEmpty);
      setPlainTextLength(updatedEditor.getText().length);
      onChange?.(updatedEditor.getJSON() as RichTextDocument.T);
    },
  });

  const isOverLimit = plainTextLength > RICH_TEXT_MAX_TEXT_LENGTH;
  const isSubmitDisabled =
    isEmpty || isOverLimit || isSubmitBlocked || isSubmitting;

  submitRef.current = () => {
    if (!editor || isSubmitDisabled) {
      return;
    }
    const document = editor.getJSON() as RichTextDocument.T;
    const plainText = richTextToPlainText(document, {
      getMentionLabel: membersLookup.getMemberName,
    });
    void onSubmit(document, plainText).then((didSave) => {
      if (didSave) {
        editor.commands.clearContent(true);
      }
    });
  };

  return (
    <RichTextMembersContext.Provider value={membersLookup}>
      <RichTextEditor editor={editor} className={classes.editor}>
        {notice}
        <RichTextEditor.Content className={classes.content} />
        <div className={classes.footer}>
          <RichTextEditor.Toolbar className={classes.toolbar}>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Bold />
              <RichTextEditor.Italic />
              <RichTextEditor.BulletList />
              <RichTextEditor.OrderedList />
              <RichTextEditor.Link />
              <RichTextEditor.Code />
              <RichTextEditor.Blockquote />
            </RichTextEditor.ControlsGroup>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Control
                aria-label={t`Mention a teammate`}
                title={t`Mention a teammate`}
                onClick={() => {
                  editor?.chain().focus().insertContent("@").run();
                }}
              >
                <IconAt size={16} stroke={1.75} />
              </RichTextEditor.Control>
            </RichTextEditor.ControlsGroup>
          </RichTextEditor.Toolbar>
          {plainTextLength >= COUNTER_THRESHOLD ? (
            <Text
              size="xs"
              c={isOverLimit ? "danger" : "dimmed"}
              className={classes.counter}
            >
              {t`${plainTextLength} of ${RICH_TEXT_MAX_TEXT_LENGTH} characters`}
            </Text>
          ) : null}
          <Group
            gap="xs"
            ml={plainTextLength >= COUNTER_THRESHOLD ? 0 : "auto"}
          >
            {onCancel ? (
              <Button variant="default" size="compact-sm" onClick={onCancel}>
                {t`Cancel`}
              </Button>
            ) : null}
            <Button
              size="compact-sm"
              loading={isSubmitting}
              disabled={isSubmitDisabled}
              onClick={() => {
                submitRef.current();
              }}
            >
              {submitLabel}
            </Button>
          </Group>
        </div>
      </RichTextEditor>
    </RichTextMembersContext.Provider>
  );
}
