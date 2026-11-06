import { ReactRenderer } from "@tiptap/react";
import { filterMentionCandidates } from "@/components/RichText/UserMention/filterMentionCandidates";
import { UserMentionList } from "@/components/RichText/UserMention/UserMentionList";
import type { MentionCandidate } from "@/components/RichText/UserMention/filterMentionCandidates";
import type {
  UserMentionListHandle,
  UserMentionListProps,
} from "@/components/RichText/UserMention/UserMentionList";
import type { MentionOptions } from "@tiptap/extension-mention";
import type { SuggestionProps } from "@tiptap/suggestion";

/** Attributes that tie the editing area to the open list for screen readers. */
const COMBOBOX_ARIA_ATTRIBUTES = [
  "aria-activedescendant",
  "aria-autocomplete",
  "aria-controls",
  "aria-expanded",
] as const;

function _toListProps(
  props: SuggestionProps<MentionCandidate>,
): UserMentionListProps {
  const editingArea = props.editor.view.dom;
  return {
    items: props.items,
    clientRect: props.clientRect,
    command: (attributes) => {
      props.command(attributes);
    },
    onHighlightChange: ({ listboxId, activeOptionId }) => {
      editingArea.setAttribute("aria-controls", listboxId);
      if (activeOptionId) {
        editingArea.setAttribute("aria-activedescendant", activeOptionId);
      } else {
        editingArea.removeAttribute("aria-activedescendant");
      }
    },
  };
}

/**
 * Suggestion options for `@` mentions. `getCandidates` is read on every
 * keystroke, so the list follows the latest workspace members. While the
 * list is open, the editing area carries the ARIA combobox attributes that
 * point at it and at the highlighted member.
 */
export function createUserMentionSuggestion(
  getCandidates: () => readonly MentionCandidate[],
): MentionOptions["suggestion"] {
  return {
    char: "@",
    items: ({ query }) => {
      return filterMentionCandidates(getCandidates(), query);
    },
    render: () => {
      let renderer:
        | ReactRenderer<UserMentionListHandle, UserMentionListProps>
        | undefined;

      return {
        onStart: (props: SuggestionProps<MentionCandidate>) => {
          const editingArea = props.editor.view.dom;
          editingArea.setAttribute("aria-expanded", "true");
          editingArea.setAttribute("aria-autocomplete", "list");
          renderer = new ReactRenderer(UserMentionList, {
            props: _toListProps(props),
            editor: props.editor,
          });
          document.body.appendChild(renderer.element);
        },
        onUpdate: (props: SuggestionProps<MentionCandidate>) => {
          renderer?.updateProps(_toListProps(props));
        },
        // The suggestion plugin closes the list on Escape itself, by
        // calling `onExit`, so only list navigation is forwarded here.
        onKeyDown: ({ event }: { event: KeyboardEvent }) => {
          return renderer?.ref?.onKeyDown(event) ?? false;
        },
        onExit: (props: SuggestionProps<MentionCandidate>) => {
          COMBOBOX_ARIA_ATTRIBUTES.forEach((attribute) => {
            props.editor.view.dom.removeAttribute(attribute);
          });
          renderer?.element.remove();
          renderer?.destroy();
          renderer = undefined;
        },
      };
    },
  };
}
