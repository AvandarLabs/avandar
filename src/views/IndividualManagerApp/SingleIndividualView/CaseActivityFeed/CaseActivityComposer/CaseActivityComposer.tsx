import { useLingui } from "@lingui/react/macro";
import { RichTextComposer } from "@/components/RichText/RichTextComposer/RichTextComposer";
import { useIsOnline } from "@/lib/hooks/browser/useIsOnline/useIsOnline";
import { OfflineNotice } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityComposer/OfflineNotice";
import { useCaseActivityDraft } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityComposer/useCaseActivityDraft";
import { usePostCaseComment } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityComposer/usePostCaseComment";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { MentionCandidate } from "@/components/RichText/UserMention/filterMentionCandidates";
import type { ReactNode } from "react";

type Props = {
  workspaceId: Workspace.Id;
  individualId: Individual.Id;
  mentionCandidates: readonly MentionCandidate[];
};

/**
 * The composer docked under a case's feed. Keeps a per-case draft on this
 * device, and while offline keeps the text editable but blocks posting.
 */
export function CaseActivityComposer({
  workspaceId,
  individualId,
  mentionCandidates,
}: Props): ReactNode {
  const { t } = useLingui();
  const isOnline = useIsOnline();
  const draft = useCaseActivityDraft(workspaceId, individualId);
  const { postComment, isPosting } = usePostCaseComment({
    workspaceId,
    individualId,
  });

  return (
    <RichTextComposer
      key={`${workspaceId}:${individualId}`}
      label={t`Write an update`}
      placeholder={t`Write an update. Type @ to mention a teammate or link a dashboard, dataset, or case.`}
      initialContent={draft.initialDraft}
      mentionCandidates={mentionCandidates}
      workspaceId={workspaceId}
      submitLabel={t`Post`}
      isSubmitting={isPosting}
      isSubmitBlocked={!isOnline}
      notice={<OfflineNotice isOnline={isOnline} />}
      onChange={draft.saveDraft}
      onSubmit={async (document, plainText) => {
        const didPost = await postComment(document, plainText);
        if (didPost) {
          draft.clearPostedDraft(document);
        }
        return didPost;
      }}
    />
  );
}
