import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";

type ModelType = "ChatModelOption";

export type ChatModelLicenseTier = "open" | "proprietary";

export type ChatModelOptionId = UUID<ModelType>;

/** A chat-capable model returned from OpenRouter via our edge function. */
export type ChatModelOptionRead = Model.Base<
  ModelType,
  {
    id: string;
    name: string;
    nameWithoutProvider: string;
    description?: string;
    supportsTools: boolean;
    licenseTier: ChatModelLicenseTier;
    provider: string;
  }
>;

export type ChatModelOptionGroup = {
  group: string;
  models: ChatModelOptionRead[];
};

export type ChatModelOptionModel = {
  Read: ChatModelOptionRead;
};
