import { matchLiteral } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel";
import { useCallback } from "react";

/** Returns translated display copy for an offline chat model. */
export function useLocalChatModelCopy(): (
  model: LocalChatModel.T,
) => LocalChatModel.Copy {
  const { t } = useLingui();

  return useCallback(
    (model: LocalChatModel.T): LocalChatModel.Copy => {
      const systemRequirements = t`${model.minRamGb} GB RAM`;
      return matchLiteral(model.id, {
        "llama-1b": {
          displayName: t`Llama 3.2 1B (offline)`,
          pickerName: t`Llama 3.2 1B`,
          description: t`Smallest offline chat model. Weaker on complex SQL but fast to download.`,
          systemRequirements,
          recommendedIf: t`Recommended if you have 4 GB RAM or need the lightest download.`,
        },
        "qwen-1.5b": {
          displayName: t`Qwen 2.5 1.5B (offline)`,
          pickerName: t`Qwen 2.5 1.5B`,
          description: t`Balanced offline model for everyday SQL questions on typical laptops.`,
          systemRequirements,
          recommendedIf: t`Recommended if you have about 8 GB RAM (default for most users).`,
        },
        "qwen-3b": {
          displayName: t`Qwen 2.5 3B (offline)`,
          pickerName: t`Qwen 2.5 3B`,
          description: t`Stronger reasoning than 1.5B with a moderate download. Good step up from the 8 GB tier.`,
          systemRequirements,
          recommendedIf: t`Recommended if you have 12 GB RAM and want noticeably better SQL answers offline.`,
        },
        "phi-3.5-mini": {
          displayName: t`Phi 3.5 Mini (offline)`,
          pickerName: t`Phi 3.5 Mini`,
          description: t`Microsoft's compact instruct model. Solid structure and instruction following for dashboards.`,
          systemRequirements,
          recommendedIf: t`Recommended if you have 16 GB RAM and run Avandar alongside other apps.`,
        },
        "qwen-7b": {
          displayName: t`Qwen 2.5 7B (offline)`,
          pickerName: t`Qwen 2.5 7B`,
          description: t`High-quality 7B instruct model. Best for difficult schemas and complex SQL offline.`,
          systemRequirements,
          recommendedIf: t`Recommended if you have 24 GB RAM and want near-cloud quality fully on device.`,
        },
        "llama-8b": {
          displayName: t`Llama 3.1 8B (offline)`,
          pickerName: t`Llama 3.1 8B`,
          description: t`Largest catalog option. Maximum offline capability when RAM and download size are not constraints.`,
          systemRequirements,
          recommendedIf: t`Recommended if you have 32 GB RAM and a powerful machine used mainly for analytics work.`,
        },
      });
    },
    [t],
  );
}
