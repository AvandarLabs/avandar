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

function _toListProps(
  props: SuggestionProps<MentionCandidate>,
): UserMentionListProps {
  return {
    items: props.items,
    clientRect: props.clientRect,
    command: (attributes) => {
      props.command(attributes);
    },
  };
}

/**
 * Suggestion options for `@` mentions. `getCandidates` is read on every
 * keystroke, so the list follows the latest workspace members.
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

      const destroy = () => {
        renderer?.element.remove();
        renderer?.destroy();
        renderer = undefined;
      };

      return {
        onStart: (props: SuggestionProps<MentionCandidate>) => {
          renderer = new ReactRenderer(UserMentionList, {
            props: _toListProps(props),
            editor: props.editor,
          });
          document.body.appendChild(renderer.element);
        },
        onUpdate: (props: SuggestionProps<MentionCandidate>) => {
          renderer?.updateProps(_toListProps(props));
        },
        onKeyDown: ({ event }: { event: KeyboardEvent }) => {
          if (event.key === "Escape") {
            destroy();
            return true;
          }
          return renderer?.ref?.onKeyDown(event) ?? false;
        },
        onExit: destroy,
      };
    },
  };
}
