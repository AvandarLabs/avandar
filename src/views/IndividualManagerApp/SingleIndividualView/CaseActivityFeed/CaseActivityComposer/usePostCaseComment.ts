import { useLingui } from "@lingui/react/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RICH_TEXT_SCHEMA_VERSION } from "$/models/RichTextDocument/RichTextDocument";
import { CommentClient } from "@/clients/comments/CommentClient";
import { notifyError } from "@/utils/notifications/notify";
import { buildCaseActivityFeedQueryKey } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/useCaseActivityFeed";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { RichTextDocument } from "$/models/RichTextDocument/RichTextDocument";
import type { Workspace } from "$/models/Workspace/Workspace";

type PostCaseComment = {
  /** Resolves `true` once posted; on failure says so and resolves `false`. */
  postComment: (
    document: RichTextDocument.T,
    plainText: string,
  ) => Promise<boolean>;
  isPosting: boolean;
};

/** Posts a comment to a case and refreshes only that case's feed. */
export function usePostCaseComment(options: {
  workspaceId: Workspace.Id;
  individualId: Individual.Id;
}): PostCaseComment {
  const { workspaceId, individualId } = options;
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (variables: { body: RichTextDocument.T; bodyText: string }) => {
      return CommentClient.insert({
        data: {
          ...variables,
          bodySchemaVersion: RICH_TEXT_SCHEMA_VERSION,
          individualId,
          workspaceId,
        },
      });
    },
    onSettled: () => {
      return queryClient.invalidateQueries({
        queryKey: buildCaseActivityFeedQueryKey(individualId),
      });
    },
  });

  return {
    postComment: async (document, plainText) => {
      try {
        await mutateAsync({ body: document, bodyText: plainText });
        return true;
      } catch {
        notifyError(
          t`Your update was not posted. It is still in the box, so you can try again.`,
        );
        return false;
      }
    },
    isPosting: isPending,
  };
}
