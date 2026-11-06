import { useLingui } from "@lingui/react/macro";
import { Button, Group, Text } from "@mantine/core";
import { RichTextEditor } from "@mantine/tiptap";
import { IconAt } from "@tabler/icons-react";
import { Extension } from "@tiptap/core";
import { useEditor, useEditorState } from "@tiptap/react";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  isRichTextDocument,
  RICH_TEXT_MAX_TEXT_LENGTH,
  richTextToPlainText,
} from "$/models/RichTextDocument/RichTextDocument";
import { createRichTextExtensions } from "@/components/RichText/createRichTextExtensions";
import classes from "@/components/RichText/RichTextComposer/RichTextComposer.module.css";
import { RichTextMembersContext } from "@/components/RichText/RichTextMembersContext";
import { createUserMentionSuggestion } from "@/components/RichText/UserMention/createUserMentionSuggestion";
import type { RichTextDocument } from "$/models/RichTextDocument/RichTextDocument";
import type { MentionCandidate } from "@/components/RichText/UserMention/filterMentionCandidates";
import type { RichTextEditorLabels } from "@mantine/tiptap";
import type { Editor } from "@tiptap/core";
import type { ReactNode } from "react";

/** Show the character counter once the text is this close to the limit. */
const COUNTER_THRESHOLD = RICH_TEXT_MAX_TEXT_LENGTH - 1000;

type MembersLookup = {
  getMemberName: (userId: string) => string | undefined;
};

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
  /**
   * Resolves `true` when the document was saved, which clears the editor.
   * Resolving `false` or rejecting keeps the text so it can be retried.
   */
  onSubmit: (
    document: RichTextDocument.T,
    plainText: string,
  ) => Promise<boolean>;
  onChange?: (document: RichTextDocument.T) => void;
  onCancel?: () => void;
};

/** Translated names for the toolbar controls and the link editor. */
function useEditorLabels(): Partial<RichTextEditorLabels> {
  const { t } = useLingui();
  return useMemo(() => {
    return {
      boldControlLabel: t`Bold`,
      italicControlLabel: t`Italic`,
      bulletListControlLabel: t`Bullet list`,
      orderedListControlLabel: t`Numbered list`,
      linkControlLabel: t`Link`,
      codeControlLabel: t`Code`,
      blockquoteControlLabel: t`Quote`,
      linkEditorInputLabel: t`Link address`,
      linkEditorInputPlaceholder: t`https://example.org`,
      linkEditorExternalLink: t`Open link in a new tab`,
      linkEditorInternalLink: t`Open link in the same tab`,
      linkEditorSave: t`Save`,
    };
  }, [t]);
}

/** The editor's plain text length, counted the way the stored text is. */
function _getPlainTextLength(
  editor: Editor,
  membersLookup: MembersLookup,
): number {
  return richTextToPlainText(editor.getJSON() as RichTextDocument.T, {
    getMentionLabel: membersLookup.getMemberName,
  }).length;
}

/**
 * The rich text editor used to write and edit comments: markdown shortcuts,
 * markdown paste, `@` mentions of workspace members, and Mod-Enter to
 * submit. While a submit is in flight the text is read-only, so nothing
 * typed during the save is lost when it clears.
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
  const labels = useEditorLabels();
  const candidatesRef = useRef(mentionCandidates);
  candidatesRef.current = mentionCandidates;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const submitRef = useRef<() => void>(() => {});
  const isSavingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasDisallowedLink, setHasDisallowedLink] = useState(false);

  const membersLookup = useMemo((): MembersLookup => {
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

  // Built once: `useEditor` calls `setOptions` whenever an option changes
  // identity, so a fresh array or object per render would do it per
  // keystroke.
  const [extensions] = useState(() => {
    return [
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
    ];
  });
  const [content] = useState(() => {
    return initialContent ?? "";
  });
  const editorProps = useMemo(() => {
    return {
      attributes: {
        "aria-label": label,
        "aria-multiline": "true",
        role: "textbox",
      },
    };
  }, [label]);

  const editor = useEditor({
    extensions,
    content,
    editorProps,
    onUpdate: ({ editor: updatedEditor }) => {
      setHasDisallowedLink(false);
      onChangeRef.current?.(updatedEditor.getJSON() as RichTextDocument.T);
    },
  });

  // Stable so the selector, and the document walk inside it, only runs on
  // editor transactions or a change of members, not on every render.
  const selectEditorSummary = useCallback(
    ({ editor: currentEditor }: { editor: Editor }) => {
      return {
        isEmpty: currentEditor.isEmpty,
        plainTextLength: _getPlainTextLength(currentEditor, membersLookup),
      };
    },
    [membersLookup],
  );
  const { isEmpty, plainTextLength } = useEditorState({
    editor,
    selector: selectEditorSummary,
  });

  const isOverLimit = plainTextLength > RICH_TEXT_MAX_TEXT_LENGTH;
  const isSubmitDisabled =
    isEmpty || isOverLimit || isSubmitBlocked || isSubmitting || isSaving;

  submitRef.current = () => {
    if (isSavingRef.current || isSubmitDisabled) {
      return;
    }
    const document = editor.getJSON() as RichTextDocument.T;
    // The editor only makes documents the schema accepts, except for a
    // link whose href slipped past the link extension's check.
    if (!isRichTextDocument(document)) {
      setHasDisallowedLink(true);
      return;
    }
    const plainText = richTextToPlainText(document, {
      getMentionLabel: membersLookup.getMemberName,
    });
    isSavingRef.current = true;
    setIsSaving(true);
    editor.setEditable(false, false);
    void Promise.resolve()
      .then(() => {
        return onSubmit(document, plainText);
      })
      .catch(() => {
        return false;
      })
      .then((didSave) => {
        isSavingRef.current = false;
        setIsSaving(false);
        if (editor.isDestroyed) {
          return;
        }
        editor.setEditable(true, false);
        if (didSave) {
          editor.commands.clearContent(true);
        }
      });
  };

  return (
    <RichTextMembersContext.Provider value={membersLookup}>
      <RichTextEditor
        editor={editor}
        className={classes.editor}
        labels={labels}
      >
        {notice}
        <RichTextEditor.Content className={classes.content} />
        {hasDisallowedLink ? (
          <Text size="xs" c="danger" role="alert" className={classes.error}>
            {t`Some links in this update are not allowed. Use web or email links.`}
          </Text>
        ) : null}
        <div className={classes.footer}>
          <RichTextEditor.Toolbar className={classes.toolbar}>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Bold disabled={isSaving} />
              <RichTextEditor.Italic disabled={isSaving} />
              <RichTextEditor.BulletList disabled={isSaving} />
              <RichTextEditor.OrderedList disabled={isSaving} />
              <RichTextEditor.Link disabled={isSaving} />
              <RichTextEditor.Code disabled={isSaving} />
              <RichTextEditor.Blockquote disabled={isSaving} />
            </RichTextEditor.ControlsGroup>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Control
                disabled={isSaving}
                aria-label={t`Mention a teammate`}
                title={t`Mention a teammate`}
                onClick={() => {
                  editor.chain().focus().insertContent("@").run();
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
              loading={isSubmitting || isSaving}
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
