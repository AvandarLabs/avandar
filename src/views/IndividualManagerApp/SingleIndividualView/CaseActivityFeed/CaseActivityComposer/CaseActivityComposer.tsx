import { useLingui } from "@lingui/react/macro";
import { Group, Text } from "@mantine/core";
import { IconWifiOff } from "@tabler/icons-react";
import { useMemo } from "react";
import { RICH_TEXT_SCHEMA_VERSION } from "$/models/RichTextDocument/RichTextDocument";
import { ActivityEventClient } from "@/clients/activity/ActivityEventClient";
import { CommentClient } from "@/clients/comments/CommentClient";
import { RichTextComposer } from "@/components/RichText/RichTextComposer/RichTextComposer";
import { useIsOnline } from "@/lib/hooks/browser/useIsOnline/useIsOnline";
import { notifyError } from "@/utils/notifications/notify";
import {
  clearCaseActivityDraft,
  loadCaseActivityDraft,
  saveCaseActivityDraft,
} from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityComposer/caseActivityDraftStorage";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { RichTextDocument } from "$/models/RichTextDocument/RichTextDocument";
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
  const initialDraft = useMemo(() => {
    return loadCaseActivityDraft(workspaceId, individualId);
  }, [workspaceId, individualId]);
  const [insertComment, isPosting] = CommentClient.useInsert({
    queriesToInvalidate: [[ActivityEventClient.getClientName()]],
  });

  const postComment = (
    document: RichTextDocument.T,
    plainText: string,
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      insertComment(
        {
          data: {
            body: document,
            bodySchemaVersion: RICH_TEXT_SCHEMA_VERSION,
            bodyText: plainText,
            individualId,
            workspaceId,
          },
        },
        {
          onSuccess: () => {
            clearCaseActivityDraft(workspaceId, individualId);
            resolve(true);
          },
          onError: () => {
            notifyError(
              t`Your update was not posted. It is still in the box, so you can try again.`,
            );
            resolve(false);
          },
        },
      );
    });
  };

  return (
    <RichTextComposer
      key={`${workspaceId}:${individualId}`}
      label={t`Write an update`}
      placeholder={t`Write an update. Type @ to mention a teammate.`}
      initialContent={initialDraft}
      mentionCandidates={mentionCandidates}
      submitLabel={t`Post`}
      isSubmitting={isPosting}
      isSubmitBlocked={!isOnline}
      notice={
        isOnline ? null : (
          <Group gap="xs" px="sm" py={6} bg="neutral.1" wrap="nowrap">
            <IconWifiOff size={14} aria-hidden />
            <Text size="xs" role="status">
              {t`You're offline. Your draft is saved on this device and you can post when you reconnect.`}
            </Text>
          </Group>
        )
      }
      onChange={(document) => {
        saveCaseActivityDraft(workspaceId, individualId, document);
      }}
      onSubmit={postComment}
    />
  );
}
