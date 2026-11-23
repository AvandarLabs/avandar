import { useLingui } from "@lingui/react/macro";
import { useState } from "react";
import { isRichTextDocument } from "$/models/RichTextDocument/RichTextDocument";
import { notifyError } from "@/utils/notifications/notify";
import { useCommentMutations } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentCard/useCommentMutations";
import type { Comment } from "$/models/comments/Comment/Comment";
import type { RichTextDocument } from "$/models/RichTextDocument/RichTextDocument";
import type { RefObject } from "react";

type CommentEditing = {
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSaveEdit: (body: RichTextDocument.T, plainText: string) => Promise<boolean>;
  onCancelEdit: () => void;
};

/**
 * Edit and delete handlers for a comment card. Focus moves to the card
 * after a delete, a saved edit, or a cancelled one, so it never falls back
 * to the page.
 */
export function useCommentEditing(
  comment: Comment.T,
  cardRef: RefObject<HTMLElement | null>,
): CommentEditing {
  const { t } = useLingui();
  const [isEditing, setIsEditing] = useState(false);
  const { saveEdit, deleteComment, isSaving } = useCommentMutations(comment);
  const focusCard = () => {
    cardRef.current?.focus();
  };

  return {
    isEditing,
    isSaving,
    onEdit: () => {
      if (!isRichTextDocument(comment.body)) {
        notifyError(
          t`This comment has content this version of Avandar cannot edit.`,
        );
        return;
      }
      setIsEditing(true);
    },
    onDelete: () => {
      focusCard();
      void deleteComment().then(focusCard);
    },
    onSaveEdit: async (body, plainText) => {
      const didSave = await saveEdit(body, plainText);
      if (didSave) {
        focusCard();
        setIsEditing(false);
      }
      return didSave;
    },
    onCancelEdit: () => {
      focusCard();
      setIsEditing(false);
    },
  };
}
