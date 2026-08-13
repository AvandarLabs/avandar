import type { Model } from "@avandar/models";

type ModelType = "ChatModelOption";

export type ChatModelLicenseTier = "open" | "proprietary";

/** A chat-capable cloud model from our hardcoded catalog. */
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
