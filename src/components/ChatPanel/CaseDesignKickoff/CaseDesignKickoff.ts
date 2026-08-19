/**
 * Hidden first user turn that starts a Case Manager design session so the
 * assistant can speak first. The visible transcript should not include this.
 */
export const CaseDesignKickoff = {
  CONTENT: "[Begin case type design]",
  metadata: {
    custom: {
      isCaseDesignKickoff: true,
    },
  } as const,

  isInternal: (
    messageMetadata: Readonly<{ custom?: Record<string, unknown> }> | undefined,
  ): boolean => {
    return messageMetadata?.custom?.isCaseDesignKickoff === true;
  },

  isKickoffContent: (content: string): boolean => {
    return content === CaseDesignKickoff.CONTENT;
  },
};
