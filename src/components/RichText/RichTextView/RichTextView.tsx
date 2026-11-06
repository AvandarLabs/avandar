import { useLingui } from "@lingui/react/macro";
import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import { useMemo } from "react";
import {
  isRichTextDocument,
  richTextToPlainText,
} from "$/models/RichTextDocument/RichTextDocument";
import { createRichTextExtensions } from "@/components/RichText/createRichTextExtensions";
import { useRichTextMembers } from "@/components/RichText/RichTextMembersContext";
import classes from "@/components/RichText/RichTextView/RichTextView.module.css";
import { UserMentionChip } from "@/components/RichText/UserMention/UserMentionChip";
import type { RichTextDocument } from "$/models/RichTextDocument/RichTextDocument";
import type { ReactNode } from "react";

const VIEW_EXTENSIONS = createRichTextExtensions();

/**
 * Renders a stored document without an editor, so a feed of many comments
 * costs no editor instances. A document with a node this build does not
 * know is shown as plain text instead of failing.
 */
export function RichTextView({
  document,
}: {
  document: RichTextDocument.T;
}): ReactNode {
  const { t } = useLingui();
  const { getMemberName } = useRichTextMembers();
  const formerMemberName = t`Former member`;

  const content = useMemo(() => {
    if (!isRichTextDocument(document)) {
      const plainText = richTextToPlainText(document, {
        getMentionLabel: (userId) => {
          return getMemberName(userId) ?? formerMemberName;
        },
      });
      return <p className={classes.plainText}>{plainText}</p>;
    }
    return renderToReactElement({
      extensions: VIEW_EXTENSIONS,
      content: document,
      options: {
        nodeMapping: {
          userMention: ({ node }) => {
            return <UserMentionChip userId={String(node.attrs.id ?? "")} />;
          },
        },
      },
    });
  }, [document, formerMemberName, getMemberName]);

  return <div className={classes.root}>{content}</div>;
}
