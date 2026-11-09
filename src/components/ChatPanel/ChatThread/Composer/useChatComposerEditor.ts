import { useAui, useThread } from "@assistant-ui/react";
import { useLingui } from "@lingui/react/macro";
import { useEditor } from "@tiptap/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createChatComposerExtensions } from "@/components/ChatPanel/ChatThread/Composer/createChatComposerExtensions";
import { serializeChatComposerDocument } from "@/components/ChatPanel/ChatThread/Composer/serializeChatComposerDocument";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import css from "./Composer.module.css";
import type { Editor } from "@tiptap/core";
import type { MutableRefObject } from "react";

type Options = {
  placeholder: string;
  disabled: boolean;
  inputRef: MutableRefObject<HTMLElement | null>;
};

type ChatComposerEditorState = {
  editor: Editor;
  isRunning: boolean;
  /** Sends the message unless a turn runs, input is off, or it is blank. */
  submit: () => void;
};

/**
 * Keeps the built editor in step with its props: editable while enabled,
 * redrawing the placeholder when it changes, and handing its editing area
 * to `inputRef` for the panel's autofocus.
 */
function useSyncEditor(editor: Editor, options: Options): void {
  const { disabled, placeholder, inputRef } = options;
  useEffect(
    function syncEditable() {
      editor.setEditable(!disabled, false);
    },
    [editor, disabled],
  );
  useEffect(
    function redrawPlaceholder() {
      // The placeholder is read through a getter, so an empty transaction
      // is enough to redraw it.
      if (!editor.isDestroyed) {
        editor.view.dispatch(editor.state.tr.setMeta("addToHistory", false));
      }
    },
    [editor, placeholder],
  );
  useEffect(
    function exposeEditingArea() {
      inputRef.current = editor.view.dom;
      return () => {
        inputRef.current = null;
      };
    },
    [editor, inputRef],
  );
}

/**
 * The chat composer's TipTap editor and its send action. The extensions are
 * built once and read the latest placeholder, workspace, and send action
 * through refs, because `useEditor` reconfigures the editor whenever an
 * option changes identity. Sending appends a user message to the thread,
 * with each chip as a ref token, and clears the editor.
 */
export function useChatComposerEditor(
  options: Options,
): ChatComposerEditorState {
  const aui = useAui();
  const isRunning = useThread((thread) => {
    return thread.isRunning;
  });
  const workspace = useCurrentWorkspace();
  const { t } = useLingui();
  const latestRef = useRef({ options, isRunning, workspaceId: workspace.id });
  latestRef.current = { options, isRunning, workspaceId: workspace.id };
  const submitRef = useRef(() => {});
  const [extensions] = useState(() => {
    return createChatComposerExtensions({
      getPlaceholder: () => {
        return latestRef.current.options.placeholder;
      },
      getWorkspaceId: () => {
        return latestRef.current.workspaceId;
      },
      onSubmit: () => {
        submitRef.current();
      },
    });
  });
  const editorProps = useMemo(() => {
    return {
      attributes: {
        "aria-label": t`Message`,
        "aria-multiline": "true",
        role: "textbox",
        class: css.composerEditor ?? "",
      },
    };
  }, [t]);
  const editor = useEditor({
    extensions,
    editable: !options.disabled,
    editorProps,
  });

  submitRef.current = () => {
    const latest = latestRef.current;
    if (latest.isRunning || latest.options.disabled) {
      return;
    }
    const text = serializeChatComposerDocument(editor.getJSON()).trim();
    if (text === "") {
      return;
    }
    aui.thread().append({ role: "user", content: [{ type: "text", text }] });
    editor.commands.clearContent(true);
  };

  useSyncEditor(editor, options);
  return {
    editor,
    isRunning,
    submit: () => {
      submitRef.current();
    },
  };
}
