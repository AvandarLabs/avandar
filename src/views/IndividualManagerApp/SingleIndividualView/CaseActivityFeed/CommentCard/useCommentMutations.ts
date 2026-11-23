import { useLingui } from "@lingui/react/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RICH_TEXT_SCHEMA_VERSION } from "$/models/RichTextDocument/RichTextDocument";
import { CommentClient } from "@/clients/comments/CommentClient";
import { notifyError } from "@/utils/notifications/notify";
import { buildCaseActivityFeedQueryKey } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/useCaseActivityFeed";
import type { Comment } from "$/models/comments/Comment/Comment";
import type { RichTextDocument } from "$/models/RichTextDocument/RichTextDocument";

type CommentMutations = {
  /** Resolves `true` once the edit is saved. */
  saveEdit: (body: RichTextDocument.T, plainText: string) => Promise<boolean>;
  /** Resolves `true` once the comment is deleted. */
  deleteComment: () => Promise<boolean>;
  isSaving: boolean;
};

/** Edits and deletes one comment, then refreshes only its case's feed. */
export function useCommentMutations(comment: Comment.T): CommentMutations {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (data: Comment.T<"Update">) => {
      return CommentClient.update({ id: comment.id, data });
    },
    onSettled: () => {
      return queryClient.invalidateQueries({
        queryKey: buildCaseActivityFeedQueryKey(comment.individualId),
      });
    },
  });

  const runUpdate = async (
    data: Comment.T<"Update">,
    errorMessage: string,
  ): Promise<boolean> => {
    try {
      await mutateAsync(data);
      return true;
    } catch {
      notifyError(errorMessage);
      return false;
    }
  };

  return {
    saveEdit: (body, plainText) => {
      return runUpdate(
        {
          body,
          bodyText: plainText,
          bodySchemaVersion: RICH_TEXT_SCHEMA_VERSION,
        },
        t`Your changes could not be saved. Try again.`,
      );
    },
    deleteComment: () => {
      return runUpdate(
        { deletedAt: new Date().toISOString() },
        t`The comment could not be deleted. Try again.`,
      );
    },
    isSaving: isPending,
  };
}
