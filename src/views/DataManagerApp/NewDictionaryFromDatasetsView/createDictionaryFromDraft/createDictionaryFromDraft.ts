import { Model } from "@avandar/models";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import { DataDictionaryClient } from "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * Creates a dictionary learned from datasets: the dictionary row, with the
 * datasets it was learned from, then its entries and code lists through the
 * save RPC. These are two writes, so when the second fails the new, empty
 * dictionary is removed again and the error is thrown on, which leaves the
 * user's work in the create flow to retry.
 */
export async function createDictionaryFromDraft(
  options: Readonly<{
    workspaceId: Workspace.Id;
    owner: Readonly<Pick<UserProfile.T, "userId" | "profileId">>;
    name: string;
    description: string;
    datasetIds: readonly Dataset.Id[];
    draft: DataDictionary.Draft;
  }>,
): Promise<DataDictionary.T> {
  const dictionary = await DataDictionaryClient.insert({
    data: Model.make("DataDictionary", {
      workspaceId: options.workspaceId,
      ownerId: options.owner.userId,
      ownerProfileId: options.owner.profileId,
      name: options.name,
      description: options.description || undefined,
      createdFromDatasetIds: [...options.datasetIds],
    }),
  });
  try {
    await DataDictionaryClient.saveContents(
      DataDictionary.buildSavePayload({
        dictionaryId: dictionary.id,
        draft: options.draft,
      }),
    );
  } catch (error) {
    await DataDictionaryClient.delete({ id: dictionary.id }).catch(() => {
      // The save error below is the one worth showing.
      return undefined;
    });
    throw error;
  }
  return dictionary;
}
