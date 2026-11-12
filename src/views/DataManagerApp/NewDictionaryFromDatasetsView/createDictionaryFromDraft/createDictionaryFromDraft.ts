import { Model } from "@avandar/models";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import { DataDictionaryClient } from "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * Thrown when saving a new dictionary's contents failed and the empty
 * dictionary could not be removed again. `useCreateDictionary` reads
 * `dictionaryName` to tell the user which dictionary to delete themselves.
 */
export class DictionaryLeftBehindError extends Error {
  readonly dictionaryName: string;

  constructor(dictionaryName: string, options: { cause: unknown }) {
    super(`The empty dictionary ${dictionaryName} was left behind`, options);
    this.name = "DictionaryLeftBehindError";
    this.dictionaryName = dictionaryName;
  }
}

/**
 * Removes a dictionary and confirms it is gone: a delete that matches no row
 * reports no error, for example when row access refuses it, so the row is
 * read back. Resolves true when the dictionary is gone.
 */
async function _deleteAndConfirm(
  dictionaryId: DataDictionary.Id,
): Promise<boolean> {
  try {
    await DataDictionaryClient.delete({ id: dictionaryId });
    const remaining = await DataDictionaryClient.getById({ id: dictionaryId });
    return remaining === undefined;
  } catch {
    return false;
  }
}

/**
 * Creates a dictionary learned from datasets: the dictionary row, with the
 * datasets it was learned from, then its entries and code lists through the
 * save RPC. These are two writes, so when the second fails the new, empty
 * dictionary is removed again and the error is thrown on, which leaves the
 * user's work in the create flow to retry. When the removal fails too, a
 * `DictionaryLeftBehindError` is thrown instead, naming the empty dictionary.
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
    const isRemoved = await _deleteAndConfirm(dictionary.id);
    if (!isRemoved) {
      throw new DictionaryLeftBehindError(dictionary.name, { cause: error });
    }
    throw error;
  }
  return dictionary;
}
